import React, { useState, useEffect } from 'react';

interface ColorPickerWithAlphaProps {
  value: string | null;
  onChange: (value: string | null) => void;
  label?: string;
}

export default function ColorPickerWithAlpha({
  value,
  onChange,
  label = 'Color',
}: ColorPickerWithAlphaProps) {
  const [hexColor, setHexColor] = useState('#000000');
  const [opacity, setOpacity] = useState(100);

  useEffect(() => {
    if (!value) {
      setOpacity(0);
      setHexColor('#000000');
      return;
    }

    const parsed = parseColor(value);
    setHexColor(parsed.hex);
    setOpacity(Math.round(parsed.alpha * 100));
  }, [value]);

  const parseColor = (color: string): { hex: string; alpha: number } => {
    if (color.startsWith('rgba')) {
      const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (match) {
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        const a = match[4] ? parseFloat(match[4]) : 1;
        const hex = `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
        return { hex, alpha: a };
      }
    }

    if (color.startsWith('rgb')) {
      const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        const hex = `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
        return { hex, alpha: 1 };
      }
    }

    if (color.startsWith('#')) {
      return { hex: color, alpha: 1 };
    }

    return { hex: '#000000', alpha: 1 };
  };

  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : null;
  };

  const handleColorChange = (newHex: string) => {
    setHexColor(newHex);
    updateColor(newHex, opacity);
  };

  const handleOpacityChange = (newOpacity: number) => {
    setOpacity(newOpacity);
    updateColor(hexColor, newOpacity);
  };

  const updateColor = (hex: string, opacityValue: number) => {
    if (opacityValue === 0) {
      onChange(null);
      return;
    }

    const rgb = hexToRgb(hex);
    if (!rgb) {
      onChange(null);
      return;
    }

    const alpha = opacityValue / 100;
    const rgba = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
    onChange(rgba);
  };

  const handleTransparentClick = () => {
    setOpacity(0);
    onChange(null);
  };

  const currentRgba = (() => {
    if (opacity === 0) return 'transparent';
    const rgb = hexToRgb(hexColor);
    if (!rgb) return 'transparent';
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity / 100})`;
  })();

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      <div className="flex items-center gap-3">
        <div className="relative w-12 h-12 rounded border-2 border-gray-300 overflow-hidden flex-shrink-0">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
              backgroundSize: '8px 8px',
              backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
            }}
          />
          <div
            className="absolute inset-0"
            style={{ backgroundColor: currentRgba }}
          />
        </div>

        <input
          type="color"
          value={hexColor}
          onChange={(e) => handleColorChange(e.target.value)}
          className="w-16 h-12 rounded border border-gray-300 cursor-pointer"
        />

        <input
          type="text"
          value={hexColor.toUpperCase()}
          onChange={(e) => {
            const val = e.target.value;
            if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
              setHexColor(val);
              if (val.length === 7) {
                updateColor(val, opacity);
              }
            }
          }}
          className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm font-mono"
          placeholder="#000000"
        />

        <button
          onClick={handleTransparentClick}
          className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded transition-colors"
          title="Set to transparent"
        >
          Clear
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Opacity</span>
          <span className="font-medium text-gray-900">{opacity}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={opacity}
          onChange={(e) => handleOpacityChange(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right, transparent 0%, ${hexColor} 100%)`,
          }}
        />
      </div>

      {opacity === 0 && (
        <p className="text-xs text-gray-500 italic">Background is fully transparent</p>
      )}
    </div>
  );
}
