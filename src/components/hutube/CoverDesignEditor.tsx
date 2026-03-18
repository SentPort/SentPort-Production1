import { useState, useRef, useEffect } from 'react';
import {
  X, Type, Palette, Image as ImageIcon, Layers, Download, Save, Trash2,
  AlignLeft, AlignCenter, AlignRight, Bold, Plus, ChevronDown
} from 'lucide-react';

interface TextLayer {
  id: string;
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  color: string;
  x: number;
  y: number;
  align: 'left' | 'center' | 'right';
}

interface BackgroundConfig {
  type: 'solid' | 'gradient';
  color1: string;
  color2?: string;
  gradientDirection?: 'horizontal' | 'vertical' | 'diagonal';
}

interface CoverDesignEditorProps {
  channelId: string;
  currentCoverData: any;
  onSave: (designData: any) => Promise<void>;
  onClose: () => void;
}

const fonts = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Georgia',
  'Verdana',
  'Courier New',
  'Impact',
  'Comic Sans MS',
  'Trebuchet MS',
  'Arial Black'
];

const fontWeights = ['300', '400', '600', '700', '900'];

const presetColors = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899',
  '#000000', '#FFFFFF', '#6B7280', '#FCD34D', '#34D399', '#60A5FA'
];

const presetTemplates = [
  {
    name: 'Bold & Simple',
    background: { type: 'solid' as const, color1: '#1F2937' },
    layers: [
      {
        id: '1',
        text: 'Your Channel Name',
        fontSize: 64,
        fontFamily: 'Impact',
        fontWeight: '700',
        color: '#FFFFFF',
        x: 50,
        y: 40,
        align: 'center' as const
      }
    ]
  },
  {
    name: 'Gradient Vibes',
    background: {
      type: 'gradient' as const,
      color1: '#8B5CF6',
      color2: '#EC4899',
      gradientDirection: 'diagonal' as const
    },
    layers: [
      {
        id: '1',
        text: 'Welcome to My Channel',
        fontSize: 56,
        fontFamily: 'Arial Black',
        fontWeight: '900',
        color: '#FFFFFF',
        x: 50,
        y: 50,
        align: 'center' as const
      }
    ]
  }
];

export default function CoverDesignEditor({
  channelId,
  currentCoverData,
  onSave,
  onClose
}: CoverDesignEditorProps) {
  const [background, setBackground] = useState<BackgroundConfig>(
    currentCoverData?.background || { type: 'solid', color1: '#1F2937' }
  );
  const [layers, setLayers] = useState<TextLayer[]>(
    currentCoverData?.layers || []
  );
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  const addTextLayer = () => {
    const newLayer: TextLayer = {
      id: Date.now().toString(),
      text: 'New Text',
      fontSize: 48,
      fontFamily: 'Arial',
      fontWeight: '700',
      color: '#FFFFFF',
      x: 50,
      y: 50,
      align: 'center'
    };
    setLayers([...layers, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  const updateLayer = (id: string, updates: Partial<TextLayer>) => {
    setLayers(layers.map(layer =>
      layer.id === id ? { ...layer, ...updates } : layer
    ));
  };

  const deleteLayer = (id: string) => {
    setLayers(layers.filter(layer => layer.id !== id));
    if (selectedLayerId === id) {
      setSelectedLayerId(null);
    }
  };

  const applyTemplate = (template: typeof presetTemplates[0]) => {
    setBackground(template.background);
    setLayers(template.layers);
    setSelectedLayerId(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const designData = {
        background,
        layers,
        version: '1.0'
      };
      await onSave(designData);
    } finally {
      setSaving(false);
    }
  };

  const getBackgroundStyle = () => {
    if (background.type === 'solid') {
      return { background: background.color1 };
    } else {
      const directions = {
        horizontal: 'to right',
        vertical: 'to bottom',
        diagonal: 'to bottom right'
      };
      const direction = directions[background.gradientDirection || 'horizontal'];
      return {
        background: `linear-gradient(${direction}, ${background.color1}, ${background.color2})`
      };
    }
  };

  const getTextAlign = (align: string) => {
    const alignMap = {
      left: 'flex-start',
      center: 'center',
      right: 'flex-end'
    };
    return alignMap[align as keyof typeof alignMap] || 'center';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Cover Design Editor</h2>
            <p className="text-gray-600">Create a custom cover for your channel</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 p-6 overflow-auto bg-gray-100">
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <div
                ref={canvasRef}
                className="relative rounded-lg overflow-hidden"
                style={{
                  width: '100%',
                  paddingBottom: '25%',
                  ...getBackgroundStyle()
                }}
              >
                {layers.map(layer => (
                  <div
                    key={layer.id}
                    onClick={() => setSelectedLayerId(layer.id)}
                    className={`absolute cursor-pointer transition-all ${
                      selectedLayerId === layer.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    style={{
                      left: '0',
                      right: '0',
                      top: `${layer.y}%`,
                      display: 'flex',
                      justifyContent: getTextAlign(layer.align),
                      padding: '0 2rem'
                    }}
                  >
                    <div
                      style={{
                        fontFamily: layer.fontFamily,
                        fontSize: `${layer.fontSize}px`,
                        fontWeight: layer.fontWeight,
                        color: layer.color,
                        textAlign: layer.align,
                        userSelect: 'none',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                      }}
                    >
                      {layer.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Quick Templates</h3>
              <div className="grid grid-cols-2 gap-3">
                {presetTemplates.map((template, index) => (
                  <button
                    key={index}
                    onClick={() => applyTemplate(template)}
                    className="p-3 border-2 border-gray-200 rounded-lg hover:border-red-500 transition-colors text-left"
                  >
                    <div className="font-medium text-gray-900">{template.name}</div>
                    <div className="text-sm text-gray-500">Click to apply</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="w-96 border-l border-gray-200 bg-white overflow-auto">
            <div className="p-6 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    Background
                  </h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type
                    </label>
                    <select
                      value={background.type}
                      onChange={(e) => setBackground({
                        ...background,
                        type: e.target.value as 'solid' | 'gradient'
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value="solid">Solid Color</option>
                      <option value="gradient">Gradient</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {background.type === 'gradient' ? 'Color 1' : 'Color'}
                    </label>
                    <input
                      type="color"
                      value={background.color1}
                      onChange={(e) => setBackground({ ...background, color1: e.target.value })}
                      className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer"
                    />
                    <div className="grid grid-cols-6 gap-2 mt-2">
                      {presetColors.map((color) => (
                        <button
                          key={color}
                          onClick={() => setBackground({ ...background, color1: color })}
                          className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400"
                          style={{ background: color }}
                        />
                      ))}
                    </div>
                  </div>

                  {background.type === 'gradient' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Color 2
                        </label>
                        <input
                          type="color"
                          value={background.color2 || '#000000'}
                          onChange={(e) => setBackground({ ...background, color2: e.target.value })}
                          className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Direction
                        </label>
                        <select
                          value={background.gradientDirection || 'horizontal'}
                          onChange={(e) => setBackground({
                            ...background,
                            gradientDirection: e.target.value as any
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="horizontal">Horizontal</option>
                          <option value="vertical">Vertical</option>
                          <option value="diagonal">Diagonal</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Layers className="w-5 h-5" />
                    Text Layers
                  </h3>
                  <button
                    onClick={addTextLayer}
                    className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Text
                  </button>
                </div>

                <div className="space-y-2 mb-4">
                  {layers.map((layer) => (
                    <div
                      key={layer.id}
                      onClick={() => setSelectedLayerId(layer.id)}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedLayerId === layer.id
                          ? 'bg-red-50 border-2 border-red-500'
                          : 'bg-gray-50 border-2 border-transparent hover:border-gray-300'
                      }`}
                    >
                      <div className="flex-1 truncate">
                        <div className="font-medium text-gray-900 truncate">{layer.text}</div>
                        <div className="text-xs text-gray-500">{layer.fontSize}px {layer.fontFamily}</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteLayer(layer.id);
                        }}
                        className="p-1 hover:bg-red-100 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  ))}
                </div>

                {selectedLayer && (
                  <div className="space-y-3 border-t border-gray-200 pt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Text
                      </label>
                      <input
                        type="text"
                        value={selectedLayer.text}
                        onChange={(e) => updateLayer(selectedLayer.id, { text: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Font Family
                      </label>
                      <select
                        value={selectedLayer.fontFamily}
                        onChange={(e) => updateLayer(selectedLayer.id, { fontFamily: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      >
                        {fonts.map((font) => (
                          <option key={font} value={font} style={{ fontFamily: font }}>
                            {font}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Size: {selectedLayer.fontSize}px
                        </label>
                        <input
                          type="range"
                          min="12"
                          max="120"
                          value={selectedLayer.fontSize}
                          onChange={(e) => updateLayer(selectedLayer.id, { fontSize: parseInt(e.target.value) })}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Weight
                        </label>
                        <select
                          value={selectedLayer.fontWeight}
                          onChange={(e) => updateLayer(selectedLayer.id, { fontWeight: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="300">Light</option>
                          <option value="400">Regular</option>
                          <option value="600">Semibold</option>
                          <option value="700">Bold</option>
                          <option value="900">Black</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Color
                      </label>
                      <input
                        type="color"
                        value={selectedLayer.color}
                        onChange={(e) => updateLayer(selectedLayer.id, { color: e.target.value })}
                        className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer"
                      />
                      <div className="grid grid-cols-6 gap-2 mt-2">
                        {presetColors.map((color) => (
                          <button
                            key={color}
                            onClick={() => updateLayer(selectedLayer.id, { color })}
                            className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400"
                            style={{ background: color }}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Alignment
                      </label>
                      <div className="flex gap-2">
                        {(['left', 'center', 'right'] as const).map((align) => (
                          <button
                            key={align}
                            onClick={() => updateLayer(selectedLayer.id, { align })}
                            className={`flex-1 px-3 py-2 border rounded-lg transition-colors ${
                              selectedLayer.align === align
                                ? 'bg-red-600 text-white border-red-600'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {align === 'left' && <AlignLeft className="w-4 h-4 mx-auto" />}
                            {align === 'center' && <AlignCenter className="w-4 h-4 mx-auto" />}
                            {align === 'right' && <AlignRight className="w-4 h-4 mx-auto" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vertical Position: {selectedLayer.y}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={selectedLayer.y}
                        onChange={(e) => updateLayer(selectedLayer.id, { y: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Design'}
          </button>
        </div>
      </div>
    </div>
  );
}
