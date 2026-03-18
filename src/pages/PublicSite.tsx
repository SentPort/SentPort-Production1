import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PageContent, BuilderTheme, BuilderComponent, Subdomain, SubdomainPage } from '../types/builder';
import { Loader2 } from 'lucide-react';
import { trackSubdomainVisit, generateSessionId } from '../lib/subdomainAnalytics';

export default function PublicSite() {
  const { subdomain, pagePath } = useParams<{ subdomain: string; pagePath?: string }>();
  const [loading, setLoading] = useState(true);
  const [pageContent, setPageContent] = useState<PageContent | null>(null);
  const [theme, setTheme] = useState<BuilderTheme | null>(null);
  const [pageData, setPageData] = useState<SubdomainPage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPublicSite();
  }, [subdomain, pagePath]);

  async function loadPublicSite() {
    try {
      setLoading(true);

      const { data: subdomainData, error: subdomainError } = await supabase
        .from('subdomains')
        .select('*')
        .eq('subdomain', subdomain)
        .eq('status', 'active')
        .maybeSingle();

      if (subdomainError) throw subdomainError;
      if (!subdomainData) {
        setError('Subdomain not found');
        return;
      }

      const targetPath = pagePath ? `/${pagePath}` : '/';

      const { data: pageDataResult, error: pageError } = await supabase
        .from('subdomain_pages')
        .select('*')
        .eq('subdomain_id', subdomainData.id)
        .eq('page_path', targetPath)
        .eq('is_published', true)
        .maybeSingle();

      if (pageError) throw pageError;
      if (!pageDataResult) {
        setError('Page not found or not published');
        return;
      }

      setPageData(pageDataResult);

      const { data: contentData, error: contentError } = await supabase
        .from('website_builder_page_content')
        .select('*')
        .eq('page_id', pageDataResult.id)
        .eq('version', 'published')
        .maybeSingle();

      if (contentError) throw contentError;
      if (!contentData) {
        setError('Page content not found');
        return;
      }

      setPageContent(contentData);

      const { data: themeData, error: themeError } = await supabase
        .from('website_builder_themes')
        .select('*')
        .eq('subdomain_id', subdomainData.id)
        .maybeSingle();

      if (themeError) throw themeError;
      setTheme(themeData);

      await trackSubdomainVisit({
        subdomainId: subdomainData.id,
        pageId: pageDataResult.id,
        pagePath: targetPath,
        sessionId: generateSessionId(),
      });

    } catch (err: any) {
      console.error('Error loading public site:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !pageContent || !theme) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">🌐</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {error === 'Subdomain not found' ? 'Subdomain Not Found' : 'Page Not Found'}
          </h2>
          <p className="text-gray-700 mb-6">
            {error === 'Subdomain not found'
              ? 'This subdomain does not exist or has been deleted.'
              : 'This page has not been published yet or does not exist.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: theme.font_family_body }}>
      {pageContent.seo_title && (
        <title>{pageContent.seo_title}</title>
      )}
      {pageContent.seo_description && (
        <meta name="description" content={pageContent.seo_description} />
      )}
      {pageContent.seo_keywords && (
        <meta name="keywords" content={pageContent.seo_keywords} />
      )}

      <style dangerouslySetInnerHTML={{ __html: theme.custom_css }} />
      {pageContent.custom_head_code && (
        <div dangerouslySetInnerHTML={{ __html: pageContent.custom_head_code }} />
      )}

      <div>
        {pageContent.components.map((component: BuilderComponent) => (
          <PublicComponent key={component.id} component={component} theme={theme} />
        ))}
      </div>
    </div>
  );
}

function PublicComponent({
  component,
  theme,
}: {
  component: BuilderComponent;
  theme: BuilderTheme;
}) {
  const styles = component.styles || {};
  const props = component.props || {};

  switch (component.type) {
    case 'section':
      return (
        <section style={styles}>
          {component.children?.map(child => (
            <PublicComponent key={child.id} component={child} theme={theme} />
          ))}
        </section>
      );

    case 'container':
      return (
        <div style={styles}>
          {component.children?.map(child => (
            <PublicComponent key={child.id} component={child} theme={theme} />
          ))}
        </div>
      );

    case 'columns':
      const columnCount = props.columns || 2;
      return (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
            ...styles,
          }}
        >
          {component.children?.map(child => (
            <PublicComponent key={child.id} component={child} theme={theme} />
          ))}
        </div>
      );

    case 'grid':
      const gridColumns = props.columns || 3;
      return (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
            ...styles,
          }}
        >
          {component.children?.map(child => (
            <PublicComponent key={child.id} component={child} theme={theme} />
          ))}
        </div>
      );

    case 'heading':
      const HeadingTag = `h${props.level || 1}` as keyof JSX.IntrinsicElements;
      return (
        <HeadingTag
          style={{
            fontFamily: theme.font_family_heading,
            ...styles,
          }}
        >
          {props.text || ''}
        </HeadingTag>
      );

    case 'text':
      return <div style={styles} dangerouslySetInnerHTML={{ __html: props.content || '' }} />;

    case 'image':
      return <img src={props.src} alt={props.alt || 'Image'} style={styles} />;

    case 'video':
      return <video src={props.src} controls style={styles} />;

    case 'button':
      return (
        <a href={props.url || '#'} style={styles} className="inline-block text-center">
          {props.text || 'Button'}
        </a>
      );

    case 'spacer':
      return <div style={{ height: props.height || '2rem' }} />;

    case 'navbar':
      return (
        <nav style={styles} className="flex items-center justify-between">
          <div className="font-bold text-xl">{props.brand || ''}</div>
          <div className="flex gap-4">
            {(props.links || []).map((link: any, idx: number) => (
              <a key={idx} href={link.url} className="hover:underline">
                {link.text}
              </a>
            ))}
          </div>
        </nav>
      );

    case 'footer':
      return <footer style={styles}>{props.content || ''}</footer>;

    case 'form':
      return (
        <form style={styles} className="space-y-4">
          {(props.fields || []).map((field: any, idx: number) => (
            <div key={idx}>
              <label className="block text-sm font-medium mb-1">
                {field.label}
                {field.required && <span className="text-red-500">*</span>}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  placeholder={field.placeholder}
                  required={field.required}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows={4}
                />
              ) : (
                <input
                  type={field.type}
                  placeholder={field.placeholder}
                  required={field.required}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              )}
            </div>
          ))}
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {props.submitText || 'Submit'}
          </button>
        </form>
      );

    case 'input':
      return (
        <div style={styles}>
          <label className="block text-sm font-medium mb-1">{props.label || ''}</label>
          <input
            type={props.inputType || 'text'}
            placeholder={props.placeholder}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      );

    case 'custom_code':
      return (
        <div style={styles}>
          <style>{props.css || ''}</style>
          <div dangerouslySetInnerHTML={{ __html: props.html || '' }} />
        </div>
      );

    default:
      return null;
  }
}
