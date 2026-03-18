import React, { useState } from 'react';
import { X, Crop, ZoomIn, ZoomOut, RotateCw, Check } from 'lucide-react';

interface ImageEditorProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  onSave: (adjustments: ImageAdjustments) => void;
}

export interface ImageAdjustments {
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  width?: string;
  height?: string;
  objectPosition?: string;
}

export default function ImageEditor({ isOpen, imageUrl, onClose, onSave }: ImageEditorProps) {
  const [objectFit, setObjectFit] = useState<'cover' | 'contain' | 'fill' | 'none'>('cover');
  const [width, setWidth] = useState('100%');
  const [height, setHeight] = useState('auto');
  const [objectPosition, setObjectPosition] = useState('center');

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      objectFit,
      width,
      height,
      objectPosition,
    });
    onClose();
  };

  const positions = [
    { value: 'top left', label: 'Top Left' },
    { value: 'top', label: 'Top' },
    { value: 'top right', label: 'Top Right' },
    { value: 'left', label: 'Left' },
    { value: 'center', label: 'Center' },
    { value: 'right', label: 'Right' },
    { value: 'bottom left', label: 'Bottom Left' },
    { value: 'bottom', label: 'Bottom' },
    { value: 'bottom right', label: 'Bottom Right' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Image Settings</h2>
            <p className="text-sm text-gray-500 mt-1">Adjust how your image appears</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 flex gap-6">
          <div className="flex-1 bg-gray-100 rounded-lg flex items-center justify-center p-8">
            <div
              className="bg-white border-2 border-gray-300 rounded-lg overflow-hidden"
              style={{
                width: '600px',
                height: '400px',
              }}
            >
              <img
                src={imageUrl}
                alt="Preview"
                style={{
                  width,
                  height,
                  objectFit,
                  objectPosition,
                }}
                className="w-full h-full"
              />
            </div>
          </div>

          <div className="w-80 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Display Mode</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'cover', label: 'Cover', icon: <Crop /> },
                  { value: 'contain', label: 'Contain', icon: <ZoomOut /> },
                  { value: 'fill', label: 'Fill', icon: <ZoomIn /> },
                  { value: 'none', label: 'Original', icon: <RotateCw /> },
                ].map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => setObjectFit(mode.value as any)}
                    className={`p-3 border-2 rounded-lg transition-all flex flex-col items-center gap-1 ${
                      objectFit === mode.value
                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="w-5 h-5">{mode.icon}</div>
                    <span className="text-xs font-medium">{mode.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Focal Point
              </label>
              <div className="grid grid-cols-3 gap-2">
                {positions.map((pos) => (
                  <button
                    key={pos.value}
                    onClick={() => setObjectPosition(pos.value)}
                    className={`p-2 border-2 rounded-lg transition-all text-xs ${
                      objectPosition === pos.value
                        ? 'border-blue-500 bg-blue-50 text-blue-600 font-medium'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Width</label>
              <select
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="100%">Full Width (100%)</option>
                <option value="75%">75%</option>
                <option value="50%">50%</option>
                <option value="auto">Auto</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Height</label>
              <select
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="auto">Auto</option>
                <option value="200px">Small (200px)</option>
                <option value="400px">Medium (400px)</option>
                <option value="600px">Large (600px)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Check className="w-5 h-5" />
            <span>Apply Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
