import { useState, useRef, useEffect } from 'react';
import {
  X, Type, Palette, Image as ImageIcon, Layers, Save, Trash2,
  AlignLeft, AlignCenter, AlignRight, Plus, Upload, Droplet, Sparkles, RotateCcw, Move
} from 'lucide-react';

interface TextLayer {
  id: string;
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  color: string;
  x: number;
  y: number;
  align: 'left' | 'center' | 'right';
}

interface PhotoLayer {
  id: string;
  type: 'photo';
  url: string;
  opacity: number;
  blur: number;
  brightness: number;
  contrast: number;
  saturation: number;
  filter: FilterPreset | null;
  blendMode: BlendMode;
  scale: number;
  x: number;
  y: number;
}

type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light' | 'color-dodge';
type FilterPreset = 'tinted' | 'duotone' | 'soft-glow' | 'dark-vignette' | 'light-leak' | 'frosted' | 'gradient-mask' | 'radial-fade' | 'edge-blur';

interface BackgroundConfig {
  type: 'solid' | 'gradient';
  color1: string;
  color2?: string;
  gradientDirection?: 'horizontal' | 'vertical' | 'diagonal';
}

interface CoverDesignEditorProps {
  platform: 'hutube' | 'hubook' | 'heddit' | 'switter';
  currentCoverData: any;
  onSave: (designData: any) => Promise<void>;
  onClose: () => void;
}

const platformConfig = {
  hutube: {
    aspectRatio: 25,
    colors: { primary: '#EF4444', secondary: '#DC2626' },
    name: 'HuTube',
    dimensions: { width: 2560, height: 640 }
  },
  hubook: {
    aspectRatio: 56.25,
    colors: { primary: '#3B82F6', secondary: '#2563EB' },
    name: 'HuBook',
    dimensions: { width: 1200, height: 675 }
  },
  heddit: {
    aspectRatio: 33.33,
    colors: { primary: '#F97316', secondary: '#EA580C' },
    name: 'Heddit',
    dimensions: { width: 1200, height: 400 }
  },
  switter: {
    aspectRatio: 33.33,
    colors: { primary: '#1DA1F2', secondary: '#0C8ED9' },
    name: 'Switter',
    dimensions: { width: 1500, height: 500 }
  }
};

const fonts = [
  'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana',
  'Courier New', 'Impact', 'Comic Sans MS', 'Trebuchet MS', 'Arial Black'
];

const presetColors = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899',
  '#000000', '#FFFFFF', '#6B7280', '#FCD34D', '#34D399', '#60A5FA'
];

const filterPresets: { name: string; value: FilterPreset; description: string }[] = [
  { name: 'Tinted Overlay', value: 'tinted', description: 'Adds a color tint' },
  { name: 'Duotone', value: 'duotone', description: 'Two-color effect' },
  { name: 'Soft Glow', value: 'soft-glow', description: 'Ethereal glow' },
  { name: 'Dark Vignette', value: 'dark-vignette', description: 'Darkened edges' },
  { name: 'Light Leak', value: 'light-leak', description: 'Vintage light' },
  { name: 'Frosted Glass', value: 'frosted', description: 'Blurred overlay' },
  { name: 'Gradient Mask', value: 'gradient-mask', description: 'Gradient fade' },
  { name: 'Radial Fade', value: 'radial-fade', description: 'Center spotlight' },
  { name: 'Edge Blur', value: 'edge-blur', description: 'Soft borders' }
];

const blendModes: { name: string; value: BlendMode }[] = [
  { name: 'Normal', value: 'normal' },
  { name: 'Multiply', value: 'multiply' },
  { name: 'Screen', value: 'screen' },
  { name: 'Overlay', value: 'overlay' },
  { name: 'Soft Light', value: 'soft-light' },
  { name: 'Color Dodge', value: 'color-dodge' }
];

export default function CoverDesignEditor({
  platform,
  currentCoverData,
  onSave,
  onClose
}: CoverDesignEditorProps) {
  const config = platformConfig[platform];
  const [background, setBackground] = useState<BackgroundConfig>(
    currentCoverData?.background || { type: 'solid', color1: '#1F2937' }
  );
  const [photoLayers, setPhotoLayers] = useState<PhotoLayer[]>(
    currentCoverData?.photoLayers || []
  );
  const [textLayers, setTextLayers] = useState<TextLayer[]>(
    currentCoverData?.textLayers || currentCoverData?.layers || []
  );
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'background' | 'photo' | 'text'>('background');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [dragLayerStartPos, setDragLayerStartPos] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedPhotoLayer = photoLayers.find(l => l.id === selectedLayerId && l.type === 'photo');
  const selectedTextLayer = textLayers.find(l => l.id === selectedLayerId);

  const addTextLayer = () => {
    const newLayer: TextLayer = {
      id: Date.now().toString(),
      type: 'text',
      text: 'New Text',
      fontSize: 48,
      fontFamily: 'Arial',
      fontWeight: '700',
      color: '#FFFFFF',
      x: 50,
      y: 50,
      align: 'center'
    };
    setTextLayers([...textLayers, newLayer]);
    setSelectedLayerId(newLayer.id);
    setActiveTab('text');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setUploadingPhoto(true);
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        const newLayer: PhotoLayer = {
          id: Date.now().toString(),
          type: 'photo',
          url,
          opacity: 100,
          blur: 0,
          brightness: 100,
          contrast: 100,
          saturation: 100,
          filter: null,
          blendMode: 'normal',
          scale: 100,
          x: 50,
          y: 50
        };
        setPhotoLayers([newLayer, ...photoLayers]);
        setSelectedLayerId(newLayer.id);
        setActiveTab('photo');
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const updateTextLayer = (id: string, updates: Partial<TextLayer>) => {
    setTextLayers(textLayers.map(layer =>
      layer.id === id ? { ...layer, ...updates } : layer
    ));
  };

  const updatePhotoLayer = (id: string, updates: Partial<PhotoLayer>) => {
    setPhotoLayers(photoLayers.map(layer =>
      layer.id === id ? { ...layer, ...updates } : layer
    ));
  };

  const deleteTextLayer = (id: string) => {
    setTextLayers(textLayers.filter(layer => layer.id !== id));
    if (selectedLayerId === id) {
      setSelectedLayerId(null);
    }
  };

  const deletePhotoLayer = (id: string) => {
    setPhotoLayers(photoLayers.filter(layer => layer.id !== id));
    if (selectedLayerId === id) {
      setSelectedLayerId(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const designData = {
        version: '2.0',
        platform,
        dimensions: config.dimensions,
        background,
        photoLayers,
        textLayers
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

  const getPhotoLayerStyle = (layer: PhotoLayer) => {
    const filters = [];

    if (layer.blur > 0) filters.push(`blur(${layer.blur}px)`);
    if (layer.brightness !== 100) filters.push(`brightness(${layer.brightness}%)`);
    if (layer.contrast !== 100) filters.push(`contrast(${layer.contrast}%)`);
    if (layer.saturation !== 100) filters.push(`saturate(${layer.saturation}%)`);

    return {
      backgroundImage: `url(${layer.url})`,
      backgroundSize: `${layer.scale}%`,
      backgroundPosition: `${layer.x}% ${layer.y}%`,
      backgroundRepeat: 'no-repeat',
      opacity: layer.opacity / 100,
      filter: filters.length > 0 ? filters.join(' ') : undefined,
      mixBlendMode: layer.blendMode
    };
  };

  const getTextAlign = (align: string) => {
    const alignMap = { left: 'flex-start', center: 'center', right: 'flex-end' };
    return alignMap[align as keyof typeof alignMap] || 'center';
  };

  const handlePhotoLayerMouseDown = (e: React.MouseEvent, layer: PhotoLayer) => {
    if (selectedLayerId !== layer.id) return;
    e.preventDefault();
    e.stopPropagation();

    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsDraggingPhoto(true);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setDragLayerStartPos({ x: layer.x, y: layer.y });
  };

  const handlePhotoLayerTouchStart = (e: React.TouchEvent, layer: PhotoLayer) => {
    if (selectedLayerId !== layer.id) return;
    e.stopPropagation();

    const touch = e.touches[0];
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsDraggingPhoto(true);
    setDragStartPos({ x: touch.clientX, y: touch.clientY });
    setDragLayerStartPos({ x: layer.x, y: layer.y });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingPhoto || !dragStartPos || !dragLayerStartPos || !selectedPhotoLayer || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();

      const deltaX = e.clientX - dragStartPos.x;
      const deltaY = e.clientY - dragStartPos.y;

      const deltaXPercent = (deltaX / rect.width) * 100;
      const deltaYPercent = (deltaY / rect.height) * 100;

      const newX = Math.max(0, Math.min(100, dragLayerStartPos.x + deltaXPercent));
      const newY = Math.max(0, Math.min(100, dragLayerStartPos.y + deltaYPercent));

      updatePhotoLayer(selectedPhotoLayer.id, { x: Math.round(newX), y: Math.round(newY) });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingPhoto || !dragStartPos || !dragLayerStartPos || !selectedPhotoLayer || !canvasRef.current) return;

      const touch = e.touches[0];
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();

      const deltaX = touch.clientX - dragStartPos.x;
      const deltaY = touch.clientY - dragStartPos.y;

      const deltaXPercent = (deltaX / rect.width) * 100;
      const deltaYPercent = (deltaY / rect.height) * 100;

      const newX = Math.max(0, Math.min(100, dragLayerStartPos.x + deltaXPercent));
      const newY = Math.max(0, Math.min(100, dragLayerStartPos.y + deltaYPercent));

      updatePhotoLayer(selectedPhotoLayer.id, { x: Math.round(newX), y: Math.round(newY) });
    };

    const handleEnd = () => {
      setIsDraggingPhoto(false);
      setDragStartPos(null);
      setDragLayerStartPos(null);
    };

    if (isDraggingPhoto) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleEnd);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleEnd);
      };
    }
  }, [isDraggingPhoto, dragStartPos, dragLayerStartPos, selectedPhotoLayer]);

  const resetPhotoPosition = () => {
    if (!selectedPhotoLayer) return;
    updatePhotoLayer(selectedPhotoLayer.id, { x: 50, y: 50 });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Cover Design Editor</h2>
            <p className="text-gray-600">Create a custom cover for your {config.name} profile</p>
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
            <div className="bg-gray-800 rounded-lg p-4">
              <div
                ref={canvasRef}
                className="relative rounded-lg overflow-hidden"
                style={{
                  width: '100%',
                  paddingBottom: `${config.aspectRatio}%`,
                  ...getBackgroundStyle()
                }}
              >
                {photoLayers.map(layer => (
                  <div
                    key={layer.id}
                    onClick={() => {
                      setSelectedLayerId(layer.id);
                      setActiveTab('photo');
                    }}
                    onMouseDown={(e) => handlePhotoLayerMouseDown(e, layer)}
                    onTouchStart={(e) => handlePhotoLayerTouchStart(e, layer)}
                    className={`absolute inset-0 transition-all ${
                      selectedLayerId === layer.id
                        ? 'ring-4 ring-blue-500 ring-inset cursor-move'
                        : 'cursor-pointer'
                    }`}
                    style={getPhotoLayerStyle(layer)}
                  >
                    {selectedLayerId === layer.id && (
                      <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1 pointer-events-none">
                        <Move className="w-3 h-3" />
                        Drag to reposition
                      </div>
                    )}
                  </div>
                ))}

                {textLayers.map(layer => (
                  <div
                    key={layer.id}
                    onClick={() => {
                      setSelectedLayerId(layer.id);
                      setActiveTab('text');
                    }}
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
          </div>

          <div className="w-96 border-l border-gray-200 bg-white overflow-auto">
            <div className="border-b border-gray-200">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('background')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'background'
                      ? `text-${platform === 'hutube' ? 'red' : platform === 'hubook' ? 'blue' : platform === 'switter' ? 'blue' : 'orange'}-600 border-b-2 border-${platform === 'hutube' ? 'red' : platform === 'hubook' ? 'blue' : platform === 'switter' ? 'blue' : 'orange'}-600`
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Palette className="w-4 h-4 mx-auto mb-1" />
                  Background
                </button>
                <button
                  onClick={() => setActiveTab('photo')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'photo'
                      ? `text-${platform === 'hutube' ? 'red' : platform === 'hubook' ? 'blue' : platform === 'switter' ? 'blue' : 'orange'}-600 border-b-2 border-${platform === 'hutube' ? 'red' : platform === 'hubook' ? 'blue' : platform === 'switter' ? 'blue' : 'orange'}-600`
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <ImageIcon className="w-4 h-4 mx-auto mb-1" />
                  Photo
                </button>
                <button
                  onClick={() => setActiveTab('text')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'text'
                      ? `text-${platform === 'hutube' ? 'red' : platform === 'hubook' ? 'blue' : platform === 'switter' ? 'blue' : 'orange'}-600 border-b-2 border-${platform === 'hutube' ? 'red' : platform === 'hubook' ? 'blue' : platform === 'switter' ? 'blue' : 'orange'}-600`
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Type className="w-4 h-4 mx-auto mb-1" />
                  Text
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {activeTab === 'background' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <select
                      value={background.type}
                      onChange={(e) => setBackground({
                        ...background,
                        type: e.target.value as 'solid' | 'gradient'
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">Color 2</label>
                        <input
                          type="color"
                          value={background.color2 || '#000000'}
                          onChange={(e) => setBackground({ ...background, color2: e.target.value })}
                          className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer"
                        />
                        <div className="grid grid-cols-6 gap-2 mt-2">
                          {presetColors.map((color) => (
                            <button
                              key={color}
                              onClick={() => setBackground({ ...background, color2: color })}
                              className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400"
                              style={{ background: color }}
                            />
                          ))}
                        </div>
                        <div className="grid grid-cols-6 gap-2 mt-2">
                          {presetColors.map((color) => (
                            <button
                              key={color}
                              onClick={() => setBackground({ ...background, color2: color })}
                              className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400"
                              style={{ background: color }}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Direction</label>
                        <select
                          value={background.gradientDirection || 'horizontal'}
                          onChange={(e) => setBackground({
                            ...background,
                            gradientDirection: e.target.value as any
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="horizontal">Horizontal</option>
                          <option value="vertical">Vertical</option>
                          <option value="diagonal">Diagonal</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'photo' && (
                <div className="space-y-4">
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className={`w-full px-4 py-3 bg-${platform === 'hutube' ? 'red' : platform === 'hubook' ? 'blue' : platform === 'switter' ? 'blue' : 'orange'}-600 text-white rounded-lg hover:bg-${platform === 'hutube' ? 'red' : platform === 'hubook' ? 'blue' : platform === 'switter' ? 'blue' : 'orange'}-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50`}
                    >
                      <Upload className="w-5 h-5" />
                      {uploadingPhoto ? 'Uploading...' : 'Upload Photo Layer'}
                    </button>
                  </div>

                  {photoLayers.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No photo layers yet</p>
                      <p className="text-xs">Upload a photo to get started</p>
                    </div>
                  )}

                  {photoLayers.map((layer, index) => (
                    <div
                      key={layer.id}
                      onClick={() => setSelectedLayerId(layer.id)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedLayerId === layer.id
                          ? 'bg-blue-50 border-2 border-blue-500'
                          : 'bg-gray-50 border-2 border-transparent hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">Photo Layer {photoLayers.length - index}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePhotoLayer(layer.id);
                          }}
                          className="p-1 hover:bg-red-100 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                      <div
                        className="w-full h-20 rounded bg-cover bg-center"
                        style={{ backgroundImage: `url(${layer.url})` }}
                      />
                    </div>
                  ))}

                  {selectedPhotoLayer && (
                    <div className="space-y-4 border-t border-gray-200 pt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Opacity: {selectedPhotoLayer.opacity}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={selectedPhotoLayer.opacity}
                          onChange={(e) => updatePhotoLayer(selectedPhotoLayer.id, { opacity: parseInt(e.target.value) })}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Blur: {selectedPhotoLayer.blur}px
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="20"
                          value={selectedPhotoLayer.blur}
                          onChange={(e) => updatePhotoLayer(selectedPhotoLayer.id, { blur: parseInt(e.target.value) })}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Brightness: {selectedPhotoLayer.brightness}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="200"
                          value={selectedPhotoLayer.brightness}
                          onChange={(e) => updatePhotoLayer(selectedPhotoLayer.id, { brightness: parseInt(e.target.value) })}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Contrast: {selectedPhotoLayer.contrast}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="200"
                          value={selectedPhotoLayer.contrast}
                          onChange={(e) => updatePhotoLayer(selectedPhotoLayer.id, { contrast: parseInt(e.target.value) })}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Saturation: {selectedPhotoLayer.saturation}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="200"
                          value={selectedPhotoLayer.saturation}
                          onChange={(e) => updatePhotoLayer(selectedPhotoLayer.id, { saturation: parseInt(e.target.value) })}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Blend Mode</label>
                        <select
                          value={selectedPhotoLayer.blendMode}
                          onChange={(e) => updatePhotoLayer(selectedPhotoLayer.id, { blendMode: e.target.value as BlendMode })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {blendModes.map((mode) => (
                            <option key={mode.value} value={mode.value}>{mode.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Scale: {selectedPhotoLayer.scale}%
                        </label>
                        <input
                          type="range"
                          min="50"
                          max="200"
                          value={selectedPhotoLayer.scale}
                          onChange={(e) => updatePhotoLayer(selectedPhotoLayer.id, { scale: parseInt(e.target.value) })}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Position
                          </label>
                          <button
                            onClick={resetPhotoPosition}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Reset
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              X: {selectedPhotoLayer.x}%
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={selectedPhotoLayer.x}
                              onChange={(e) => updatePhotoLayer(selectedPhotoLayer.id, { x: parseInt(e.target.value) })}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              Y: {selectedPhotoLayer.y}%
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={selectedPhotoLayer.y}
                              onChange={(e) => updatePhotoLayer(selectedPhotoLayer.id, { y: parseInt(e.target.value) })}
                              className="w-full"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Tip: Click and drag the photo layer on the canvas to reposition
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'text' && (
                <div className="space-y-4">
                  <button
                    onClick={addTextLayer}
                    className={`w-full px-4 py-3 bg-${platform === 'hutube' ? 'red' : platform === 'hubook' ? 'blue' : platform === 'switter' ? 'blue' : 'orange'}-600 text-white rounded-lg hover:bg-${platform === 'hutube' ? 'red' : platform === 'hubook' ? 'blue' : platform === 'switter' ? 'blue' : 'orange'}-700 transition-colors flex items-center justify-center gap-2`}
                  >
                    <Plus className="w-5 h-5" />
                    Add Text Layer
                  </button>

                  {textLayers.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Type className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No text layers yet</p>
                      <p className="text-xs">Add text to customize your cover</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {textLayers.map((layer) => (
                      <div
                        key={layer.id}
                        onClick={() => setSelectedLayerId(layer.id)}
                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedLayerId === layer.id
                            ? 'bg-blue-50 border-2 border-blue-500'
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
                            deleteTextLayer(layer.id);
                          }}
                          className="p-1 hover:bg-red-100 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {selectedTextLayer && (
                    <div className="space-y-3 border-t border-gray-200 pt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Text</label>
                        <input
                          type="text"
                          value={selectedTextLayer.text}
                          onChange={(e) => updateTextLayer(selectedTextLayer.id, { text: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Font Family</label>
                        <select
                          value={selectedTextLayer.fontFamily}
                          onChange={(e) => updateTextLayer(selectedTextLayer.id, { fontFamily: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                            Size: {selectedTextLayer.fontSize}px
                          </label>
                          <input
                            type="range"
                            min="12"
                            max="120"
                            value={selectedTextLayer.fontSize}
                            onChange={(e) => updateTextLayer(selectedTextLayer.id, { fontSize: parseInt(e.target.value) })}
                            className="w-full"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Weight</label>
                          <select
                            value={selectedTextLayer.fontWeight}
                            onChange={(e) => updateTextLayer(selectedTextLayer.id, { fontWeight: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                        <input
                          type="color"
                          value={selectedTextLayer.color}
                          onChange={(e) => updateTextLayer(selectedTextLayer.id, { color: e.target.value })}
                          className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer"
                        />
                        <div className="grid grid-cols-6 gap-2 mt-2">
                          {presetColors.map((color) => (
                            <button
                              key={color}
                              onClick={() => updateTextLayer(selectedTextLayer.id, { color })}
                              className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400"
                              style={{ background: color }}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Alignment</label>
                        <div className="flex gap-2">
                          {(['left', 'center', 'right'] as const).map((align) => (
                            <button
                              key={align}
                              onClick={() => updateTextLayer(selectedTextLayer.id, { align })}
                              className={`flex-1 px-3 py-2 border rounded-lg transition-colors ${
                                selectedTextLayer.align === align
                                  ? 'bg-blue-600 text-white border-blue-600'
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
                          Vertical Position: {selectedTextLayer.y}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={selectedTextLayer.y}
                          onChange={(e) => updateTextLayer(selectedTextLayer.id, { y: parseInt(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
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
            className={`flex items-center gap-2 px-6 py-2 bg-${platform === 'hutube' ? 'red' : platform === 'hubook' ? 'blue' : platform === 'switter' ? 'blue' : 'orange'}-600 text-white rounded-lg hover:bg-${platform === 'hutube' ? 'red' : platform === 'hubook' ? 'blue' : platform === 'switter' ? 'blue' : 'orange'}-700 transition-colors disabled:opacity-50`}
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Design'}
          </button>
        </div>
      </div>
    </div>
  );
}
