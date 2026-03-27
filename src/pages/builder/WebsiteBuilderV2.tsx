import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Eye, Undo, Redo, Grid2x2 as Grid, Settings as SettingsIcon, Copy, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { BuilderSection, DeviceBreakpoint, PageBackgroundSettings, DeviceViewState } from '../../types/builder';
import BuilderCanvas from '../../components/builder-v2/BuilderCanvas';
import PropertiesPanel from '../../components/builder-v2/PropertiesPanel';
import DevicePreviewSwitcher from '../../components/builder-v2/DevicePreviewSwitcher';
import PageSettingsPanel from '../../components/builder-v2/PageSettingsPanel';
import ResetViewConfirmModal from '../../components/builder-v2/ResetViewConfirmModal';
import BuilderErrorBoundary from '../../components/builder-v2/BuilderErrorBoundary';
import { loadBuilderPreferences, saveBuilderPreferences, resetBuilderPreferences, createDebouncedSave, BuilderPreferences, DEFAULT_BUILDER_PREFERENCES } from '../../lib/builderPreferences';

const createEmptyDeviceView = (): DeviceViewState => ({
  sections: [],
  history: [[]],
  historyIndex: 0,
  lastSaved: null,
});

const safeDeepClone = <T,>(obj: T): T => {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (error) {
    console.error('Deep clone failed, using fallback:', error);
    if (Array.isArray(obj)) {
      return obj.map(item => {
        if (typeof item === 'object' && item !== null) {
          return { ...item };
        }
        return item;
      }) as T;
    }
    if (typeof obj === 'object' && obj !== null) {
      return { ...obj } as T;
    }
    return obj;
  }
};

function WebsiteBuilderV2() {
  const navigate = useNavigate();
  const { pageId, subdomainId } = useParams<{ pageId?: string; subdomainId: string }>();
  const { user } = useAuth();

  const [desktopView, setDesktopView] = useState<DeviceViewState>(createEmptyDeviceView());
  const [tabletView, setTabletView] = useState<DeviceViewState>(createEmptyDeviceView());
  const [mobileView, setMobileView] = useState<DeviceViewState>(createEmptyDeviceView());

  const [pageTitle, setPageTitle] = useState('');
  const [pageContentId, setPageContentId] = useState<string>('');
  const [currentDevice, setCurrentDevice] = useState<DeviceBreakpoint>('desktop');
  const [selectedSectionId, setSelectedSectionId] = useState<string | undefined>();
  const [selectedBlockId, setSelectedBlockId] = useState<string | undefined>();
  const [showGrid, setShowGrid] = useState(false);
  const [saving, setSaving] = useState(false);

  const [loading, setLoading] = useState(true);
  const [subdomainName, setSubdomainName] = useState<string>('');
  const [showPageSettings, setShowPageSettings] = useState(false);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | undefined>();
  const [backgroundSettings, setBackgroundSettings] = useState<PageBackgroundSettings | undefined>();
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

  const savePreferencesRef = useRef<(preferences: BuilderPreferences) => void>();
  const isSavingRef = useRef(false);
  const lastChangeTimestampRef = useRef<number>(Date.now());
  const isDraggingRef = useRef(false);

  const getCurrentView = useCallback((): DeviceViewState => {
    if (currentDevice === 'desktop') return desktopView;
    if (currentDevice === 'tablet') return tabletView;
    return mobileView;
  }, [currentDevice, desktopView, tabletView, mobileView]);

  const setCurrentView = useCallback((view: DeviceViewState) => {
    if (currentDevice === 'desktop') setDesktopView(view);
    else if (currentDevice === 'tablet') setTabletView(view);
    else setMobileView(view);
  }, [currentDevice]);

  useEffect(() => {
    if (user && subdomainId) {
      savePreferencesRef.current = createDebouncedSave(
        (prefs: BuilderPreferences) => saveBuilderPreferences(user.id, subdomainId, prefs),
        1000
      );
    }
  }, [user, subdomainId]);

  const saveCurrentPreferences = useCallback(() => {
    if (!savePreferencesRef.current || !preferencesLoaded) return;

    const preferences: BuilderPreferences = {
      showGrid,
      currentDevice,
      showPageSettings,
    };

    savePreferencesRef.current(preferences);
  }, [showGrid, currentDevice, showPageSettings, preferencesLoaded]);

  useEffect(() => {
    if (preferencesLoaded) {
      saveCurrentPreferences();
    }
  }, [showGrid, currentDevice, showPageSettings, preferencesLoaded, saveCurrentPreferences]);

  useEffect(() => {
    loadBuilderData();
  }, [subdomainId, pageId]);

  const loadBuilderData = async () => {
    if (!subdomainId || !user) return;

    try {
      setLoading(true);

      const { data: subdomainData, error: subdomainError } = await supabase
        .from('subdomains')
        .select('*')
        .eq('id', subdomainId)
        .eq('owner_id', user.id)
        .maybeSingle();

      if (subdomainError) throw subdomainError;
      if (!subdomainData) {
        console.error('Subdomain not found or access denied');
        navigate('/dashboard');
        return;
      }

      setSubdomainName(subdomainData.subdomain);

      const preferences = await loadBuilderPreferences(user.id, subdomainId);
      setShowGrid(preferences.showGrid);
      setCurrentDevice(preferences.currentDevice);
      setShowPageSettings(preferences.showPageSettings);
      setPreferencesLoaded(true);

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

      let targetPageId = pageId;
      if (!targetPageId) {
        const homepage = pagesData.find(p => p.is_homepage);
        targetPageId = homepage?.id || pagesData[0].id;
        navigate(`/builder/${subdomainId}/page/${targetPageId}`, { replace: true });
        return;
      }

      await loadPageData(targetPageId);
      setLoading(false);
    } catch (err) {
      console.error('Error loading builder data:', err);
      setLoading(false);
    }
  };

  const createDefaultHomepage = async () => {
    try {
      const { data: newPage, error: pageError } = await supabase
        .from('subdomain_pages')
        .insert({
          subdomain_id: subdomainId,
          page_path: '/',
          page_title: 'Home',
          is_homepage: true,
        })
        .select()
        .single();

      if (pageError) throw pageError;

      navigate(`/builder/${subdomainId}/page/${newPage.id}`, { replace: true });
    } catch (err) {
      console.error('Error creating default homepage:', err);
    }
  };

  const loadPageData = async (targetPageId?: string) => {
    const loadId = targetPageId || pageId;
    if (!loadId) return;

    try {
      const { data: pageData, error: pageError } = await supabase
        .from('subdomain_pages')
        .select('*')
        .eq('id', loadId)
        .single();

      if (pageError) throw pageError;
      setPageTitle(pageData.page_title);
      setBackgroundImageUrl(pageData.background_image_url);
      setBackgroundSettings(pageData.background_image_settings);

      const { data: contentData, error: contentError } = await supabase
        .from('website_builder_page_content')
        .select('id')
        .eq('page_id', loadId)
        .eq('version', 'draft')
        .maybeSingle();

      if (contentError && contentError.code !== 'PGRST116') throw contentError;

      if (contentData) {
        setPageContentId(contentData.id);
        await loadAllDeviceViews(contentData.id);
      } else {
        await createInitialContent();
      }
    } catch (err) {
      console.error('Error loading page data:', err);
    }
  };

  const createInitialContent = async () => {
    if (!pageId) return;

    try {
      const { data, error } = await supabase
        .from('website_builder_page_content')
        .insert([
          {
            page_id: pageId,
            version: 'draft',
            components: [],
          },
        ])
        .select()
        .single();

      if (error) throw error;
      setPageContentId(data.id);
    } catch (err) {
      console.error('Error creating initial content:', err);
    }
  };

  const loadAllDeviceViews = async (contentId: string) => {
    try {
      await Promise.all([
        loadDeviceSections(contentId, 'desktop'),
        loadDeviceSections(contentId, 'tablet'),
        loadDeviceSections(contentId, 'mobile'),
      ]);
    } catch (err) {
      console.error('Error loading device views:', err);
    }
  };

  const loadDeviceSections = async (contentId: string, device: DeviceBreakpoint) => {
    try {
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('builder_sections')
        .select('*')
        .eq('page_content_id', contentId)
        .eq('device', device)
        .order('section_order');

      if (sectionsError) throw sectionsError;

      const sectionsWithBlocks = await Promise.all(
        (sectionsData || []).map(async (section) => {
          const { data: blocksData, error: blocksError } = await supabase
            .from('builder_blocks')
            .select('*')
            .eq('section_id', section.id)
            .order('block_order');

          if (blocksError) throw blocksError;

          return {
            ...section,
            blocks: blocksData || [],
          };
        })
      );

      const viewState: DeviceViewState = {
        sections: sectionsWithBlocks,
        history: [sectionsWithBlocks],
        historyIndex: 0,
        lastSaved: null,
      };

      if (device === 'desktop') setDesktopView(viewState);
      else if (device === 'tablet') setTabletView(viewState);
      else setMobileView(viewState);
    } catch (err) {
      console.error(`Error loading ${device} sections:`, err);
    }
  };

  const handleUpdateSections = (newSections: BuilderSection[]) => {
    try {
      const currentView = getCurrentView();
      lastChangeTimestampRef.current = Date.now();

      const newHistory = currentView.history.slice(0, currentView.historyIndex + 1);
      newHistory.push(safeDeepClone(newSections));

      if (newHistory.length > 50) {
        newHistory.shift();
      }

      const updatedView: DeviceViewState = {
        sections: newSections,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        lastSaved: currentView.lastSaved,
      };

      setCurrentView(updatedView);
    } catch (err) {
      console.error('Error updating sections:', err);
      const currentView = getCurrentView();
      const updatedView: DeviceViewState = {
        sections: newSections,
        history: currentView.history,
        historyIndex: currentView.historyIndex,
        lastSaved: currentView.lastSaved,
      };
      setCurrentView(updatedView);
    }
  };

  const handleUndo = () => {
    const currentView = getCurrentView();
    if (currentView.historyIndex > 0) {
      const updatedView: DeviceViewState = {
        ...currentView,
        historyIndex: currentView.historyIndex - 1,
        sections: currentView.history[currentView.historyIndex - 1],
      };
      setCurrentView(updatedView);
    }
  };

  const handleRedo = () => {
    const currentView = getCurrentView();
    if (currentView.historyIndex < currentView.history.length - 1) {
      const updatedView: DeviceViewState = {
        ...currentView,
        historyIndex: currentView.historyIndex + 1,
        sections: currentView.history[currentView.historyIndex + 1],
      };
      setCurrentView(updatedView);
    }
  };

  const handleCopyDesktop = async () => {
    if (currentDevice === 'desktop') return;

    try {
      // Deep copy desktop sections to preserve all nested properties
      const desktopSections = safeDeepClone(desktopView.sections);
      const copiedSections = desktopSections.map((section: BuilderSection) => {
        // Deep copy the section with new IDs
        const newSection = {
          ...section,
          id: crypto.randomUUID(),
          device: currentDevice,
          // Ensure visibility is enabled for the target device
          visibility_desktop: section.visibility_desktop,
          visibility_tablet: currentDevice === 'tablet' ? true : section.visibility_tablet,
          visibility_mobile: currentDevice === 'mobile' ? true : section.visibility_mobile,
          blocks: section.blocks?.map((block) => {
            // Deep copy each block preserving all styling properties
            return {
              ...block,
              id: crypto.randomUUID(),
              device: currentDevice,
              // Ensure visibility is enabled for the target device
              visibility_desktop: block.visibility_desktop,
              visibility_tablet: currentDevice === 'tablet' ? true : block.visibility_tablet,
              visibility_mobile: currentDevice === 'mobile' ? true : block.visibility_mobile,
              // All styling properties are preserved via the spread and JSON.parse above
              // Including: text_color, background_color, font_family, font_size, font_weight,
              // font_style, padding, margin, border_radius, border_width, border_color,
              // border_style, shadow, alignment, line_height, letter_spacing, etc.
            };
          }),
        };
        return newSection;
      });

      handleUpdateSections(copiedSections);

      if (user && pageContentId) {
        await supabase.from('builder_device_copy_log').insert({
          page_content_id: pageContentId,
          user_id: user.id,
          source_device: 'desktop',
          target_device: currentDevice,
        });
      }

      setShowSaveToast(true);
      setTimeout(() => setShowSaveToast(false), 2000);
    } catch (err) {
      console.error('Error copying desktop layout:', err);
      alert('Failed to copy desktop layout. Please try again.');
    }
  };

  const handleResetView = () => {
    if (currentDevice === 'desktop') return;
    setShowResetConfirmModal(true);
  };

  const handleConfirmReset = () => {
    setTimeout(() => {
      handleUpdateSections([]);
    }, 0);
  };

  const sanitizeBlockData = useCallback((block: any) => {
    const sanitized: any = {};

    const validKeys = [
      'id', 'section_id', 'block_order', 'block_type', 'content', 'styles',
      'responsive_styles', 'link_url', 'link_target', 'alignment', 'font_family',
      'font_size', 'font_weight', 'font_style', 'text_decoration', 'line_height',
      'letter_spacing', 'text_color', 'background_color', 'padding', 'margin',
      'border_radius', 'border_width', 'border_color', 'border_style', 'shadow',
      'animation_type', 'animation_duration', 'animation_delay', 'custom_css',
      'visibility_desktop', 'visibility_tablet', 'visibility_mobile', 'width',
      'height', 'position_x', 'position_y', 'is_absolute', 'z_index',
      'hover_background_color', 'hover_text_color', 'hover_border_color',
      'hover_transform', 'hover_shadow', 'device', 'desktop_properties',
      'tablet_properties', 'mobile_properties'
    ];

    for (const key of validKeys) {
      if (block[key] !== undefined) {
        sanitized[key] = block[key];
      }
    }

    if (!sanitized.content) sanitized.content = {};
    if (!sanitized.styles) sanitized.styles = {};
    if (!sanitized.responsive_styles) sanitized.responsive_styles = {};
    if (!sanitized.device) sanitized.device = currentDevice;

    return sanitized;
  }, [currentDevice]);

  const saveCurrentDeviceView = useCallback(async (isAutoSave = false) => {
    if (!pageContentId || !user) {
      console.warn('Cannot save: missing pageContentId or user');
      return false;
    }

    if (isSavingRef.current) {
      console.log('Save already in progress, skipping...');
      return false;
    }

    const currentView = getCurrentView();
    if (currentView.sections.length === 0 && !isAutoSave) {
      return false;
    }

    isSavingRef.current = true;
    setSaving(true);
    setSaveError(null);

    try {
      await supabase
        .from('builder_sections')
        .delete()
        .eq('page_content_id', pageContentId)
        .eq('device', currentDevice);

      for (const section of currentView.sections) {
        const { blocks, ...sectionData } = section;

        const { data: insertedSection, error: sectionError } = await supabase
          .from('builder_sections')
          .insert([{
            ...sectionData,
            page_content_id: pageContentId,
            device: currentDevice
          }])
          .select()
          .single();

        if (sectionError) {
          console.error('Section insert error:', sectionError);
          throw sectionError;
        }

        if (blocks && blocks.length > 0) {
          const blocksToInsert = blocks.map((block) => {
            const sanitized = sanitizeBlockData({
              ...block,
              section_id: insertedSection.id,
              device: currentDevice,
            });
            return sanitized;
          });

          const { error: blocksError } = await supabase
            .from('builder_blocks')
            .insert(blocksToInsert);

          if (blocksError) {
            console.error('Blocks insert error:', blocksError);
            throw blocksError;
          }
        }
      }

      await supabase
        .from('builder_save_state')
        .upsert({
          page_content_id: pageContentId,
          user_id: user.id,
          device: currentDevice,
          last_saved_at: new Date().toISOString(),
          save_type: isAutoSave ? 'auto' : 'manual',
        }, {
          onConflict: 'page_content_id,user_id,device'
        });

      await supabase
        .from('subdomain_pages')
        .update({ has_unpublished_changes: true })
        .eq('id', pageId);

      const updatedView = { ...currentView, lastSaved: new Date() };
      setCurrentView(updatedView);

      if (!isAutoSave) {
        setSaveError(null);
        setShowSaveToast(true);
        setTimeout(() => setShowSaveToast(false), 3000);
      }

      return true;
    } catch (err: any) {
      console.error(`Error saving ${currentDevice} view:`, err);
      const displayError = err?.message || 'Failed to save changes';
      setSaveError(displayError);

      if (!isAutoSave) {
        setShowSaveToast(true);
        setTimeout(() => setShowSaveToast(false), 5000);
      }

      return false;
    } finally {
      setSaving(false);
      isSavingRef.current = false;
    }
  }, [pageContentId, user, currentDevice, getCurrentView, setCurrentView, sanitizeBlockData, pageId]);

  const saveAllDeviceViews = useCallback(async () => {
    if (!pageContentId || !user) return false;

    setSaving(true);
    let allSuccess = true;

    const devices: DeviceBreakpoint[] = ['desktop', 'tablet', 'mobile'];
    for (const device of devices) {
      const view = device === 'desktop' ? desktopView : device === 'tablet' ? tabletView : mobileView;

      try {
        await supabase
          .from('builder_sections')
          .delete()
          .eq('page_content_id', pageContentId)
          .eq('device', device);

        for (const section of view.sections) {
          const { blocks, ...sectionData } = section;

          const { data: insertedSection, error: sectionError } = await supabase
            .from('builder_sections')
            .insert([{
              ...sectionData,
              page_content_id: pageContentId,
              device
            }])
            .select()
            .single();

          if (sectionError) throw sectionError;

          if (blocks && blocks.length > 0) {
            const blocksToInsert = blocks.map((block) => {
              const sanitized = sanitizeBlockData({
                ...block,
                section_id: insertedSection.id,
                device,
              });
              return sanitized;
            });

            const { error: blocksError } = await supabase
              .from('builder_blocks')
              .insert(blocksToInsert);

            if (blocksError) throw blocksError;
          }
        }

        await supabase
          .from('builder_save_state')
          .upsert({
            page_content_id: pageContentId,
            user_id: user.id,
            device,
            last_saved_at: new Date().toISOString(),
            save_type: 'manual',
          }, {
            onConflict: 'page_content_id,user_id,device'
          });
      } catch (err) {
        console.error(`Error saving ${device} view:`, err);
        allSuccess = false;
      }
    }

    if (allSuccess) {
      const now = new Date();
      setDesktopView(v => ({ ...v, lastSaved: now }));
      setTabletView(v => ({ ...v, lastSaved: now }));
      setMobileView(v => ({ ...v, lastSaved: now }));
    }

    setSaving(false);
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 3000);

    return allSuccess;
  }, [pageContentId, user, desktopView, tabletView, mobileView, sanitizeBlockData]);

  const autoSaveRef = useRef<(() => Promise<void>) | null>(null);

  const autoSave = useCallback(async () => {
    if (isSavingRef.current || isDraggingRef.current) return;

    const timeSinceLastChange = Date.now() - lastChangeTimestampRef.current;
    if (timeSinceLastChange < 2000) return;

    const currentView = getCurrentView();
    if (currentView.sections.length === 0) return;

    await saveCurrentDeviceView(true);
  }, [saveCurrentDeviceView, getCurrentView]);

  useEffect(() => {
    autoSaveRef.current = autoSave;
  }, [autoSave]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (autoSaveRef.current) {
        autoSaveRef.current();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleUpdatePageBackground = async (url: string | undefined, settings: PageBackgroundSettings) => {
    setBackgroundImageUrl(url);
    setBackgroundSettings(settings);

    try {
      await supabase
        .from('subdomain_pages')
        .update({
          background_image_url: url,
          background_image_settings: settings,
          has_unpublished_changes: true,
        })
        .eq('id', pageId);
    } catch (err) {
      console.error('Error saving page background:', err);
    }
  };

  const handlePreview = () => {
    window.open(`/preview/${subdomainId}/page/${pageId}?device=${currentDevice}`, '_blank');
  };

  const handlePublish = async () => {
    if (!pageId) return;

    try {
      await saveAllDeviceViews();

      const { error: pageUpdateError } = await supabase
        .from('subdomain_pages')
        .update({
          is_published: true,
          has_unpublished_changes: false,
          published_at: new Date().toISOString(),
        })
        .eq('id', pageId);

      if (pageUpdateError) throw pageUpdateError;

      const { data: subdomainData } = await supabase
        .from('subdomains')
        .select('status')
        .eq('id', subdomainId)
        .single();

      if (subdomainData?.status === 'inactive') {
        const { error: subdomainUpdateError } = await supabase
          .from('subdomains')
          .update({
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', subdomainId);

        if (subdomainUpdateError) console.error('Error activating subdomain:', subdomainUpdateError);
      }

      const { error: eventError } = await supabase
        .from('subdomain_publish_events')
        .insert({
          subdomain_id: subdomainId,
          page_id: pageId,
          event_type: 'page_published',
          metadata: { page_title: pageTitle },
        });

      if (eventError) console.error('Error logging publish event:', eventError);

      alert('Page published successfully! All device views are now live.');
      navigate(`/make-your-own-site?subdomain=${subdomainId}`);
    } catch (err) {
      console.error('Error publishing:', err);
      alert('Failed to publish. Please try again.');
    }
  };

  const handleResetPreferences = async () => {
    if (!user || !subdomainId) return;

    const success = await resetBuilderPreferences(user.id, subdomainId);
    if (success) {
      setShowGrid(DEFAULT_BUILDER_PREFERENCES.showGrid);
      setCurrentDevice(DEFAULT_BUILDER_PREFERENCES.currentDevice);
      setShowPageSettings(DEFAULT_BUILDER_PREFERENCES.showPageSettings);
      setPreferencesLoaded(false);
      setTimeout(() => setPreferencesLoaded(true), 100);
    }
  };

  const currentView = getCurrentView();
  const selectedSection = currentView.sections.find((s) => s.id === selectedSectionId);
  const selectedBlock = selectedSection?.blocks?.find((b) => b.id === selectedBlockId);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading builder...</p>
        </div>
      </div>
    );
  }

  return (
    <BuilderErrorBoundary>
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/make-your-own-site?subdomain=${subdomainId}`)}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">{pageTitle || 'Untitled Page'}</h1>
          <div className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-md">
            {currentDevice.charAt(0).toUpperCase() + currentDevice.slice(1)}
          </div>
          <div className="flex items-center gap-2">
            {saving && (
              <span className="text-xs text-blue-600 flex items-center gap-1">
                <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            )}
            {!saving && currentView.lastSaved && (
              <span className="text-xs text-gray-500">
                Saved {currentView.lastSaved.toLocaleTimeString()}
              </span>
            )}
            {!saving && saveError && (
              <span className="text-xs text-red-600 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Save failed
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 border-r border-gray-200 pr-4">
            <button
              onClick={handleUndo}
              disabled={currentView.historyIndex === 0}
              className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title={`Undo (${currentDevice})`}
            >
              <Undo className="w-5 h-5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={currentView.historyIndex === currentView.history.length - 1}
              className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title={`Redo (${currentDevice})`}
            >
              <Redo className="w-5 h-5" />
            </button>
          </div>

          {currentDevice !== 'desktop' && (
            <div className="flex items-center gap-2 border-r border-gray-200 pr-4">
              <button
                onClick={handleCopyDesktop}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                title="Copy desktop view to current device"
              >
                <Copy className="w-4 h-4" />
                <span>Copy Desktop</span>
              </button>
              <button
                onClick={handleResetView}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                title="Reset current device view"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </button>
            </div>
          )}

          <DevicePreviewSwitcher
            currentDevice={currentDevice}
            onDeviceChange={setCurrentDevice}
          />

          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded-lg transition-colors ${
              showGrid ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:text-gray-900'
            }`}
            title="Toggle Grid"
          >
            <Grid className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              setShowPageSettings(!showPageSettings);
              setSelectedSectionId(undefined);
              setSelectedBlockId(undefined);
            }}
            className={`p-2 rounded-lg transition-colors ${
              showPageSettings ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:text-gray-900'
            }`}
            title="Page Settings"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
            {currentDevice === 'desktop' && (
              <button
                onClick={handlePreview}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span>Preview</span>
              </button>
            )}
            <button
              onClick={() => saveAllDeviceViews()}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save All'}</span>
            </button>
            <button
              onClick={handlePublish}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <span>Publish</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <BuilderCanvas
          pageContentId={pageContentId}
          currentDevice={currentDevice}
          sections={currentView.sections}
          onUpdateSections={handleUpdateSections}
          selectedSectionId={selectedSectionId}
          selectedBlockId={selectedBlockId}
          onSelectSection={setSelectedSectionId}
          onSelectBlock={setSelectedBlockId}
          showGrid={showGrid}
          backgroundImageUrl={backgroundImageUrl}
          backgroundSettings={backgroundSettings}
          onDragStart={() => { isDraggingRef.current = true; }}
          onDragEnd={() => { isDraggingRef.current = false; }}
        />

        {(selectedSection || selectedBlock) && !showPageSettings && (
          <PropertiesPanel
            selectedSection={selectedSection}
            selectedBlock={selectedBlock}
            currentDevice={currentDevice}
            subdomain={subdomainName || 'default'}
            onUpdateSection={(updates) => {
              if (selectedSectionId) {
                const updatedSections = currentView.sections.map((s) =>
                  s.id === selectedSectionId ? { ...s, ...updates } : s
                );
                handleUpdateSections(updatedSections);
              }
            }}
            onUpdateBlock={(updates) => {
              if (!selectedSectionId || !selectedBlockId) return;

              const updatedSections = currentView.sections.map((s) =>
                s.id === selectedSectionId
                  ? {
                      ...s,
                      blocks: s.blocks?.map((b) =>
                        b.id === selectedBlockId
                          ? { ...b, ...updates }
                          : b
                      ),
                    }
                  : s
              );
              handleUpdateSections(updatedSections);
            }}
            onClose={() => {
              setSelectedSectionId(undefined);
              setSelectedBlockId(undefined);
            }}
          />
        )}

        {showPageSettings && (
          <PageSettingsPanel
            backgroundImageUrl={backgroundImageUrl}
            backgroundSettings={backgroundSettings}
            onUpdateBackground={handleUpdatePageBackground}
            onClose={() => setShowPageSettings(false)}
            subdomain={subdomainName}
            onResetPreferences={handleResetPreferences}
          />
        )}
      </div>

      {showSaveToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div
            className={`px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 ${
              saveError
                ? 'bg-red-500 text-white'
                : 'bg-green-500 text-white'
            }`}
          >
            {saveError ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <div>
                  <p className="font-semibold">Save Failed</p>
                  <p className="text-sm opacity-90">{saveError}</p>
                </div>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="font-semibold">Changes saved successfully</p>
              </>
            )}
          </div>
        </div>
      )}

      <ResetViewConfirmModal
        isOpen={showResetConfirmModal}
        onClose={() => setShowResetConfirmModal(false)}
        onConfirm={handleConfirmReset}
        deviceName={currentDevice}
      />
    </div>
    </BuilderErrorBoundary>
  );
}

function WebsiteBuilderV2WithErrorBoundary() {
  return (
    <BuilderErrorBoundary>
      <WebsiteBuilderV2 />
    </BuilderErrorBoundary>
  );
}

export default WebsiteBuilderV2WithErrorBoundary;
