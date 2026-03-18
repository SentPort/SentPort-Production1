import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DndContext, DragOverlay, DragEndEvent, DragStartEvent, closestCorners, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Subdomain, SubdomainPage, PageContent, BuilderTheme, BuilderComponent } from '../../types/builder';
import ComponentLibraryPanel from './ComponentLibraryPanel';
import BuilderCanvas from './BuilderCanvas';
import PropertiesPanel from './PropertiesPanel';
import BuilderHeader from './BuilderHeader';
import PageManagerModal from './PageManagerModal';
import TutorialOverlay from './TutorialOverlay';
import ComponentTreePanel from './ComponentTreePanel';
import { ToastContainer, ToastMessage } from './Toast';
import ConfirmDialog from './ConfirmDialog';
import LoadingSpinner from './LoadingSpinner';
import { cloneComponent, generateId } from '../../lib/builderHelpers';

interface BuilderLayoutProps {
  subdomain: Subdomain;
  pages: SubdomainPage[];
  currentPage: SubdomainPage;
  pageContent: PageContent;
  theme: BuilderTheme;
  onSaveContent: (components: any[], autoSave?: boolean) => void;
  onPublish: () => void;
  onCreatePage: (pageData: { path: string; title: string; type: string }) => void;
  onSwitchPage: (pageId: string) => void;
  onDeletePage: (pageId: string) => void;
}

export default function BuilderLayout({
  subdomain,
  pages,
  currentPage,
  pageContent,
  theme,
  onSaveContent,
  onPublish,
  onCreatePage,
  onSwitchPage,
  onDeletePage,
}: BuilderLayoutProps) {
  const navigate = useNavigate();
  const [components, setComponents] = useState<BuilderComponent[]>(pageContent.components || []);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showPageManager, setShowPageManager] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showTutorial, setShowTutorial] = useState(true);
  const [history, setHistory] = useState<BuilderComponent[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showGrid, setShowGrid] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'danger' | 'warning' | 'info' | 'success';
    onConfirm: () => void;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const showToast = useCallback((type: ToastMessage['type'], message: string, duration = 3000) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: ToastMessage = { id, type, message, duration };
    setToasts(prev => [...prev, newToast]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    const initialComponents = pageContent.components || [];
    setComponents(initialComponents);
    setSelectedComponentId(null);
    setIsDirty(false);
    setHistory([initialComponents]);
    setHistoryIndex(0);
  }, [pageContent]);

  const pushToHistory = useCallback((newComponents: BuilderComponent[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(newComponents)));
      return newHistory.slice(-50);
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setComponents(JSON.parse(JSON.stringify(history[newIndex])));
      setIsDirty(true);
      showToast('info', 'Undone');
    }
  }, [historyIndex, history, showToast]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setComponents(JSON.parse(JSON.stringify(history[newIndex])));
      setIsDirty(true);
      showToast('info', 'Redone');
    }
  }, [historyIndex, history, showToast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty) {
          handleSave();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedComponentId) {
        e.preventDefault();
        const component = findComponentById(components, selectedComponentId);
        if (component) {
          localStorage.setItem('builder_clipboard', JSON.stringify(component));
          showToast('info', 'Component copied to clipboard');
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        const clipboardData = localStorage.getItem('builder_clipboard');
        if (clipboardData) {
          try {
            const component = JSON.parse(clipboardData);
            const newComponent = cloneComponent({ ...component, id: generateId() });
            const updatedComponents = [...components, newComponent];
            setComponents(updatedComponents);
            pushToHistory(updatedComponents);
            setIsDirty(true);
            showToast('success', 'Component pasted');
          } catch (error) {
            showToast('error', 'Failed to paste component');
          }
        }
      } else if (e.key === 'Delete' && selectedComponentId) {
        e.preventDefault();
        handleDeleteComponent(selectedComponentId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, isDirty, selectedComponentId, components, pushToHistory, showToast]);

  useEffect(() => {
    if (!isDirty) return;

    const timer = setTimeout(() => {
      onSaveContent(components, true);
      setIsDirty(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [components, isDirty]);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type === 'new-component') {
      const newComponent = cloneComponent({
        ...activeData.component,
        id: generateId()
      });

      if (overData?.type === 'canvas') {
        setComponents([...components, newComponent]);
        setIsDirty(true);
        showToast('success', `${activeData.component.name} added to canvas`);
      } else if (overData?.type === 'component-container') {
        const targetId = overData.componentId;
        const updatedComponents = addComponentToContainer(components, targetId, newComponent);
        setComponents(updatedComponents);
        setIsDirty(true);
        showToast('success', `${activeData.component.name} added to container`);
      }
    }
  }

  function addComponentToContainer(
    comps: BuilderComponent[],
    targetId: string,
    newComp: BuilderComponent
  ): BuilderComponent[] {
    return comps.map(c => {
      if (c.id === targetId) {
        return {
          ...c,
          children: [...(c.children || []), newComp],
        };
      }
      if (c.children) {
        return {
          ...c,
          children: addComponentToContainer(c.children, targetId, newComp),
        };
      }
      return c;
    });
  }

  function handleAddComponent(template: BuilderComponent) {
    const newComponent = cloneComponent({ ...template, id: generateId() });
    const updatedComponents = [...components, newComponent];
    setComponents(updatedComponents);
    pushToHistory(updatedComponents);
    setIsDirty(true);
  }

  function handleUpdateComponent(id: string, updates: Partial<BuilderComponent>) {
    function updateInTree(comps: BuilderComponent[]): BuilderComponent[] {
      return comps.map(c => {
        if (c.id === id) {
          return { ...c, ...updates };
        }
        if (c.children) {
          return { ...c, children: updateInTree(c.children) };
        }
        return c;
      });
    }

    const updatedComponents = updateInTree(components);
    setComponents(updatedComponents);
    pushToHistory(updatedComponents);
    setIsDirty(true);
  }

  function handleDeleteComponent(id: string) {
    const component = findComponentById(components, id);

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Component',
      message: `Are you sure you want to delete this ${component?.type || 'component'}? This action cannot be undone.`,
      type: 'danger',
      onConfirm: () => {
        function removeFromTree(comps: BuilderComponent[]): BuilderComponent[] {
          return comps
            .filter(c => c.id !== id)
            .map(c => ({
              ...c,
              children: c.children ? removeFromTree(c.children) : undefined,
            }));
        }

        const updatedComponents = removeFromTree(components);
        setComponents(updatedComponents);
        pushToHistory(updatedComponents);
        setSelectedComponentId(null);
        setIsDirty(true);
        if (component) {
          showToast('info', `${component.type} deleted`);
        }
        setConfirmDialog(null);
      },
    });
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await onSaveContent(components, false);
      setIsDirty(false);
      showToast('success', 'Page saved successfully');
    } catch (error) {
      showToast('error', 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }

  function handlePreview() {
    window.open(`/preview/${subdomain.id}/page/${currentPage.id}`, '_blank');
  }

  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 10, 200));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 10, 50));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomLevel(100);
  }, []);

  const selectedComponent = selectedComponentId
    ? findComponentById(components, selectedComponentId)
    : null;

  function findComponentById(comps: BuilderComponent[], id: string): BuilderComponent | null {
    for (const comp of comps) {
      if (comp.id === id) return comp;
      if (comp.children) {
        const found = findComponentById(comp.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-screen flex flex-col bg-gray-100">
        <BuilderHeader
          subdomain={subdomain}
          currentPage={currentPage}
          viewMode={viewMode}
          isDirty={isDirty}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          onSave={handleSave}
          onPublish={onPublish}
          onPreview={handlePreview}
          onViewModeChange={setViewMode}
          onOpenPageManager={() => setShowPageManager(true)}
          onExit={() => navigate('/make-your-own-site')}
          onUndo={handleUndo}
          onRedo={handleRedo}
        />

        <div className="flex-1 flex overflow-hidden">
          <ComponentLibraryPanel onAddComponent={handleAddComponent} />

          <BuilderCanvas
            components={components}
            selectedComponentId={selectedComponentId}
            viewMode={viewMode}
            theme={theme}
            zoomLevel={zoomLevel}
            showGrid={showGrid}
            snapToGrid={snapToGrid}
            onSelectComponent={setSelectedComponentId}
            onUpdateComponent={handleUpdateComponent}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onZoomReset={handleZoomReset}
            onToggleGrid={() => setShowGrid(!showGrid)}
            onToggleSnap={() => setSnapToGrid(!snapToGrid)}
          />

          <ComponentTreePanel
            components={components}
            selectedComponentId={selectedComponentId}
            onSelectComponent={setSelectedComponentId}
            onDeleteComponent={handleDeleteComponent}
          />

          <PropertiesPanel
            selectedComponent={selectedComponent}
            onUpdateComponent={handleUpdateComponent}
            onDeleteComponent={handleDeleteComponent}
          />
        </div>

        {showPageManager && (
          <PageManagerModal
            pages={pages}
            currentPageId={currentPage.id}
            subdomainId={subdomain.id}
            onClose={() => setShowPageManager(false)}
            onSwitchPage={onSwitchPage}
            onCreatePage={onCreatePage}
            onDeletePage={onDeletePage}
          />
        )}

        {showTutorial && (
          <TutorialOverlay
            onComplete={(templateComponents) => {
              setShowTutorial(false);
              if (templateComponents && templateComponents.length > 0) {
                setComponents(templateComponents);
                pushToHistory(templateComponents);
                setIsDirty(true);
                showToast('success', 'Template loaded successfully');
              }
            }}
          />
        )}

        <ToastContainer toasts={toasts} onDismiss={dismissToast} />

        {confirmDialog && (
          <ConfirmDialog
            isOpen={confirmDialog.isOpen}
            title={confirmDialog.title}
            message={confirmDialog.message}
            type={confirmDialog.type}
            onConfirm={confirmDialog.onConfirm}
            onCancel={() => setConfirmDialog(null)}
          />
        )}

        {isSaving && <LoadingSpinner fullScreen text="Saving changes..." />}
      </div>

      <DragOverlay>
        {activeId ? (
          <div className="bg-blue-100 border-2 border-blue-500 rounded-lg p-4 shadow-2xl opacity-90">
            <div className="font-medium text-blue-900">Dragging component...</div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
