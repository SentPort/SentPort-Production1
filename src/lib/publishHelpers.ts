import { supabase } from './supabase';

export interface PublishResult {
  success: boolean;
  message: string;
  error?: string;
}

export async function getHomepageForSubdomain(subdomainId: string) {
  const { data, error } = await supabase
    .from('subdomain_pages')
    .select('*')
    .eq('subdomain_id', subdomainId)
    .eq('is_homepage', true)
    .maybeSingle();

  if (error) {
    console.error('Error fetching homepage:', error);
    return null;
  }

  return data;
}

export async function canPublishSecondaryPage(subdomainId: string): Promise<boolean> {
  const homepage = await getHomepageForSubdomain(subdomainId);
  return homepage?.is_published === true;
}

export async function publishHomepage(
  subdomainId: string,
  pageId: string
): Promise<PublishResult> {
  try {
    const { error: pageUpdateError } = await supabase
      .from('subdomain_pages')
      .update({
        is_published: true,
        has_unpublished_changes: false,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', pageId)
      .eq('subdomain_id', subdomainId)
      .eq('is_homepage', true);

    if (pageUpdateError) throw pageUpdateError;

    const { data: subdomainData } = await supabase
      .from('subdomains')
      .select('status')
      .eq('id', subdomainId)
      .single();

    if (subdomainData?.status === 'inactive') {
      await supabase
        .from('subdomains')
        .update({
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', subdomainId);
    }

    await supabase
      .from('subdomain_publish_events')
      .insert({
        subdomain_id: subdomainId,
        page_id: pageId,
        event_type: 'homepage_published',
        metadata: { page_type: 'homepage' },
      });

    return {
      success: true,
      message: 'Homepage published successfully',
    };
  } catch (error: any) {
    console.error('Error publishing homepage:', error);
    return {
      success: false,
      message: 'Failed to publish homepage',
      error: error.message,
    };
  }
}

export async function publishAllPages(subdomainId: string): Promise<PublishResult> {
  try {
    const { data: pages, error: pagesError } = await supabase
      .from('subdomain_pages')
      .select('id, is_homepage, page_title')
      .eq('subdomain_id', subdomainId)
      .order('is_homepage', { ascending: false });

    if (pagesError) throw pagesError;

    if (!pages || pages.length === 0) {
      return {
        success: false,
        message: 'No pages found to publish',
      };
    }

    for (const page of pages) {
      const { error: updateError } = await supabase
        .from('subdomain_pages')
        .update({
          is_published: true,
          has_unpublished_changes: false,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', page.id);

      if (updateError) {
        console.error(`Error publishing page ${page.id}:`, updateError);
      }

      await supabase
        .from('subdomain_publish_events')
        .insert({
          subdomain_id: subdomainId,
          page_id: page.id,
          event_type: page.is_homepage ? 'homepage_published' : 'page_published',
          metadata: { page_title: page.page_title },
        });
    }

    const { data: subdomainData } = await supabase
      .from('subdomains')
      .select('status')
      .eq('id', subdomainId)
      .single();

    if (subdomainData?.status === 'inactive') {
      await supabase
        .from('subdomains')
        .update({
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', subdomainId);
    }

    return {
      success: true,
      message: `Successfully published ${pages.length} page${pages.length > 1 ? 's' : ''}`,
    };
  } catch (error: any) {
    console.error('Error publishing all pages:', error);
    return {
      success: false,
      message: 'Failed to publish all pages',
      error: error.message,
    };
  }
}

export async function publishSecondaryPage(
  subdomainId: string,
  pageId: string
): Promise<PublishResult> {
  try {
    const canPublish = await canPublishSecondaryPage(subdomainId);

    if (!canPublish) {
      return {
        success: false,
        message: 'Cannot publish secondary page: Homepage must be published first',
      };
    }

    const { error: pageUpdateError } = await supabase
      .from('subdomain_pages')
      .update({
        is_published: true,
        has_unpublished_changes: false,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', pageId)
      .eq('subdomain_id', subdomainId);

    if (pageUpdateError) throw pageUpdateError;

    await supabase
      .from('subdomain_publish_events')
      .insert({
        subdomain_id: subdomainId,
        page_id: pageId,
        event_type: 'page_published',
        metadata: {},
      });

    return {
      success: true,
      message: 'Page published successfully',
    };
  } catch (error: any) {
    console.error('Error publishing secondary page:', error);
    return {
      success: false,
      message: 'Failed to publish page',
      error: error.message,
    };
  }
}

export async function unpublishHomepage(
  subdomainId: string,
  pageId: string
): Promise<PublishResult> {
  try {
    const { error: pageUpdateError } = await supabase
      .from('subdomain_pages')
      .update({
        is_published: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pageId)
      .eq('subdomain_id', subdomainId)
      .eq('is_homepage', true);

    if (pageUpdateError) throw pageUpdateError;

    await supabase
      .from('subdomain_publish_events')
      .insert({
        subdomain_id: subdomainId,
        page_id: pageId,
        event_type: 'homepage_unpublished',
        metadata: { cascade: true },
      });

    return {
      success: true,
      message: 'Homepage and all secondary pages unpublished successfully',
    };
  } catch (error: any) {
    console.error('Error unpublishing homepage:', error);
    return {
      success: false,
      message: 'Failed to unpublish homepage',
      error: error.message,
    };
  }
}

export async function unpublishSecondaryPage(
  subdomainId: string,
  pageId: string
): Promise<PublishResult> {
  try {
    const { error: pageUpdateError } = await supabase
      .from('subdomain_pages')
      .update({
        is_published: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pageId)
      .eq('subdomain_id', subdomainId);

    if (pageUpdateError) throw pageUpdateError;

    await supabase
      .from('subdomain_publish_events')
      .insert({
        subdomain_id: subdomainId,
        page_id: pageId,
        event_type: 'page_unpublished',
        metadata: {},
      });

    return {
      success: true,
      message: 'Page unpublished successfully',
    };
  } catch (error: any) {
    console.error('Error unpublishing page:', error);
    return {
      success: false,
      message: 'Failed to unpublish page',
      error: error.message,
    };
  }
}

export async function publishPageEdits(
  subdomainId: string,
  pageId: string
): Promise<PublishResult> {
  try {
    const { error: pageUpdateError } = await supabase
      .from('subdomain_pages')
      .update({
        has_unpublished_changes: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pageId)
      .eq('subdomain_id', subdomainId);

    if (pageUpdateError) throw pageUpdateError;

    await supabase
      .from('subdomain_publish_events')
      .insert({
        subdomain_id: subdomainId,
        page_id: pageId,
        event_type: 'page_edit_published',
        metadata: {},
      });

    return {
      success: true,
      message: 'Page edits published successfully',
    };
  } catch (error: any) {
    console.error('Error publishing page edits:', error);
    return {
      success: false,
      message: 'Failed to publish edits',
      error: error.message,
    };
  }
}
