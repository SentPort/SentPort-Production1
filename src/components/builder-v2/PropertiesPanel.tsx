import React, { useState, useMemo, useEffect } from 'react';
import { BuilderSection, BuilderBlock, DeviceBreakpoint } from '../../types/builder';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify, Type, Palette, Settings, X, Upload, CreditCard as Edit2, Sparkles, Monitor, Tablet, Smartphone, RotateCcw, Copy as CopyIcon } from 'lucide-react';
import MediaManager from './MediaManager';
import ImageEditor from './ImageEditor';
import TypographyPresetsSelector from './TypographyPresetsSelector';
import ColorPickerWithAlpha from './ColorPickerWithAlpha';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';

interface PropertiesPanelProps {
  selectedSection?: BuilderSection;
  selectedBlock?: BuilderBlock;
  currentDevice: DeviceBreakpoint;
  onUpdateSection?: (updates: Partial<BuilderSection>) => void;
  onUpdateBlock?: (updates: Partial<BuilderBlock>) => void;
  onClose: () => void;
  subdomain?: string;
}

type Tab = 'content' | 'design' | 'advanced';

export default function PropertiesPanel({
  selectedSection,
  selectedBlock,
  currentDevice,
  onUpdateSection,
  onUpdateBlock,
  onClose,
  subdomain = 'default',
}: PropertiesPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('content');
  const [showMediaManager, setShowMediaManager] = useState(false);
  const [mediaTargetType, setMediaTargetType] = useState<'block' | 'section'>('block');
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [showTypographyPresets, setShowTypographyPresets] = useState(false);
  const [currentPresetId, setCurrentPresetId] = useState<string | undefined>();

  // Local state for immediate input feedback
  const [localFontSize, setLocalFontSize] = useState('');
  const [localPadding, setLocalPadding] = useState('');
  const [localMargin, setLocalMargin] = useState('');
  const [localBorderWidth, setLocalBorderWidth] = useState('');
  const [localBorderRadius, setLocalBorderRadius] = useState('');
  const [localWidth, setLocalWidth] = useState('');
  const [localHeight, setLocalHeight] = useState('');

  const debouncedUpdateBlock = useDebouncedCallback((updates: Partial<BuilderBlock>) => {
    if (onUpdateBlock) {
      onUpdateBlock(updates);
    }
  }, 300);

  const debouncedUpdateSection = useDebouncedCallback((updates: Partial<BuilderSection>) => {
    if (onUpdateSection) {
      onUpdateSection(updates);
    }
  }, 300);

  // Helper function to get device-aware property value
  const getDeviceProperty = (property: string, block?: BuilderBlock): any => {
    if (!block) return '';

    if (currentDevice === 'desktop') {
      return block[property] || '';
    } else {
      const devicePropsKey = currentDevice === 'tablet' ? 'tablet_properties' : 'mobile_properties';
      const deviceProps = block[devicePropsKey];

      if (deviceProps && deviceProps[property] !== undefined && deviceProps[property] !== null) {
        return deviceProps[property];
      }

      return block[property] || '';
    }
  };

  // Sync local state with props when block or device changes
  useEffect(() => {
    if (selectedBlock) {
      setLocalFontSize(getDeviceProperty('font_size', selectedBlock));
      setLocalPadding(getDeviceProperty('padding', selectedBlock));
      setLocalMargin(getDeviceProperty('margin', selectedBlock));
      setLocalBorderWidth(getDeviceProperty('border_width', selectedBlock));
      setLocalBorderRadius(getDeviceProperty('border_radius', selectedBlock));
      setLocalWidth(getDeviceProperty('width', selectedBlock));
      setLocalHeight(getDeviceProperty('height', selectedBlock));
    }
  }, [selectedBlock, currentDevice]);

  if (!selectedSection && !selectedBlock) {
    return null;
  }

  const camelToSnake = (camelCase: string): string => {
    const CAMEL_TO_SNAKE_MAP: Record<string, string> = {
      'textAlign': 'alignment',
      'fontFamily': 'font_family',
      'fontSize': 'font_size',
      'fontWeight': 'font_weight',
      'fontStyle': 'font_style',
      'textDecoration': 'text_decoration',
      'lineHeight': 'line_height',
      'letterSpacing': 'letter_spacing',
      'color': 'text_color',
      'backgroundColor': 'background_color',
      'padding': 'padding',
      'margin': 'margin',
      'borderRadius': 'border_radius',
      'borderWidth': 'border_width',
      'borderColor': 'border_color',
      'borderStyle': 'border_style',
      'boxShadow': 'shadow',
      'width': 'width',
      'height': 'height',
      'position_x': 'position_x',
      'position_y': 'position_y',
    };
    return CAMEL_TO_SNAKE_MAP[camelCase] || camelCase;
  };

  const handleUpdateBlockProperty = (property: string, value: any, immediate: boolean = false) => {
    if (!selectedBlock) return;
    const snakeProperty = camelToSnake(property);

    const updateFn = immediate ? onUpdateBlock : debouncedUpdateBlock;
    if (!updateFn) return;

    if (currentDevice === 'desktop') {
      updateFn({ [snakeProperty]: value });
    } else {
      const devicePropsKey = currentDevice === 'tablet' ? 'tablet_properties' : 'mobile_properties';
      const existingDeviceProps = selectedBlock[devicePropsKey] || {};
      updateFn({
        [devicePropsKey]: {
          ...existingDeviceProps,
          [snakeProperty]: value,
        },
      });
    }
    setCurrentPresetId(undefined);
  };

  const handleCopyFromDesktop = () => {
    if (!selectedBlock || !onUpdateBlock || currentDevice === 'desktop') return;

    const devicePropsKey = currentDevice === 'tablet' ? 'tablet_properties' : 'mobile_properties';
    const desktopProps: Record<string, any> = {};

    const propertiesToCopy = [
      'alignment', 'font_family', 'font_size', 'font_weight', 'font_style',
      'text_decoration', 'line_height', 'letter_spacing', 'text_color',
      'background_color', 'padding', 'margin', 'border_radius', 'border_width',
      'border_color', 'border_style', 'shadow', 'width', 'height',
      'position_x', 'position_y', 'is_absolute', 'z_index',
      'hover_background_color', 'hover_text_color'
    ];

    propertiesToCopy.forEach(prop => {
      if (selectedBlock[prop] !== undefined && selectedBlock[prop] !== null) {
        desktopProps[prop] = selectedBlock[prop];
      }
    });

    onUpdateBlock({
      [devicePropsKey]: desktopProps,
    });
  };

  const handleClearResponsiveOverrides = () => {
    if (!selectedBlock || !onUpdateBlock || currentDevice === 'desktop') return;

    const devicePropsKey = currentDevice === 'tablet' ? 'tablet_properties' : 'mobile_properties';
    onUpdateBlock({
      [devicePropsKey]: null,
    });
  };

  const handleUpdateSectionPadding = (side: 'top' | 'bottom' | 'left' | 'right', value: string) => {
    if (!selectedSection) return;
    const paddingKey = `padding_${side}`;

    if (currentDevice === 'desktop') {
      debouncedUpdateSection({ [paddingKey]: value });
    } else {
      const configKey = currentDevice === 'tablet' ? 'tablet_config' : 'mobile_config';
      const existingConfig = selectedSection[configKey] || {};
      debouncedUpdateSection({
        [configKey]: {
          ...existingConfig,
          [paddingKey]: value,
        },
      });
    }
  };

  const handleUpdateSectionColumns = (value: number) => {
    if (!selectedSection) return;

    if (currentDevice === 'desktop') {
      debouncedUpdateSection({ layout_columns: value });
    } else {
      const configKey = currentDevice === 'tablet' ? 'tablet_config' : 'mobile_config';
      const existingConfig = selectedSection[configKey] || {};
      debouncedUpdateSection({
        [configKey]: {
          ...existingConfig,
          layout_columns: value,
        },
      });
    }
  };

  const handleUpdateSectionMaxWidth = (value: 'full' | 'contained' | 'custom') => {
    if (!selectedSection) return;

    if (currentDevice === 'desktop') {
      debouncedUpdateSection({ max_width: value });
    } else {
      const configKey = currentDevice === 'tablet' ? 'tablet_config' : 'mobile_config';
      const existingConfig = selectedSection[configKey] || {};
      debouncedUpdateSection({
        [configKey]: {
          ...existingConfig,
          max_width: value,
        },
      });
    }
  };

  const tabs = [
    { id: 'content' as Tab, label: 'Content', icon: <Type className="w-4 h-4" /> },
    { id: 'design' as Tab, label: 'Design', icon: <Palette className="w-4 h-4" /> },
    { id: 'advanced' as Tab, label: 'Advanced', icon: <Settings className="w-4 h-4" /> },
  ];

  const deviceIcon = currentDevice === 'desktop' ? <Monitor className="w-4 h-4" /> : currentDevice === 'tablet' ? <Tablet className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />;
  const deviceLabel = currentDevice.charAt(0).toUpperCase() + currentDevice.slice(1);

  const renderContentTab = () => {
    if (selectedBlock) {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Block Type</label>
            <input
              type="text"
              value={selectedBlock.block_type}
              disabled
              className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm"
            />
          </div>

          {(selectedBlock.block_type === 'heading' || selectedBlock.block_type === 'paragraph' || selectedBlock.block_type === 'button') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Text Content</label>
              <textarea
                value={selectedBlock.content.text || ''}
                onChange={(e) =>
                  onUpdateBlock?.({ content: { ...selectedBlock.content, text: e.target.value } })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                rows={4}
              />
            </div>
          )}

          {selectedBlock.block_type === 'button' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Link URL</label>
                <input
                  type="text"
                  value={selectedBlock.link_url || ''}
                  onChange={(e) => onUpdateBlock?.({ link_url: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Link Target</label>
                <select
                  value={selectedBlock.link_target}
                  onChange={(e) => onUpdateBlock?.({ link_target: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="_self">Same window</option>
                  <option value="_blank">New window</option>
                </select>
              </div>
            </>
          )}

          {selectedBlock.block_type === 'image' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={selectedBlock.content.url || ''}
                  onChange={(e) =>
                    onUpdateBlock?.({ content: { ...selectedBlock.content, url: e.target.value } })
                  }
                  placeholder="https://example.com/image.jpg"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                <button
                  onClick={() => {
                    setMediaTargetType('block');
                    setShowMediaManager(true);
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload</span>
                </button>
              </div>
              {selectedBlock.content.url && (
                <button
                  onClick={() => setShowImageEditor(true)}
                  className="w-full mb-4 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Edit Image Settings</span>
                </button>
              )}
              <label className="block text-sm font-medium text-gray-700 mb-2">Alt Text</label>
              <input
                type="text"
                value={selectedBlock.content.alt || ''}
                onChange={(e) =>
                  onUpdateBlock?.({ content: { ...selectedBlock.content, alt: e.target.value } })
                }
                placeholder="Describe the image"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          )}
        </div>
      );
    }

    if (selectedSection) {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Section Type</label>
            <select
              value={selectedSection.section_type}
              onChange={(e) => onUpdateSection?.({ section_type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="hero">Hero</option>
              <option value="features">Features</option>
              <option value="gallery">Gallery</option>
              <option value="contact">Contact</option>
              <option value="testimonials">Testimonials</option>
              <option value="pricing">Pricing</option>
              <option value="team">Team</option>
              <option value="cta">Call to Action</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Columns
              {currentDevice !== 'desktop' && (
                <span className="ml-2 text-xs text-orange-600">({deviceLabel})</span>
              )}
            </label>
            <input
              type="number"
              min="1"
              max="6"
              value={(() => {
                if (currentDevice === 'desktop') return selectedSection.layout_columns || 1;
                const config = currentDevice === 'tablet' ? selectedSection.tablet_config : selectedSection.mobile_config;
                return config?.layout_columns ?? selectedSection.layout_columns ?? 1;
              })()}
              onChange={(e) => handleUpdateSectionColumns(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Width
              {currentDevice !== 'desktop' && (
                <span className="ml-2 text-xs text-orange-600">({deviceLabel})</span>
              )}
            </label>
            <select
              value={(() => {
                if (currentDevice === 'desktop') return selectedSection.max_width || 'contained';
                const config = currentDevice === 'tablet' ? selectedSection.tablet_config : selectedSection.mobile_config;
                return config?.max_width ?? selectedSection.max_width ?? 'contained';
              })()}
              onChange={(e) => handleUpdateSectionMaxWidth(e.target.value as 'full' | 'contained' | 'custom')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="full">Full Width</option>
              <option value="contained">Contained (1200px)</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderDesignTab = () => {
    if (selectedBlock) {
      const isTextBlock = selectedBlock.block_type === 'heading' || selectedBlock.block_type === 'paragraph';
      const hasDeviceProperties = currentDevice === 'desktop'
        ? selectedBlock.desktop_properties !== null && selectedBlock.desktop_properties !== undefined
        : currentDevice === 'tablet'
        ? selectedBlock.tablet_properties !== null && selectedBlock.tablet_properties !== undefined
        : selectedBlock.mobile_properties !== null && selectedBlock.mobile_properties !== undefined;

      return (
        <div className="space-y-4">
          {currentDevice !== 'desktop' && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {deviceIcon}
                  <span className="text-sm font-medium text-gray-700">Editing {deviceLabel} View</span>
                </div>
                {hasDeviceProperties && (
                  <span className="text-xs px-2 py-1 bg-orange-500 text-white rounded-full">
                    Customized
                  </span>
                )}
              </div>
            </div>
          )}

          {isTextBlock && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  <label className="text-sm font-semibold text-gray-900">Typography Presets</label>
                </div>
                {currentPresetId && (
                  <span className="text-xs px-2 py-1 bg-blue-600 text-white rounded-full">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 mb-3">
                Apply professional font combinations instantly
              </p>
              <button
                onClick={() => setShowTypographyPresets(true)}
                className="w-full px-4 py-2 bg-white border-2 border-blue-300 text-blue-700 rounded-lg font-medium hover:bg-blue-50 hover:border-blue-400 transition-all shadow-sm"
              >
                Browse Presets
              </button>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Text Alignment
            </label>
            <div className="flex gap-2">
              {[
                { value: 'left', icon: <AlignLeft className="w-4 h-4" /> },
                { value: 'center', icon: <AlignCenter className="w-4 h-4" /> },
                { value: 'right', icon: <AlignRight className="w-4 h-4" /> },
                { value: 'justify', icon: <AlignJustify className="w-4 h-4" /> },
              ].map((align) => {
                const currentAlignment = getDeviceProperty('alignment', selectedBlock);
                return (
                  <button
                    key={align.value}
                    onClick={() => handleUpdateBlockProperty('textAlign', align.value, true)}
                    className={`flex-1 p-3 border-2 rounded-lg transition-all ${
                      currentAlignment === align.value
                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {align.icon}
                  </button>
                );
              })}
            </div>
          </div>

          {isTextBlock && (
            <div className="pt-2 border-t border-gray-200">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Manual Font Controls</label>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Font Family
            </label>
            <select
              value={getDeviceProperty('font_family', selectedBlock) || ''}
              onChange={(e) => {
                handleUpdateBlockProperty('fontFamily', e.target.value, true);
                setCurrentPresetId(undefined);
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="">Default</option>
              <optgroup label="Sans-Serif">
                <option value="Inter, sans-serif">Inter</option>
                <option value="Roboto, sans-serif">Roboto</option>
                <option value="Open Sans, sans-serif">Open Sans</option>
                <option value="Lato, sans-serif">Lato</option>
                <option value="Montserrat, sans-serif">Montserrat</option>
                <option value="Poppins, sans-serif">Poppins</option>
                <option value="Work Sans, sans-serif">Work Sans</option>
                <option value="Source Sans Pro, sans-serif">Source Sans Pro</option>
                <option value="Raleway, sans-serif">Raleway</option>
                <option value="Josefin Sans, sans-serif">Josefin Sans</option>
                <option value="Space Grotesk, sans-serif">Space Grotesk</option>
                <option value="system-ui, sans-serif">System UI</option>
                <option value="Arial, sans-serif">Arial</option>
                <option value="Helvetica Neue, sans-serif">Helvetica Neue</option>
                <option value="Verdana, sans-serif">Verdana</option>
              </optgroup>
              <optgroup label="Serif">
                <option value="Playfair Display, serif">Playfair Display</option>
                <option value="Merriweather, serif">Merriweather</option>
                <option value="Lora, serif">Lora</option>
                <option value="Cormorant Garamond, serif">Cormorant Garamond</option>
                <option value="Abril Fatface, serif">Abril Fatface</option>
                <option value="Yeseva One, serif">Yeseva One</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="Times New Roman, serif">Times New Roman</option>
              </optgroup>
              <optgroup label="Monospace">
                <option value="JetBrains Mono, monospace">JetBrains Mono</option>
                <option value="Fira Code, monospace">Fira Code</option>
                <option value="Courier New, monospace">Courier New</option>
              </optgroup>
              <optgroup label="Display">
                <option value="Orbitron, sans-serif">Orbitron</option>
                <option value="Exo 2, sans-serif">Exo 2</option>
              </optgroup>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Font Size
              </label>
              <input
                type="text"
                value={localFontSize}
                onChange={(e) => {
                  setLocalFontSize(e.target.value);
                  handleUpdateBlockProperty('fontSize', e.target.value);
                }}
                placeholder="16px"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Font Weight
              </label>
              <select
                value={getDeviceProperty('font_weight', selectedBlock) || 'normal'}
                onChange={(e) => handleUpdateBlockProperty('fontWeight', e.target.value, true)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="300">Light</option>
                <option value="normal">Normal</option>
                <option value="500">Medium</option>
                <option value="600">Semibold</option>
                <option value="bold">Bold</option>
                <option value="800">Extra Bold</option>
              </select>
            </div>
          </div>

          {isTextBlock && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Line Height
                </label>
                <select
                  value={getDeviceProperty('line_height', selectedBlock) || '1.5'}
                  onChange={(e) => {
                    handleUpdateBlockProperty('lineHeight', e.target.value, true);
                    setCurrentPresetId(undefined);
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="1">Tight (1.0)</option>
                  <option value="1.2">Snug (1.2)</option>
                  <option value="1.5">Normal (1.5)</option>
                  <option value="1.6">Relaxed (1.6)</option>
                  <option value="1.7">Loose (1.7)</option>
                  <option value="2">Extra Loose (2.0)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Letter Spacing
                </label>
                <select
                  value={getDeviceProperty('letter_spacing', selectedBlock) || 'normal'}
                  onChange={(e) => {
                    handleUpdateBlockProperty('letterSpacing', e.target.value, true);
                    setCurrentPresetId(undefined);
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="-0.05em">Tighter</option>
                  <option value="-0.02em">Tight</option>
                  <option value="normal">Normal</option>
                  <option value="0.01em">Wide</option>
                  <option value="0.02em">Wider</option>
                  <option value="0.05em">Widest</option>
                </select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Text Style
            </label>
            <div className="flex gap-2">
              <label className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={getDeviceProperty('font_style', selectedBlock) === 'italic'}
                  onChange={(e) => handleUpdateBlockProperty('fontStyle', e.target.checked ? 'italic' : 'normal', true)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm italic">Italic</span>
              </label>
              <label className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={getDeviceProperty('text_decoration', selectedBlock) === 'underline'}
                  onChange={(e) => handleUpdateBlockProperty('textDecoration', e.target.checked ? 'underline' : 'none', true)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm underline">Underline</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Text Color
              </label>
              <input
                type="color"
                value={getDeviceProperty('text_color', selectedBlock) || '#000000'}
                onChange={(e) => handleUpdateBlockProperty('color', e.target.value, true)}
                className="w-full h-10 border border-gray-200 rounded-lg cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Background Color
              </label>
              <ColorPickerWithAlpha
                label=""
                value={getDeviceProperty('background_color', selectedBlock) || null}
                onChange={(value) => handleUpdateBlockProperty('backgroundColor', value, true)}
              />
            </div>
          </div>

          {selectedBlock.block_type === 'button' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Width
                  </label>
                  <input
                    type="text"
                    value={localWidth}
                    onChange={(e) => {
                      setLocalWidth(e.target.value);
                      handleUpdateBlockProperty('width', e.target.value);
                    }}
                    placeholder="200px"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Height
                  </label>
                  <input
                    type="text"
                    value={localHeight}
                    onChange={(e) => {
                      setLocalHeight(e.target.value);
                      handleUpdateBlockProperty('height', e.target.value);
                    }}
                    placeholder="auto"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Button Style
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Rectangle', value: '0px' },
                    { label: 'Rounded', value: '6px' },
                    { label: 'Pill', value: '999px' },
                  ].map(({ label, value }) => {
                    const currentRadius = getDeviceProperty('border_radius', selectedBlock);
                    const isActive = currentRadius === value || (value === '6px' && !currentRadius) || (value === '0px' && currentRadius === '0');
                    return (
                      <button
                        key={value}
                        onClick={() => {
                          setLocalBorderRadius(value);
                          handleUpdateBlockProperty('borderRadius', value, true);
                        }}
                        className={`px-3 py-2 border-2 text-sm font-medium transition-all ${
                          value === '0px' ? 'rounded-sm' : value === '6px' ? 'rounded-md' : 'rounded-full'
                        } ${
                          isActive
                            ? 'border-blue-500 bg-blue-50 text-blue-600'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Border</label>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Width
                </label>
                <input
                  type="text"
                  value={localBorderWidth}
                  onChange={(e) => {
                    setLocalBorderWidth(e.target.value);
                    handleUpdateBlockProperty('borderWidth', e.target.value);
                  }}
                  placeholder="1px"
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Color
                </label>
                <input
                  type="color"
                  value={getDeviceProperty('border_color', selectedBlock) || '#000000'}
                  onChange={(e) => handleUpdateBlockProperty('borderColor', e.target.value, true)}
                  className="w-full h-8 border border-gray-200 rounded cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Style
                </label>
                <select
                  value={getDeviceProperty('border_style', selectedBlock) || 'solid'}
                  onChange={(e) => handleUpdateBlockProperty('borderStyle', e.target.value, true)}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                >
                  <option value="none">None</option>
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Padding
              </label>
              <input
                type="text"
                value={localPadding}
                onChange={(e) => {
                  setLocalPadding(e.target.value);
                  handleUpdateBlockProperty('padding', e.target.value);
                }}
                placeholder="1rem"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Margin
              </label>
              <input
                type="text"
                value={localMargin}
                onChange={(e) => {
                  setLocalMargin(e.target.value);
                  handleUpdateBlockProperty('margin', e.target.value);
                }}
                placeholder="1rem"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>

          {selectedBlock.block_type !== 'button' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Border Radius
              </label>
              <input
                type="text"
                value={localBorderRadius}
                onChange={(e) => {
                  setLocalBorderRadius(e.target.value);
                  handleUpdateBlockProperty('borderRadius', e.target.value);
                }}
                placeholder="0.5rem"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          )}

          {selectedBlock.block_type === 'button' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Border Radius
              </label>
              <input
                type="text"
                value={localBorderRadius}
                onChange={(e) => {
                  setLocalBorderRadius(e.target.value);
                  handleUpdateBlockProperty('borderRadius', e.target.value);
                }}
                placeholder="6px"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          )}

          {selectedBlock.block_type === 'button' && (
            <>
              <div className="border-t border-gray-200 pt-4 mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">Hover Effects</label>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Hover Transform</label>
                    <select
                      value={selectedBlock.hover_transform || 'none'}
                      onChange={(e) => onUpdateBlock?.({ hover_transform: e.target.value === 'none' ? undefined : e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    >
                      <option value="none">None</option>
                      <option value="scale(1.05)">Scale Up (5%)</option>
                      <option value="scale(1.1)">Scale Up (10%)</option>
                      <option value="scale(0.95)">Scale Down (5%)</option>
                      <option value="translateY(-2px)">Lift (2px)</option>
                      <option value="translateY(-4px)">Lift (4px)</option>
                      <option value="scale(1.05) translateY(-2px)">Scale & Lift</option>
                    </select>
                  </div>

                  <ColorPickerWithAlpha
                    label="Hover Background"
                    value={selectedBlock.hover_background_color || null}
                    onChange={(value) => onUpdateBlock?.({ hover_background_color: value || undefined })}
                  />

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Hover Text Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={selectedBlock.hover_text_color || selectedBlock.text_color || '#000000'}
                        onChange={(e) => onUpdateBlock?.({ hover_text_color: e.target.value })}
                        className="w-12 h-8 border border-gray-200 rounded cursor-pointer"
                      />
                      <button
                        onClick={() => onUpdateBlock?.({ hover_text_color: undefined })}
                        className="px-2 text-xs text-gray-600 hover:text-gray-900 border border-gray-200 rounded"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Hover Border Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={selectedBlock.hover_border_color || selectedBlock.border_color || '#000000'}
                        onChange={(e) => onUpdateBlock?.({ hover_border_color: e.target.value })}
                        className="w-12 h-8 border border-gray-200 rounded cursor-pointer"
                      />
                      <button
                        onClick={() => onUpdateBlock?.({ hover_border_color: undefined })}
                        className="px-2 text-xs text-gray-600 hover:text-gray-900 border border-gray-200 rounded"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Hover Shadow</label>
                    <select
                      value={selectedBlock.hover_shadow || 'none'}
                      onChange={(e) => onUpdateBlock?.({ hover_shadow: e.target.value === 'none' ? undefined : e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    >
                      <option value="none">None</option>
                      <option value="0 2px 4px rgba(0,0,0,0.1)">Subtle</option>
                      <option value="0 4px 8px rgba(0,0,0,0.15)">Medium</option>
                      <option value="0 8px 16px rgba(0,0,0,0.2)">Strong</option>
                      <option value="0 12px 24px rgba(0,0,0,0.25)">Bold</option>
                    </select>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => onUpdateBlock?.({
                        hover_background_color: undefined,
                        hover_text_color: undefined,
                        hover_border_color: undefined,
                        hover_transform: undefined,
                        hover_shadow: undefined,
                      })}
                      className="w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Reset All Hover Effects
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      );
    }

    if (selectedSection) {
      const hasSectionDeviceConfig = currentDevice === 'desktop'
        ? selectedSection.desktop_config !== null && selectedSection.desktop_config !== undefined
        : currentDevice === 'tablet'
        ? selectedSection.tablet_config !== null && selectedSection.tablet_config !== undefined
        : selectedSection.mobile_config !== null && selectedSection.mobile_config !== undefined;

      const handleCopySectionFromDesktop = () => {
        if (!selectedSection || !onUpdateSection || currentDevice === 'desktop') return;
        const desktopConfig = selectedSection.desktop_config;
        if (!desktopConfig) return;

        const copiedConfig = JSON.parse(JSON.stringify(desktopConfig));
        if (currentDevice === 'tablet') {
          onUpdateSection({ tablet_config: copiedConfig });
        } else if (currentDevice === 'mobile') {
          onUpdateSection({ mobile_config: copiedConfig });
        }
      };

      const handleResetSection = () => {
        if (!selectedSection || !onUpdateSection || currentDevice === 'desktop') return;
        if (currentDevice === 'tablet') {
          onUpdateSection({ tablet_config: null });
        } else if (currentDevice === 'mobile') {
          onUpdateSection({ mobile_config: null });
        }
      };

      return (
        <div className="space-y-4">
          {currentDevice !== 'desktop' && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {deviceIcon}
                  <span className="text-sm font-medium text-gray-700">Editing {deviceLabel} View</span>
                </div>
                {hasSectionDeviceConfig && (
                  <span className="text-xs px-2 py-1 bg-orange-500 text-white rounded-full">
                    Customized
                  </span>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Background Type</label>
            <select
              value={selectedSection.background_type}
              onChange={(e) => onUpdateSection?.({ background_type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="none">None</option>
              <option value="color">Solid Color</option>
              <option value="gradient">Gradient</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
          </div>

          {selectedSection.background_type === 'color' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Background Color</label>
              <input
                type="color"
                value={selectedSection.background_value?.color || '#ffffff'}
                onChange={(e) =>
                  onUpdateSection?.({
                    background_value: { ...selectedSection.background_value, color: e.target.value },
                  })
                }
                className="w-full h-10 border border-gray-200 rounded-lg cursor-pointer"
              />
            </div>
          )}

          {selectedSection.background_type === 'image' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Background Image</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={selectedSection.background_image_url || ''}
                    onChange={(e) => onUpdateSection?.({ background_image_url: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                  <button
                    onClick={() => {
                      setMediaTargetType('section');
                      setShowMediaManager(true);
                    }}
                    className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm"
                  >
                    <Upload className="w-4 h-4" />
                    Upload
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                  <select
                    value={selectedSection.background_position}
                    onChange={(e) => onUpdateSection?.({ background_position: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="top">Top</option>
                    <option value="center">Center</option>
                    <option value="bottom">Bottom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
                  <select
                    value={selectedSection.background_size}
                    onChange={(e) => onUpdateSection?.({ background_size: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="cover">Cover</option>
                    <option value="contain">Contain</option>
                    <option value="auto">Auto</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Repeat</label>
                  <select
                    value={selectedSection.background_repeat}
                    onChange={(e) => onUpdateSection?.({ background_repeat: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="no-repeat">No Repeat</option>
                    <option value="repeat">Repeat</option>
                    <option value="repeat-x">Repeat X</option>
                    <option value="repeat-y">Repeat Y</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Attachment</label>
                  <select
                    value={selectedSection.background_attachment}
                    onChange={(e) => onUpdateSection?.({ background_attachment: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="scroll">Scroll</option>
                    <option value="fixed">Fixed (Parallax)</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Padding
              {currentDevice !== 'desktop' && (
                <span className="ml-2 text-xs text-orange-600">({deviceLabel})</span>
              )}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  value={(() => {
                  if (currentDevice === 'desktop') return selectedSection.padding_top;
                  const config = currentDevice === 'tablet' ? selectedSection.tablet_config : selectedSection.mobile_config;
                  return config?.padding_top ?? selectedSection.padding_top;
                })()}
                  onChange={(e) => handleUpdateSectionPadding('top', e.target.value)}
                  placeholder="Top"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={(() => {
                  if (currentDevice === 'desktop') return selectedSection.padding_bottom;
                  const config = currentDevice === 'tablet' ? selectedSection.tablet_config : selectedSection.mobile_config;
                  return config?.padding_bottom ?? selectedSection.padding_bottom;
                })()}
                  onChange={(e) => handleUpdateSectionPadding('bottom', e.target.value)}
                  placeholder="Bottom"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={(() => {
                  if (currentDevice === 'desktop') return selectedSection.padding_left;
                  const config = currentDevice === 'tablet' ? selectedSection.tablet_config : selectedSection.mobile_config;
                  return config?.padding_left ?? selectedSection.padding_left;
                })()}
                  onChange={(e) => handleUpdateSectionPadding('left', e.target.value)}
                  placeholder="Left"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={(() => {
                  if (currentDevice === 'desktop') return selectedSection.padding_right;
                  const config = currentDevice === 'tablet' ? selectedSection.tablet_config : selectedSection.mobile_config;
                  return config?.padding_right ?? selectedSection.padding_right;
                })()}
                  onChange={(e) => handleUpdateSectionPadding('right', e.target.value)}
                  placeholder="Right"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderAdvancedTab = () => {
    const item = selectedBlock || selectedSection;
    if (!item) return null;

    return (
      <div className="space-y-4">
        {selectedBlock && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Position & Size</label>
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedBlock.is_absolute || false}
                    onChange={(e) => {
                      onUpdateBlock?.({
                        is_absolute: e.target.checked,
                        position_x: e.target.checked ? (selectedBlock.position_x || 50) : 0,
                        position_y: e.target.checked ? (selectedBlock.position_y || 50) : 0,
                      });
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Enable Absolute Positioning</span>
                </label>

                {selectedBlock.is_absolute && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1 flex items-center gap-1">
                          X Position (px)
                        </label>
                        <input
                          type="number"
                          value={selectedBlock.position_x || 0}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            onUpdateBlock?.({ position_x: value });
                          }}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1 flex items-center gap-1">
                          Y Position (px)
                        </label>
                        <input
                          type="number"
                          value={selectedBlock.position_y || 0}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            onUpdateBlock?.({ position_y: value });
                          }}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Z-Index (Layering)</label>
                      <input
                        type="number"
                        value={selectedBlock.z_index || 0}
                        onChange={(e) => onUpdateBlock?.({ z_index: parseInt(e.target.value) || 0 })}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                        min="0"
                        max="100"
                      />
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Width
                    </label>
                    <input
                      type="text"
                      value={localWidth || 'auto'}
                      onChange={(e) => {
                        setLocalWidth(e.target.value);
                        handleUpdateBlockProperty('width', e.target.value);
                      }}
                      placeholder="auto"
                      className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Height
                    </label>
                    <input
                      type="text"
                      value={localHeight || 'auto'}
                      onChange={(e) => {
                        setLocalHeight(e.target.value);
                        handleUpdateBlockProperty('height', e.target.value);
                      }}
                      placeholder="auto"
                      className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-gray-200" />
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.visibility_desktop}
                onChange={(e) =>
                  selectedBlock
                    ? onUpdateBlock?.({ visibility_desktop: e.target.checked })
                    : onUpdateSection?.({ visibility_desktop: e.target.checked })
                }
                className="rounded border-gray-300"
              />
              <span className="text-sm">Show on Desktop</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.visibility_tablet}
                onChange={(e) =>
                  selectedBlock
                    ? onUpdateBlock?.({ visibility_tablet: e.target.checked })
                    : onUpdateSection?.({ visibility_tablet: e.target.checked })
                }
                className="rounded border-gray-300"
              />
              <span className="text-sm">Show on Tablet</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.visibility_mobile}
                onChange={(e) =>
                  selectedBlock
                    ? onUpdateBlock?.({ visibility_mobile: e.target.checked })
                    : onUpdateSection?.({ visibility_mobile: e.target.checked })
                }
                className="rounded border-gray-300"
              />
              <span className="text-sm">Show on Mobile</span>
            </label>
          </div>
        </div>

        {selectedBlock && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Custom CSS</label>
            <textarea
              value={selectedBlock.custom_css || ''}
              onChange={(e) => onUpdateBlock?.({ custom_css: e.target.value })}
              placeholder="Custom CSS rules..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono resize-none"
              rows={6}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col shadow-lg">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">
          {selectedBlock ? 'Block Properties' : 'Section Properties'}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'content' && renderContentTab()}
        {activeTab === 'design' && renderDesignTab()}
        {activeTab === 'advanced' && renderAdvancedTab()}
      </div>

      <MediaManager
        isOpen={showMediaManager}
        onClose={() => setShowMediaManager(false)}
        subdomain={subdomain}
        acceptedTypes={mediaTargetType === 'block' && selectedBlock?.block_type === 'video' ? 'video' : 'image'}
        onSelectMedia={(url, type) => {
          if (mediaTargetType === 'block' && selectedBlock) {
            onUpdateBlock?.({ content: { ...selectedBlock.content, url } });
          } else if (mediaTargetType === 'section' && selectedSection) {
            onUpdateSection?.({ background_image_url: url });
          }
          setShowMediaManager(false);
        }}
      />

      {selectedBlock?.block_type === 'image' && selectedBlock.content.url && (
        <ImageEditor
          isOpen={showImageEditor}
          imageUrl={selectedBlock.content.url}
          onClose={() => setShowImageEditor(false)}
          onSave={(adjustments) => {
            onUpdateBlock?.({
              content: {
                ...selectedBlock.content,
                ...adjustments,
              },
            });
          }}
        />
      )}

      {selectedBlock && (selectedBlock.block_type === 'heading' || selectedBlock.block_type === 'paragraph') && (
        <TypographyPresetsSelector
          isOpen={showTypographyPresets}
          onClose={() => setShowTypographyPresets(false)}
          currentBlockType={selectedBlock.block_type}
          currentPresetId={currentPresetId}
          onSelectPreset={(preset) => {
            // Apply each preset property using device-aware updates
            const updates: Partial<BuilderBlock> = {};

            if (currentDevice === 'desktop') {
              // For desktop, update base properties directly
              Object.assign(updates, {
                font_family: preset.font_family,
                font_size: preset.font_size,
                font_weight: preset.font_weight,
                line_height: preset.line_height,
                letter_spacing: preset.letter_spacing,
                font_style: preset.font_style,
              });
            } else {
              // For tablet/mobile, update responsive_styles
              const currentResponsiveStyles = selectedBlock.responsive_styles || {};
              const deviceStyles = currentResponsiveStyles[currentDevice] || {};

              Object.assign(updates, {
                responsive_styles: {
                  ...currentResponsiveStyles,
                  [currentDevice]: {
                    ...deviceStyles,
                    fontFamily: preset.font_family,
                    fontSize: preset.font_size,
                    fontWeight: preset.font_weight,
                    lineHeight: preset.line_height,
                    letterSpacing: preset.letter_spacing,
                    fontStyle: preset.font_style,
                  },
                },
              });
            }

            onUpdateBlock?.(updates);
            setCurrentPresetId(preset.id);
          }}
        />
      )}
    </div>
  );
}
