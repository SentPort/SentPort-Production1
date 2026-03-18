import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Subdomain, SubdomainPage, PageContent, BuilderTheme } from '../../types/builder';
import BuilderLayout from '../../components/builder/BuilderLayout';
import { Loader2 } from 'lucide-react';

export default function WebsiteBuilder() {
  const { subdomainId, pageId } = useParams<{ subdomainId: string; pageId?: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subdomain, setSubdomain] = useState<Subdomain | null>(null);
  const [pages, setPages] = useState<SubdomainPage[]>([]);
  const [currentPage, setCurrentPage] = useState<SubdomainPage | null>(null);
  const [pageContent, setPageContent] = useState<PageContent | null>(null);
  const [theme, setTheme] = useState<BuilderTheme | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBuilderData();
  }, [subdomainId, pageId]);

  async function loadBuilderData() {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/signin');
        return;
      }

      const { data: subdomainData, error: subdomainError } = await supabase
        .from('subdomains')
        .select('*')
        .eq('id', subdomainId)
        .eq('owner_id', user.id)
        .maybeSingle();

      if (subdomainError) throw subdomainError;
      if (!subdomainData) {
        setError('Subdomain not found or you do not have access to it.');
        return;
      }

      setSubdomain(subdomainData);

      const { data: pagesData, error: pagesError } = await supabase
        .from('subdomain_pages')
        .select('*')
        .eq('subdomain_id', subdomainId)
        .order('created_at', { ascending: true });

      if (pagesError) throw pagesError;

      if (!pagesData || pagesData.length === 0) {
        await createDefaultHomepage();
        return;
      }

      setPages(pagesData);

      let targetPageId = pageId;
      if (!targetPageId) {
        const homepage = pagesData.find(p => p.is_homepage);
        targetPageId = homepage?.id || pagesData[0].id;
      }

      const targetPage = pagesData.find(p => p.id === targetPageId);
      if (targetPage) {
        setCurrentPage(targetPage);
        await loadPageContent(targetPage.id);
      }

      const { data: themeData, error: themeError } = await supabase
        .from('website_builder_themes')
        .select('*')
        .eq('subdomain_id', subdomainId)
        .maybeSingle();

      if (themeError) throw themeError;
      setTheme(themeData);

    } catch (err: any) {
      console.error('Error loading builder data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function createDefaultHomepage() {
    try {
      const { data: newPage, error: pageError } = await supabase
        .from('subdomain_pages')
        .insert({
          subdomain_id: subdomainId,
          page_path: '/',
          page_title: 'Home',
          page_type: 'homepage',
          is_homepage: true,
          is_published: false,
        })
        .select()
        .single();

      if (pageError) throw pageError;

      const { error: contentError } = await supabase
        .from('website_builder_page_content')
        .insert({
          page_id: newPage.id,
          version: 'draft',
          components: [],
        });

      if (contentError) throw contentError;

      await loadBuilderData();
    } catch (err: any) {
      console.error('Error creating homepage:', err);
      setError(err.message);
    }
  }

  async function loadPageContent(pageId: string) {
    try {
      const { data, error } = await supabase
        .from('website_builder_page_content')
        .select('*')
        .eq('page_id', pageId)
        .eq('version', 'draft')
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        const { data: newContent, error: createError } = await supabase
          .from('website_builder_page_content')
          .insert({
            page_id: pageId,
            version: 'draft',
            components: [],
          })
          .select()
          .single();

        if (createError) throw createError;
        setPageContent(newContent);
      } else {
        setPageContent(data);
      }
    } catch (err: any) {
      console.error('Error loading page content:', err);
      setError(err.message);
    }
  }

  async function handleSaveContent(components: any[], autoSave = false) {
    if (!currentPage || !pageContent) return;

    try {
      const { error } = await supabase
        .from('website_builder_page_content')
        .update({
          components,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pageContent.id);

      if (error) throw error;

      setPageContent(prev => prev ? { ...prev, components, updated_at: new Date().toISOString() } : null);

      if (!autoSave) {
        console.log('Content saved successfully');
      }
    } catch (err: any) {
      console.error('Error saving content:', err);
      if (!autoSave) {
        alert('Failed to save changes: ' + err.message);
      }
    }
  }

  async function handlePublish() {
    if (!currentPage || !pageContent) return;

    try {
      const { data: publishedContent, error: publishError } = await supabase
        .from('website_builder_page_content')
        .upsert({
          page_id: currentPage.id,
          version: 'published',
          components: pageContent.components,
          seo_title: pageContent.seo_title,
          seo_description: pageContent.seo_description,
          seo_keywords: pageContent.seo_keywords,
          custom_head_code: pageContent.custom_head_code,
        })
        .select()
        .single();

      if (publishError) throw publishError;

      const { error: pageUpdateError } = await supabase
        .from('subdomain_pages')
        .update({
          is_published: true,
          has_unpublished_changes: false,
          published_at: new Date().toISOString(),
        })
        .eq('id', currentPage.id);

      if (pageUpdateError) throw pageUpdateError;

      const { error: eventError } = await supabase
        .from('subdomain_publish_events')
        .insert({
          subdomain_id: subdomainId,
          page_id: currentPage.id,
          event_type: 'page_published',
          metadata: { page_title: currentPage.page_title },
        });

      if (eventError) throw eventError;

      alert('Page published successfully!');
      await loadBuilderData();
    } catch (err: any) {
      console.error('Error publishing:', err);
      alert('Failed to publish: ' + err.message);
    }
  }

  async function handleCreatePage(pageData: { path: string; title: string; type: string }) {
    try {
      const { data: newPage, error: pageError } = await supabase
        .from('subdomain_pages')
        .insert({
          subdomain_id: subdomainId,
          page_path: pageData.path,
          page_title: pageData.title,
          page_type: pageData.type,
          is_homepage: false,
          is_published: false,
        })
        .select()
        .single();

      if (pageError) throw pageError;

      const { error: contentError } = await supabase
        .from('website_builder_page_content')
        .insert({
          page_id: newPage.id,
          version: 'draft',
          components: [],
        });

      if (contentError) throw contentError;

      await loadBuilderData();
      navigate(`/builder/${subdomainId}/page/${newPage.id}`);
    } catch (err: any) {
      console.error('Error creating page:', err);
      alert('Failed to create page: ' + err.message);
    }
  }

  async function handleSwitchPage(pageId: string) {
    navigate(`/builder/${subdomainId}/page/${pageId}`);
  }

  async function handleDeletePage(pageId: string) {
    try {
      const { error: deleteError } = await supabase
        .from('subdomain_pages')
        .delete()
        .eq('id', pageId);

      if (deleteError) throw deleteError;

      const updatedPages = pages.filter(p => p.id !== pageId);
      setPages(updatedPages);

      if (currentPage?.id === pageId) {
        const homepage = updatedPages.find(p => p.is_homepage);
        const nextPage = homepage || updatedPages[0];

        if (nextPage) {
          navigate(`/builder/${subdomainId}/page/${nextPage.id}`);
        } else {
          await loadBuilderData();
        }
      } else {
        await loadBuilderData();
      }
    } catch (err: any) {
      console.error('Error deleting page:', err);
      alert('Failed to delete page: ' + err.message);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading builder...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={() => navigate('/make-your-own-site')}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!subdomain || !currentPage || !pageContent || !theme) {
    return null;
  }

  return (
    <BuilderLayout
      subdomain={subdomain}
      pages={pages}
      currentPage={currentPage}
      pageContent={pageContent}
      theme={theme}
      onSaveContent={handleSaveContent}
      onPublish={handlePublish}
      onCreatePage={handleCreatePage}
      onSwitchPage={handleSwitchPage}
      onDeletePage={handleDeletePage}
    />
  );
}
