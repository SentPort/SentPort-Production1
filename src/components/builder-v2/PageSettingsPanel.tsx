import React, { useState } from 'react';
import { PageBackgroundSettings } from '../../types/builder';
import { X, Upload, Trash2, Image as ImageIcon, RotateCcw } from 'lucide-react';
import MediaManager from './MediaManager';

interface PageSettingsPanelProps {
  backgroundImageUrl?: string;
  backgroundSettings?: PageBackgroundSettings;
  onUpdateBackground: (url: string | undefined, settings: PageBackgroundSettings) => void;
  onClose: () => void;
  subdomain: string;
  onResetPreferences?: () => void;
}

const defaultSettings: PageBackgroundSettings = {
  position: 'center',
  size: 'cover',
  repeat: 'no-repeat',
  attachment: 'scroll',
  opacity: 1,
  overlay_opacity: 0,
};

export default function PageSettingsPanel({
  backgroundImageUrl,
  backgroundSettings = defaultSettings,
  onUpdateBackground,
  onClose,
  subdomain,
  onResetPreferences,
}: PageSettingsPanelProps) {
  const [showMediaManager, setShowMediaManager] = useState(false);
  const [localUrl, setLocalUrl] = useState(backgroundImageUrl);
  const [localSettings, setLocalSettings] = useState<PageBackgroundSettings>(backgroundSettings);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleSelectImage = (url: string, type: 'image' | 'video') => {
    setLocalUrl(url);
    onUpdateBackground(url, localSettings);
    setShowMediaManager(false);
  };

  const handleRemoveBackground = () => {
    setLocalUrl(undefined);
    onUpdateBackground(undefined, defaultSettings);
  };

  const handleSettingChange = (key: keyof PageBackgroundSettings, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onUpdateBackground(localUrl, newSettings);
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Page Settings</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Page Background</h3>
          <p className="text-xs text-gray-600 mb-4">
            Set a background image that appears behind all sections and blocks on this page.
          </p>

          {localUrl ? (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden border border-gray-200">
                <img
                  src={localUrl}
                  alt="Page background"
                  className="w-full h-32 object-cover"
                />
                <button
                  onClick={handleRemoveBackground}
                  className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Background Size
                </label>
                <select
                  value={localSettings.size}
                  onChange={(e) => handleSettingChange('size', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="cover">Cover (Fill)</option>
                  <option value="contain">Contain (Fit)</option>
                  <option value="auto">Auto (Original Size)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Background Position
                </label>
                <select
                  value={localSettings.position}
                  onChange={(e) => handleSettingChange('position', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="center">Center</option>
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                  <option value="top left">Top Left</option>
                  <option value="top right">Top Right</option>
                  <option value="bottom left">Bottom Left</option>
                  <option value="bottom right">Bottom Right</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Background Repeat
                </label>
                <select
                  value={localSettings.repeat}
                  onChange={(e) => handleSettingChange('repeat', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="no-repeat">No Repeat</option>
                  <option value="repeat">Repeat</option>
                  <option value="repeat-x">Repeat Horizontally</option>
                  <option value="repeat-y">Repeat Vertically</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Scroll Behavior
                </label>
                <select
                  value={localSettings.attachment}
                  onChange={(e) => handleSettingChange('attachment', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="scroll">Scroll with Page</option>
                  <option value="fixed">Fixed (Parallax)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Background Opacity: {Math.round(localSettings.opacity * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={localSettings.opacity}
                  onChange={(e) => handleSettingChange('opacity', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Overlay Color (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={localSettings.overlay_color || '#000000'}
                    onChange={(e) => handleSettingChange('overlay_color', e.target.value)}
                    className="h-10 w-16 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={localSettings.overlay_color || ''}
                    onChange={(e) => handleSettingChange('overlay_color', e.target.value)}
                    placeholder="#000000"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {localSettings.overlay_color && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Overlay Opacity: {Math.round(localSettings.overlay_opacity * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={localSettings.overlay_opacity}
                    onChange={(e) => handleSettingChange('overlay_opacity', parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}

              <button
                onClick={() => setShowMediaManager(true)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Change Image
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowMediaManager(true)}
              className="w-full p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <ImageIcon className="w-6 h-6 text-gray-400 group-hover:text-blue-600" />
                </div>
                <p className="text-sm font-medium text-gray-700">Add Background Image</p>
                <p className="text-xs text-gray-500">Choose from your media library</p>
              </div>
            </button>
          )}
        </div>

        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-xs font-semibold text-gray-700 mb-2">Tips</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Use high-resolution images for best quality</li>
            <li>• Cover mode fills the entire background</li>
            <li>• Fixed mode creates a parallax effect</li>
            <li>• Add an overlay to improve text readability</li>
          </ul>
        </div>

        {onResetPreferences && (
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Builder Preferences</h3>
            <p className="text-xs text-gray-600 mb-4">
              Reset all your saved builder settings for this project to default values.
            </p>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Builder Settings
            </button>
          </div>
        )}
      </div>

      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Reset Builder Settings?</h3>
            <p className="text-sm text-gray-600 mb-6">
              This will reset all your saved preferences for this project, including:
            </p>
            <ul className="text-sm text-gray-600 mb-6 space-y-1 pl-4">
              <li>• Grid visibility settings</li>
              <li>• Device preview mode</li>
              <li>• Panel visibility preferences</li>
            </ul>
            <p className="text-sm text-gray-600 mb-6">
              Your page content will not be affected. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onResetPreferences?.();
                  setShowResetConfirm(false);
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Reset Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {showMediaManager && (
        <MediaManager
          isOpen={showMediaManager}
          subdomain={subdomain}
          onSelectMedia={handleSelectImage}
          onClose={() => setShowMediaManager(false)}
          acceptedTypes="image"
        />
      )}
    </div>
  );
}
