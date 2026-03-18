import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { BuilderSection, BuilderBlock, PageBackgroundSettings } from '../../types/builder';
import { Loader2, X } from 'lucide-react';

interface PageData {
  id: string;
  page_title: string;
  background_image_url?: string;
  background_image_settings?: PageBackgroundSettings;
}

interface AllPagesData {
  [pageId: string]: {
    page_path: string;
    page_title: string;
  };
}

export default function Preview() {
  const { subdomainId, pageId } = useParams<{ subdomainId: string; pageId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [sections, setSections] = useState<BuilderSection[]>([]);
  const [allPages, setAllPages] = useState<AllPagesData>({});
  const [error, setError] = useState<string | null>(null);
  const [currentPageId, setCurrentPageId] = useState<string | undefined>(pageId);
  const [currentDevice, setCurrentDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const deviceParam = params.get('device') as 'desktop' | 'tablet' | 'mobile' | null;

    if (deviceParam && ['desktop', 'tablet', 'mobile'].includes(deviceParam)) {
      setCurrentDevice(deviceParam);
    } else {
      const detectDevice = () => {
        const width = window.innerWidth;
        if (width < 768) {
          setCurrentDevice('mobile');
        } else if (width < 1024) {
          setCurrentDevice('tablet');
        } else {
          setCurrentDevice('desktop');
        }
      };
      detectDevice();
    }
  }, []);

  useEffect(() => {
    loadPreviewData();
  }, [subdomainId, currentPageId, currentDevice]);

  async function loadPreviewData() {
    try {
      setLoading(true);

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
        setError('You do not have access to this subdomain');
        return;
      }

      const { data: pagesData, error: pagesError } = await supabase
        .from('subdomain_pages')
        .select('id, page_path, page_title')
        .eq('subdomain_id', subdomainId);

      if (pagesError) throw pagesError;

      const pagesMap: AllPagesData = {};
      pagesData?.forEach(page => {
        pagesMap[page.id] = {
          page_path: page.page_path,
          page_title: page.page_title,
        };
      });
      setAllPages(pagesMap);

      const { data: pageInfo, error: pageError } = await supabase
        .from('subdomain_pages')
        .select('id, page_title, background_image_url, background_image_settings')
        .eq('id', currentPageId)
        .maybeSingle();

      if (pageError) throw pageError;
      if (!pageInfo) {
        setError('Page not found');
        return;
      }

      setPageData(pageInfo);

      const { data: contentData, error: contentError } = await supabase
        .from('website_builder_page_content')
        .select('id')
        .eq('page_id', currentPageId)
        .eq('version', 'draft')
        .maybeSingle();

      if (contentError && contentError.code !== 'PGRST116') throw contentError;

      if (contentData) {
        await loadSections(contentData.id);
      } else {
        setSections([]);
      }

    } catch (err: any) {
      console.error('Error loading preview:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadSections(contentId: string) {
    try {
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('builder_sections')
        .select('*')
        .eq('page_content_id', contentId)
        .eq('device', currentDevice)
        .order('section_order', { ascending: true });

      if (sectionsError) throw sectionsError;

      const sectionsWithBlocks: BuilderSection[] = [];

      for (const section of sectionsData || []) {
        const { data: blocksData, error: blocksError } = await supabase
          .from('builder_blocks')
          .select('*')
          .eq('section_id', section.id)
          .order('block_order', { ascending: true });

        if (blocksError) throw blocksError;

        sectionsWithBlocks.push({
          ...section,
          blocks: blocksData || [],
        });
      }

      setSections(sectionsWithBlocks);
    } catch (err) {
      console.error('Error loading sections:', err);
    }
  }

  function handleInternalNavigation(pageId: string) {
    setCurrentPageId(pageId);
    window.history.pushState({}, '', `/preview/${subdomainId}/page/${pageId}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (error || !pageData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-6">{error || 'Failed to load preview'}</p>
          <button
            onClick={() => window.close()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const pageBackgroundStyle: React.CSSProperties = {};
  if (pageData.background_image_url) {
    const settings = pageData.background_image_settings;
    pageBackgroundStyle.backgroundImage = `url(${pageData.background_image_url})`;
    pageBackgroundStyle.backgroundSize = settings?.size || 'cover';
    pageBackgroundStyle.backgroundPosition = settings?.position || 'center';
    pageBackgroundStyle.backgroundRepeat = settings?.repeat || 'no-repeat';
    pageBackgroundStyle.backgroundAttachment = settings?.attachment || 'scroll';
  }
  if (pageData.background_image_settings?.overlay_color) {
    pageBackgroundStyle.backgroundColor = pageData.background_image_settings.overlay_color;
  }

  return (
    <div className="min-h-screen bg-white" style={pageBackgroundStyle}>
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200">
          <span className="text-sm font-medium text-gray-700">
            Viewing: {currentDevice.charAt(0).toUpperCase() + currentDevice.slice(1)}
          </span>
        </div>
        <button
          onClick={() => window.close()}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-gray-800 transition-colors"
        >
          <X className="w-4 h-4" />
          Close Preview
        </button>
      </div>

      {sections.length === 0 ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center text-gray-500">
            <p className="text-xl">This {currentDevice} view is empty</p>
            <p className="text-sm mt-2">Add sections and blocks in the builder to see them here</p>
          </div>
        </div>
      ) : (
        <div>
          {sections.map((section) => (
            <PreviewSection
              key={section.id}
              section={section}
              allPages={allPages}
              onNavigate={handleInternalNavigation}
              currentDevice={currentDevice}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface PreviewSectionProps {
  section: BuilderSection;
  allPages: AllPagesData;
  onNavigate: (pageId: string) => void;
  currentDevice: 'desktop' | 'tablet' | 'mobile';
}

function PreviewSection({ section, allPages, onNavigate, currentDevice }: PreviewSectionProps) {
  const getSectionPropertiesForDevice = () => {
    if (currentDevice === 'desktop') {
      return {
        paddingTop: section.padding_top,
        paddingBottom: section.padding_bottom,
        paddingLeft: section.padding_left,
        paddingRight: section.padding_right,
        columns: section.layout_columns || 1,
        maxWidth: section.max_width || 'contained',
        layoutMode: section.layout_mode || 'flow',
      };
    }

    const deviceConfig = currentDevice === 'tablet' ? section.tablet_config : section.mobile_config;
    return {
      paddingTop: deviceConfig?.padding_top ?? section.padding_top,
      paddingBottom: deviceConfig?.padding_bottom ?? section.padding_bottom,
      paddingLeft: deviceConfig?.padding_left ?? section.padding_left,
      paddingRight: deviceConfig?.padding_right ?? section.padding_right,
      columns: deviceConfig?.layout_columns ?? section.layout_columns ?? 1,
      maxWidth: deviceConfig?.max_width ?? section.max_width ?? 'contained',
      layoutMode: deviceConfig?.layout_mode ?? section.layout_mode ?? 'flow',
    };
  };

  const { paddingTop, paddingBottom, paddingLeft, paddingRight, columns, maxWidth, layoutMode } = getSectionPropertiesForDevice();

  const getBackgroundStyles = (): React.CSSProperties => {
    const styles: React.CSSProperties = {};

    if (section.background_type === 'color') {
      styles.backgroundColor = section.background_value?.color || '#ffffff';
    } else if (section.background_type === 'gradient' && section.background_value?.gradient) {
      const { gradient } = section.background_value;
      if (gradient.type === 'linear') {
        const stops = gradient.stops
          .map((s) => `${s.color} ${s.position}%`)
          .join(', ');
        styles.backgroundImage = `linear-gradient(${gradient.angle || 0}deg, ${stops})`;
      } else {
        const stops = gradient.stops
          .map((s) => `${s.color} ${s.position}%`)
          .join(', ');
        styles.backgroundImage = `radial-gradient(circle, ${stops})`;
      }
    } else if (section.background_type === 'image' && section.background_image_url) {
      styles.backgroundImage = `url('${section.background_image_url}')`;
      styles.backgroundPosition = section.background_position;
      styles.backgroundSize = section.background_size;
      styles.backgroundRepeat = section.background_repeat;
      styles.backgroundAttachment = section.background_attachment;
    }

    return styles;
  };

  const sectionStyle: React.CSSProperties = {
    ...getBackgroundStyles(),
    paddingTop,
    paddingBottom,
    paddingLeft,
    paddingRight,
    position: 'relative',
    minHeight: '100px',
  };

  const overlayStyles: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: section.background_overlay_color || 'transparent',
    opacity: section.background_overlay_opacity,
    pointerEvents: 'none',
  };

  const maxWidthValue = maxWidth === 'full' ? '100%' : maxWidth === 'contained' ? '1200px' : maxWidth;

  const containerStyle: React.CSSProperties = {
    maxWidth: maxWidthValue,
    margin: '0 auto',
    position: 'relative',
    zIndex: 1,
    ...(layoutMode === 'flow' ? {
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: '1rem',
    } : {
      minHeight: '400px',
      position: 'relative',
    }),
  };

  return (
    <section style={sectionStyle} className={section.custom_css_classes?.join(' ') || ''}>
      {(section.background_overlay_color && section.background_overlay_opacity > 0) && (
        <div style={overlayStyles} />
      )}
      <div style={containerStyle}>
        {section.blocks?.map((block) => (
          <PreviewBlock
            key={block.id}
            block={block}
            allPages={allPages}
            onNavigate={onNavigate}
            currentDevice={currentDevice}
            sectionLayoutMode={layoutMode}
          />
        ))}
      </div>
    </section>
  );
}

interface PreviewBlockProps {
  block: BuilderBlock;
  allPages: AllPagesData;
  onNavigate: (pageId: string) => void;
  currentDevice: 'desktop' | 'tablet' | 'mobile';
  sectionLayoutMode: 'flow' | 'absolute';
}

function PreviewBlock({ block, allPages, onNavigate, currentDevice, sectionLayoutMode }: PreviewBlockProps) {
  // Helper to get device-specific properties, merging desktop with device overrides
  const getDeviceProperties = () => {
    // Get device-specific overrides first
    let deviceOverrides = {};
    if (currentDevice === 'desktop') {
      deviceOverrides = block.desktop_properties || {};
    } else if (currentDevice === 'tablet') {
      deviceOverrides = block.tablet_properties || {};
    } else {
      deviceOverrides = block.mobile_properties || {};
    }

    // Build base properties from block, allowing device overrides to take precedence
    const baseProps = {
      alignment: block.alignment,
      font_family: block.font_family,
      font_size: block.font_size,
      font_weight: block.font_weight,
      font_style: block.font_style,
      text_decoration: block.text_decoration,
      line_height: block.line_height,
      letter_spacing: block.letter_spacing,
      text_color: block.text_color,
      background_color: block.background_color,
      padding: block.padding,
      margin: block.margin,
      border_radius: block.border_radius,
      border_width: block.border_width,
      border_color: block.border_color,
      border_style: block.border_style,
      shadow: block.shadow,
      width: block.width,
      height: block.height,
      container_width: block.container_width,
      position_x: block.position_x,
      position_y: block.position_y,
      is_absolute: block.is_absolute,
      z_index: block.z_index,
      hover_background_color: block.hover_background_color,
      hover_text_color: block.hover_text_color,
      hover_border_color: block.hover_border_color,
      hover_transform: block.hover_transform,
      hover_shadow: block.hover_shadow,
    };

    // Merge with device overrides taking priority
    return { ...baseProps, ...deviceOverrides };
  };

  const deviceProps = getDeviceProperties();
  // Helper to add 'px' unit to numeric values
  const addUnit = (value: string | number | null | undefined): string | undefined => {
    if (!value) return undefined;
    const strValue = String(value);
    // If it's just a number without units, add 'px'
    if (/^\d+$/.test(strValue)) {
      return `${strValue}px`;
    }
    return strValue;
  };

  // Helper to normalize border properties
  const normalizeBorderWidth = (value: string | number | null | undefined): string | undefined => {
    if (!value) return undefined;
    const strValue = String(value);
    // If it's just a number without units, add 'px'
    if (/^\d+$/.test(strValue)) {
      return `${strValue}px`;
    }
    return strValue;
  };

  // Get border style, defaulting to 'solid' if border width is present
  const getBorderStyle = (): string | undefined => {
    const borderWidth = deviceProps.border_width;
    const borderStyle = deviceProps.border_style;

    // If there's a border width but no style, default to 'solid'
    if (borderWidth && !borderStyle) {
      return 'solid';
    }

    return borderStyle;
  };

  const handleClick = (e: React.MouseEvent) => {
    if (block.block_type === 'button' && block.link_url) {
      e.preventDefault();

      const targetPageId = Object.keys(allPages).find(
        id => allPages[id].page_path === block.link_url
      );

      if (targetPageId) {
        onNavigate(targetPageId);
      } else if (block.link_url.startsWith('http')) {
        window.open(block.link_url, block.link_target || '_self');
      }
    }
  };

  const textContent = block.content?.text || block.content?.value || '';

  // Separate text and container styles using device-specific properties
  const getTextStyles = (): React.CSSProperties => {
    return {
      margin: 0,
      padding: 0,
      textAlign: deviceProps.alignment as any,
      fontFamily: deviceProps.font_family || 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: addUnit(deviceProps.font_size),
      fontWeight: deviceProps.font_weight,
      fontStyle: deviceProps.font_style,
      textDecoration: deviceProps.text_decoration,
      lineHeight: deviceProps.line_height,
      letterSpacing: deviceProps.letter_spacing,
      color: deviceProps.text_color,
      display: 'block',
    };
  };

  const getContainerStyles = (): React.CSSProperties => {
    // Only use absolute positioning if both the block is set to absolute AND the section layout mode is absolute
    const useAbsolutePositioning = deviceProps.is_absolute && sectionLayoutMode === 'absolute';

    const styles: React.CSSProperties = {
      padding: deviceProps.padding,
      margin: deviceProps.margin,
      borderRadius: deviceProps.border_radius,
      borderWidth: normalizeBorderWidth(deviceProps.border_width),
      borderColor: deviceProps.border_color,
      borderStyle: getBorderStyle() as any,
      boxShadow: deviceProps.shadow,
      width: deviceProps.width,
      height: deviceProps.height,
      position: useAbsolutePositioning ? 'absolute' : undefined,
      left: useAbsolutePositioning && deviceProps.position_x ? `${deviceProps.position_x}px` : undefined,
      top: useAbsolutePositioning && deviceProps.position_y ? `${deviceProps.position_y}px` : undefined,
      zIndex: useAbsolutePositioning ? (deviceProps.z_index || undefined) : undefined,
    };

    if (deviceProps.background_color) {
      styles.backgroundColor = deviceProps.background_color;
    }

    return styles;
  };

  // Helper to create wrapper styles for block alignment
  const getBlockWrapperStyles = (): React.CSSProperties => {
    return {
      display: 'flex',
      justifyContent: deviceProps.alignment === 'center' ? 'center' : deviceProps.alignment === 'right' ? 'flex-end' : 'flex-start',
    };
  };

  const textStyles = getTextStyles();
  const containerStyles = getContainerStyles();
  const blockWrapperStyles = getBlockWrapperStyles();

  switch (block.block_type) {
    case 'paragraph':
      return (
        <div style={blockWrapperStyles}>
          <div style={containerStyles}>
            <p style={textStyles}>
              {textContent || 'Paragraph text'}
            </p>
          </div>
        </div>
      );

    case 'heading':
      const headingLevel = block.content?.level || 'h2';
      const HeadingTag = headingLevel as keyof JSX.IntrinsicElements;
      return (
        <div style={blockWrapperStyles}>
          <div style={containerStyles}>
            <HeadingTag style={textStyles}>
              {textContent || 'Heading'}
            </HeadingTag>
          </div>
        </div>
      );

    case 'button':
      const buttonWidth = deviceProps.width || '200px';
      const buttonHeight = deviceProps.height || 'auto';
      const buttonId = `preview-button-${block.id}`;

      const hasHoverEffects = deviceProps.hover_background_color || deviceProps.hover_text_color ||
                              deviceProps.hover_border_color || deviceProps.hover_transform || deviceProps.hover_shadow;

      const buttonContainerStyle: React.CSSProperties = {
        width: buttonWidth,
        height: buttonHeight,
        position: deviceProps.is_absolute ? 'absolute' : 'relative',
        left: deviceProps.is_absolute && deviceProps.position_x ? `${deviceProps.position_x}px` : undefined,
        top: deviceProps.is_absolute && deviceProps.position_y ? `${deviceProps.position_y}px` : undefined,
        zIndex: deviceProps.is_absolute ? (deviceProps.z_index || undefined) : undefined,
      };

      const buttonStyle: React.CSSProperties = {
        margin: 0,
        padding: deviceProps.padding || '12px 24px',
        textAlign: 'center',
        fontFamily: deviceProps.font_family || 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: addUnit(deviceProps.font_size),
        fontWeight: deviceProps.font_weight,
        fontStyle: deviceProps.font_style,
        textDecoration: 'none',
        lineHeight: deviceProps.line_height,
        letterSpacing: deviceProps.letter_spacing,
        color: deviceProps.text_color,
        borderRadius: deviceProps.border_radius,
        borderWidth: normalizeBorderWidth(deviceProps.border_width),
        borderColor: deviceProps.border_color,
        borderStyle: getBorderStyle() as any,
        boxShadow: deviceProps.shadow,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
      };

      if (deviceProps.background_color) {
        buttonStyle.backgroundColor = deviceProps.background_color;
      }

      if (deviceProps.is_absolute) {
        return (
          <>
            {hasHoverEffects && (
              <style>
                {`
                  #${buttonId}:hover {
                    ${deviceProps.hover_background_color ? `background-color: ${deviceProps.hover_background_color} !important;` : ''}
                    ${deviceProps.hover_text_color ? `color: ${deviceProps.hover_text_color} !important;` : ''}
                    ${deviceProps.hover_border_color ? `border-color: ${deviceProps.hover_border_color} !important;` : ''}
                    ${deviceProps.hover_transform ? `transform: ${deviceProps.hover_transform} !important;` : ''}
                    ${deviceProps.hover_shadow ? `box-shadow: ${deviceProps.hover_shadow} !important;` : ''}
                  }
                `}
              </style>
            )}
            <div style={buttonContainerStyle}>
              <a
                id={buttonId}
                href={block.link_url || '#'}
                target={block.link_target}
                onClick={handleClick}
                style={buttonStyle}
              >
                {textContent || 'Button'}
              </a>
            </div>
          </>
        );
      }

      return (
        <div style={blockWrapperStyles}>
          {hasHoverEffects && (
            <style>
              {`
                #${buttonId}:hover {
                  ${deviceProps.hover_background_color ? `background-color: ${deviceProps.hover_background_color} !important;` : ''}
                  ${deviceProps.hover_text_color ? `color: ${deviceProps.hover_text_color} !important;` : ''}
                  ${deviceProps.hover_border_color ? `border-color: ${deviceProps.hover_border_color} !important;` : ''}
                  ${deviceProps.hover_transform ? `transform: ${deviceProps.hover_transform} !important;` : ''}
                  ${deviceProps.hover_shadow ? `box-shadow: ${deviceProps.hover_shadow} !important;` : ''}
                }
              `}
            </style>
          )}
          <div style={buttonContainerStyle}>
            <a
              id={buttonId}
              href={block.link_url || '#'}
              target={block.link_target}
              onClick={handleClick}
              style={buttonStyle}
            >
              {textContent || 'Button'}
            </a>
          </div>
        </div>
      );

    case 'image':
      const imageUrl = block.content?.url || block.content?.src || '';
      const altText = block.content?.alt || '';
      return (
        <div style={containerStyles}>
          {imageUrl && (
            <img
              src={imageUrl}
              alt={altText}
              style={{
                width: deviceProps.width || block.content?.width || '100%',
                height: deviceProps.height || block.content?.height || 'auto',
                objectFit: block.content?.objectFit || 'cover',
              }}
            />
          )}
        </div>
      );

    case 'video':
      const videoUrl = block.content?.url || '';

      if (videoUrl?.includes('youtube.com') || videoUrl?.includes('youtu.be')) {
        let videoId = '';
        if (videoUrl.includes('youtu.be/')) {
          videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
        } else if (videoUrl.includes('watch?v=')) {
          videoId = videoUrl.split('watch?v=')[1].split('&')[0];
        }

        return (
          <div style={containerStyles}>
            <iframe
              width="100%"
              height={deviceProps.height || '400px'}
              src={`https://www.youtube.com/embed/${videoId}`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        );
      }

      return (
        <div style={containerStyles}>
          <video
            src={videoUrl}
            controls
            style={{
              width: '100%',
              height: '100%',
            }}
          />
        </div>
      );

    case 'divider':
      return (
        <div style={containerStyles}>
          <hr
            style={{
              borderTopWidth: normalizeBorderWidth(deviceProps.border_width) || '1px',
              borderColor: deviceProps.border_color || '#e5e7eb',
              borderStyle: (getBorderStyle() as any) || 'solid',
            }}
          />
        </div>
      );

    case 'spacer':
      return (
        <div
          style={{
            ...containerStyles,
            height: block.content?.height || deviceProps.height || '2rem',
          }}
        />
      );

    default:
      return null;
  }
}
