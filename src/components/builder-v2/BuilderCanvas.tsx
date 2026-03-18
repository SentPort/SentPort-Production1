import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  DragOverEvent,
  Modifier,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { BuilderSection, BuilderBlock, DeviceBreakpoint, BlockType, SectionType, PageBackgroundSettings } from '../../types/builder';
import Section from './Section';
import AddBlockModal from './AddBlockModal';
import AddSectionModal from './AddSectionModal';
import DragGuides from './DragGuides';
import AlignmentGuides, { AlignmentGuide } from './AlignmentGuides';
import ToastNotification from './ToastNotification';
import { Plus, Monitor, Tablet, Smartphone, Copy, RotateCcw } from 'lucide-react';

interface BuilderCanvasProps {
  pageContentId: string;
  currentDevice: DeviceBreakpoint;
  sections: BuilderSection[];
  onUpdateSections: (sections: BuilderSection[]) => void;
  selectedSectionId?: string;
  selectedBlockId?: string;
  onSelectSection: (sectionId: string) => void;
  onSelectBlock: (blockId: string) => void;
  showGrid?: boolean;
  backgroundImageUrl?: string;
  backgroundSettings?: PageBackgroundSettings;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export default function BuilderCanvas({
  pageContentId,
  currentDevice,
  sections,
  onUpdateSections,
  selectedSectionId,
  selectedBlockId,
  onSelectSection,
  onSelectBlock,
  showGrid = false,
  backgroundImageUrl,
  backgroundSettings,
  onDragStart,
  onDragEnd,
}: BuilderCanvasProps) {
  const [showAddBlockModal, setShowAddBlockModal] = useState(false);
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [targetSectionId, setTargetSectionId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([]);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const snapToGrid: Modifier = ({ transform }) => {
    if (!showGrid) return transform;

    const gridSize = 32;

    return {
      ...transform,
      x: Math.round(transform.x / gridSize) * gridSize,
      y: Math.round(transform.y / gridSize) * gridSize,
    };
  };

  const getCanvasWidth = () => {
    switch (currentDevice) {
      case 'mobile':
        return '375px';
      case 'tablet':
        return '768px';
      default:
        return '100%';
    }
  };

  const handleAddSection = (sectionType: SectionType = 'custom') => {
    const newSection: BuilderSection = {
      id: crypto.randomUUID(),
      page_content_id: pageContentId,
      section_order: sections.length,
      section_type: sectionType,
      layout_columns: 1,
      max_width: 'contained',
      background_type: 'none',
      background_value: {},
      background_position: 'center',
      background_size: 'cover',
      background_repeat: 'no-repeat',
      background_attachment: 'scroll',
      background_overlay_opacity: 0,
      padding_top: '4rem',
      padding_bottom: '4rem',
      padding_left: '1rem',
      padding_right: '1rem',
      visibility_desktop: true,
      visibility_tablet: true,
      visibility_mobile: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      blocks: [],
    };

    onUpdateSections([...sections, newSection]);
    onSelectSection(newSection.id);
  };

  const handleUpdateSection = (sectionId: string, updates: Partial<BuilderSection>) => {
    const updatedSections = sections.map((section) =>
      section.id === sectionId
        ? { ...section, ...updates, updated_at: new Date().toISOString() }
        : section
    );
    onUpdateSections(updatedSections);
  };


  const handleDeleteSection = (sectionId: string) => {
    const updatedSections = sections
      .filter((s) => s.id !== sectionId)
      .map((s, index) => ({ ...s, section_order: index }));
    onUpdateSections(updatedSections);
  };

  const handleDuplicateSection = (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;

    const duplicatedSection: BuilderSection = {
      ...section,
      id: crypto.randomUUID(),
      section_order: sections.length,
      blocks: section.blocks?.map((block) => ({
        ...block,
        id: crypto.randomUUID(),
        section_id: crypto.randomUUID(),
      })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onUpdateSections([...sections, duplicatedSection]);
  };

  const handleDuplicateBlock = (sectionId: string, blockId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section || !section.blocks) return;

    const blockIndex = section.blocks.findIndex((b) => b.id === blockId);
    if (blockIndex === -1) return;

    const sourceBlock = section.blocks[blockIndex];

    const duplicatedBlock: BuilderBlock = {
      ...sourceBlock,
      id: crypto.randomUUID(),
      block_order: blockIndex + 1,
      position_x: sourceBlock.is_absolute && sourceBlock.position_x ? sourceBlock.position_x + 20 : sourceBlock.position_x,
      position_y: sourceBlock.is_absolute && sourceBlock.position_y ? sourceBlock.position_y + 20 : sourceBlock.position_y,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updatedBlocks = [
      ...section.blocks.slice(0, blockIndex + 1),
      duplicatedBlock,
      ...section.blocks.slice(blockIndex + 1).map((block) => ({
        ...block,
        block_order: block.block_order + 1,
      })),
    ];

    const updatedSections = sections.map((s) =>
      s.id === sectionId
        ? { ...s, blocks: updatedBlocks, updated_at: new Date().toISOString() }
        : s
    );

    onUpdateSections(updatedSections);
    onSelectBlock(duplicatedBlock.id);
  };

  const handleAddBlock = (sectionId: string, blockType: BlockType) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;

    const defaultProps = getDefaultBlockProperties(blockType);

    const blocksOnCurrentDevice = section.blocks?.filter(b => b.device === currentDevice) || [];

    const newBlockId = crypto.randomUUID();
    const newBlock: BuilderBlock = {
      id: newBlockId,
      section_id: sectionId,
      block_order: blocksOnCurrentDevice.length,
      block_type: blockType,
      content: getDefaultContent(blockType),
      styles: {},
      responsive_styles: {},
      link_target: '_self',
      alignment: 'left',
      animation_duration: '0.3s',
      animation_delay: '0s',
      visibility_desktop: currentDevice === 'desktop',
      visibility_tablet: currentDevice === 'tablet',
      visibility_mobile: currentDevice === 'mobile',
      device: currentDevice,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...defaultProps,
    };

    const updatedSections = sections.map((s) =>
      s.id === sectionId
        ? { ...s, blocks: [...(s.blocks || []), newBlock] }
        : s
    );

    onUpdateSections(updatedSections);
    setShowAddBlockModal(false);
    setTargetSectionId(null);

    onSelectBlock(newBlockId);

    const blockLabel = blockType.charAt(0).toUpperCase() + blockType.slice(1).replace('_', ' ');
    setToastMessage(`${blockLabel} block added successfully`);
    setShowToast(true);

    setTimeout(() => {
      const blockElement = document.querySelector(`[data-block-id="${newBlockId}"]`);
      if (blockElement) {
        blockElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const getDefaultContent = (blockType: BlockType): Record<string, any> => {
    switch (blockType) {
      case 'heading':
        return { text: 'Your Heading Here', level: 'h2' };
      case 'paragraph':
        return { text: 'Double-click to edit this text. Start typing to customize your content.' };
      case 'button':
        return { text: 'Click Me' };
      case 'spacer':
        return { height: '2rem' };
      default:
        return {};
    }
  };

  const getDefaultBlockProperties = (blockType: BlockType): Partial<BuilderBlock> => {
    if (blockType === 'button') {
      return {
        width: '200px',
        height: 'auto',
        border_radius: '6px',
        padding: '12px 24px',
        background_color: '#3b82f6',
        text_color: '#ffffff',
        alignment: 'center',
      };
    }
    if (blockType === 'heading') {
      return {
        text_color: '#1f2937',
        font_size: '32px',
        font_weight: '700',
        padding: '16px',
        line_height: '1.2',
      };
    }
    if (blockType === 'paragraph') {
      return {
        text_color: '#374151',
        font_size: '16px',
        font_weight: '400',
        padding: '12px',
        line_height: '1.6',
      };
    }
    return {};
  };

  const handleUpdateBlock = (sectionId: string, blockId: string, updates: Partial<BuilderBlock> | ((block: BuilderBlock) => Partial<BuilderBlock>)) => {
    const updatedSections = sections.map((section) => {
      if (section.id === sectionId) {
        return {
          ...section,
          blocks: section.blocks?.map((block) => {
            if (block.id === blockId) {
              const finalUpdates = typeof updates === 'function' ? updates(block) : updates;

              if (!finalUpdates || typeof finalUpdates !== 'object') {
                console.error('Invalid block updates:', finalUpdates);
                return block;
              }

              return { ...block, ...finalUpdates, updated_at: new Date().toISOString() };
            }
            return block;
          }),
          updated_at: new Date().toISOString(),
        };
      }
      return section;
    });
    onUpdateSections(updatedSections);
  };

  const handleDeleteBlock = (sectionId: string, blockId: string) => {
    const updatedSections = sections.map((section) => {
      if (section.id === sectionId) {
        return {
          ...section,
          blocks: section.blocks
            ?.filter((b) => b.id !== blockId)
            .map((b, index) => ({ ...b, block_order: index })),
          updated_at: new Date().toISOString(),
        };
      }
      return section;
    });
    onUpdateSections(updatedSections);
  };

  const handleReorderBlocks = (sectionId: string, blockIds: string[]) => {
    const updatedSections = sections.map((section) => {
      if (section.id === sectionId) {
        const reorderedBlocks = blockIds
          .map((id) => section.blocks?.find((b) => b.id === id))
          .filter((b): b is BuilderBlock => b !== undefined)
          .map((block, index) => ({ ...block, block_order: index }));

        return {
          ...section,
          blocks: reorderedBlocks,
          updated_at: new Date().toISOString(),
        };
      }
      return section;
    });
    onUpdateSections(updatedSections);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveSectionId(event.active.id as string);
    calculateAlignmentGuides(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (event.over) {
      setDropTargetId(event.over.id as string);
    }
  };

  const handleDragMove = (event: any) => {
    if (event.delta.x !== 0 || event.delta.y !== 0) {
      calculateAlignmentGuides(event.active.id as string);
    }
  };

  const calculateAlignmentGuides = (activeId: string) => {
    const guides: AlignmentGuide[] = [];
    const activeElement = document.querySelector(`[data-id="${activeId}"]`);

    if (!activeElement) {
      setAlignmentGuides([]);
      return;
    }

    const activeRect = activeElement.getBoundingClientRect();
    const canvasElement = document.querySelector('.builder-canvas-container');
    const canvasRect = canvasElement?.getBoundingClientRect();

    if (!canvasRect) {
      setAlignmentGuides([]);
      return;
    }

    sections.forEach((section) => {
      if (section.id === activeId) return;

      const element = document.querySelector(`[data-id="${section.id}"]`);
      if (!element) return;

      const rect = element.getBoundingClientRect();

      const threshold = 5;

      if (Math.abs(activeRect.left - rect.left) < threshold) {
        guides.push({
          type: 'vertical',
          position: rect.left - canvasRect.left,
          label: '0px',
        });
      }

      if (Math.abs(activeRect.right - rect.right) < threshold) {
        guides.push({
          type: 'vertical',
          position: rect.right - canvasRect.left,
          label: '0px',
        });
      }

      if (Math.abs(activeRect.left - rect.right) < threshold) {
        const distance = Math.abs(activeRect.left - rect.right);
        guides.push({
          type: 'vertical',
          position: rect.right - canvasRect.left,
          distance,
          label: `${distance}px`,
        });
      }

      if (Math.abs(activeRect.top - rect.top) < threshold) {
        guides.push({
          type: 'horizontal',
          position: rect.top - canvasRect.top,
          label: '0px',
        });
      }

      if (Math.abs(activeRect.bottom - rect.bottom) < threshold) {
        guides.push({
          type: 'horizontal',
          position: rect.bottom - canvasRect.top,
          label: '0px',
        });
      }

      if (Math.abs(activeRect.top - rect.bottom) < threshold) {
        const distance = Math.abs(activeRect.top - rect.bottom);
        guides.push({
          type: 'horizontal',
          position: rect.bottom - canvasRect.top,
          distance,
          label: `${distance}px`,
        });
      }
    });

    setAlignmentGuides(guides);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveSectionId(null);
    setAlignmentGuides([]);
    setDropTargetId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const isSectionDrag = sections.some((s) => s.id === activeId);

    if (isSectionDrag) {
      const oldIndex = sections.findIndex((s) => s.id === activeId);
      const newIndex = sections.findIndex((s) => s.id === overId);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedSections = arrayMove(sections, oldIndex, newIndex).map((section, index) => ({
          ...section,
          section_order: index,
        }));
        onUpdateSections(reorderedSections);
      }
    } else {
      const section = sections.find((s) => s.blocks?.some((b) => b.id === activeId));
      if (section && section.blocks) {
        const oldIndex = section.blocks.findIndex((b) => b.id === activeId);
        const newIndex = section.blocks.findIndex((b) => b.id === overId);

        if (oldIndex !== -1 && newIndex !== -1) {
          const reorderedBlocks = arrayMove(section.blocks, oldIndex, newIndex);
          handleReorderBlocks(section.id, reorderedBlocks.map((b) => b.id));
        }
      }
    }
  };

  const sortedSections = [...sections].sort((a, b) => a.section_order - b.section_order);
  const activeSection = sections.find((s) => s.id === activeSectionId);

  const getBackgroundStyle = (): React.CSSProperties => {
    if (!backgroundImageUrl) return {};

    const settings = backgroundSettings || {
      position: 'center',
      size: 'cover',
      repeat: 'no-repeat',
      attachment: 'scroll',
      opacity: 1,
      overlay_opacity: 0,
    };

    return {
      backgroundImage: `url(${backgroundImageUrl})`,
      backgroundPosition: settings.position,
      backgroundSize: settings.size,
      backgroundRepeat: settings.repeat,
      backgroundAttachment: settings.attachment,
      opacity: settings.opacity,
    };
  };

  const getOverlayStyle = (): React.CSSProperties => {
    if (!backgroundImageUrl || !backgroundSettings?.overlay_color || !backgroundSettings?.overlay_opacity) {
      return { display: 'none' };
    }

    return {
      backgroundColor: backgroundSettings.overlay_color,
      opacity: backgroundSettings.overlay_opacity,
    };
  };

  const deviceIcon = currentDevice === 'desktop' ? <Monitor className="w-5 h-5" /> : currentDevice === 'tablet' ? <Tablet className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />;
  const deviceLabel = currentDevice.charAt(0).toUpperCase() + currentDevice.slice(1);

  const getBannerStyles = () => {
    if (currentDevice === 'tablet') {
      return {
        background: 'linear-gradient(to right, #fff7ed, #ffedd5)',
        borderColor: '#fdba74',
        iconColor: '#ea580c',
        textColor: '#7c2d12',
        badgeBg: '#f97316',
      };
    }
    return {
      background: 'linear-gradient(to right, #f0fdf4, #dcfce7)',
      borderColor: '#86efac',
      iconColor: '#16a34a',
      textColor: '#14532d',
      badgeBg: '#22c55e',
    };
  };

  const bannerStyles = getBannerStyles();

  return (
    <div className="flex-1 bg-gray-100 overflow-auto">
      <div className="min-h-full p-8">
        {currentDevice !== 'desktop' && (
          <div
            className="rounded-lg px-6 py-4 mb-6 mx-auto shadow-sm border-2"
            style={{
              width: getCanvasWidth(),
              background: bannerStyles.background,
              borderColor: bannerStyles.borderColor,
            }}
          >
            <div className="flex items-center gap-3">
              <div style={{ color: bannerStyles.iconColor }}>{deviceIcon}</div>
              <span className="text-sm font-semibold" style={{ color: bannerStyles.textColor }}>
                Editing {deviceLabel} View
              </span>
              <span
                className="text-xs px-2 py-1 text-white rounded-full"
                style={{ backgroundColor: bannerStyles.badgeBg }}
              >
                {currentDevice === 'tablet' ? '768px' : '375px'}
              </span>
            </div>
          </div>
        )}
        <div
          className="bg-white shadow-xl mx-auto transition-all duration-300 relative builder-canvas-container"
          style={{
            width: getCanvasWidth(),
            minHeight: '100vh',
            ...(currentDevice !== 'desktop' && {
              border: `3px solid ${currentDevice === 'tablet' ? '#fb923c' : '#22c55e'}`,
              borderRadius: '8px',
            }),
          }}
        >
          {backgroundImageUrl && (
            <>
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  ...getBackgroundStyle(),
                  zIndex: 0,
                }}
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  ...getOverlayStyle(),
                  zIndex: 1,
                }}
              />
            </>
          )}
          <div className="relative" style={{ zIndex: 2 }}>
            <DragGuides showGrid={showGrid} gridSize={16} />
            <AlignmentGuides guides={alignmentGuides} />
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragMove={handleDragMove}
              modifiers={showGrid ? [snapToGrid] : []}
            >
            {sortedSections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 px-8">
                <div className="text-center max-w-md">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Plus className="w-12 h-12 text-blue-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Start Building Your Page
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Add your first section to begin creating your website. Sections are containers
                    that hold your content blocks.
                  </p>
                  <button
                    onClick={() => setShowAddSectionModal(true)}
                    className="bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors shadow-sm"
                  >
                    Add Section
                  </button>
                </div>
              </div>
            ) : (
              <>
                <SortableContext
                  items={sortedSections.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {sortedSections.map((section) => (
                    <Section
                      key={section.id}
                      section={section}
                      isSelected={selectedSectionId === section.id}
                      currentDevice={currentDevice}
                      onSelect={() => onSelectSection(section.id)}
                      onUpdateSection={(updates) => handleUpdateSection(section.id, updates)}
                      onDeleteSection={() => handleDeleteSection(section.id)}
                      onDuplicateSection={() => handleDuplicateSection(section.id)}
                      onUpdateBlock={(blockId, updates) => handleUpdateBlock(section.id, blockId, updates)}
                      onDeleteBlock={(blockId) => handleDeleteBlock(section.id, blockId)}
                      onDuplicateBlock={(blockId) => handleDuplicateBlock(section.id, blockId)}
                      onReorderBlocks={(blockIds) => handleReorderBlocks(section.id, blockIds)}
                      onSelectBlock={onSelectBlock}
                      selectedBlockId={selectedBlockId}
                      isEditMode
                      isDragging={activeSectionId === section.id}
                      isDropTarget={dropTargetId === section.id}
                      showGrid={showGrid}
                      gridSize={32}
                      onDragStart={onDragStart}
                      onDragEnd={onDragEnd}
                    />
                  ))}
                </SortableContext>

                <div className="p-8 border-t-2 border-dashed border-gray-300">
                  <button
                    onClick={() => setShowAddSectionModal(true)}
                    className="w-full py-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 text-gray-600 hover:text-blue-600 font-medium"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Add Section</span>
                  </button>
                </div>
              </>
            )}

            <DragOverlay>
              {activeSection && (
                <div className="opacity-50 bg-white shadow-2xl border-2 border-blue-500 rounded-lg p-8">
                  <div className="text-center text-gray-500 font-medium">
                    {activeSection.section_type} Section
                  </div>
                </div>
              )}
            </DragOverlay>
            </DndContext>
          </div>
        </div>
      </div>

      <AddSectionModal
        isOpen={showAddSectionModal}
        onClose={() => setShowAddSectionModal(false)}
        onAddSection={(sectionType) => {
          handleAddSection(sectionType);
          setShowAddSectionModal(false);
        }}
      />

      <AddBlockModal
        isOpen={showAddBlockModal}
        onClose={() => {
          setShowAddBlockModal(false);
          setTargetSectionId(null);
        }}
        onAddBlock={(blockType) => {
          if (targetSectionId) {
            handleAddBlock(targetSectionId, blockType);
          }
        }}
      />

      {selectedSectionId && (
        <button
          onClick={() => {
            setTargetSectionId(selectedSectionId);
            setShowAddBlockModal(true);
          }}
          className="fixed bottom-8 right-96 bg-blue-500 text-white px-6 py-3 rounded-full shadow-2xl hover:bg-blue-600 transition-all flex items-center gap-2 font-medium z-40"
        >
          <Plus className="w-5 h-5" />
          <span>Add Block</span>
        </button>
      )}

      <ToastNotification
        message={toastMessage}
        show={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
}
