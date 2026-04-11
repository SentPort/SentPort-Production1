import React, { useState } from 'react';
import { Plus, RotateCcw, Save, Globe, GlobeLock, Layers, Copy, ChevronDown, Monitor, Tablet, Smartphone } from 'lucide-react';
import { DeviceBreakpoint } from '../../types/builder';

interface BuilderMobileBottomNavProps {
  currentDevice: DeviceBreakpoint;
  onAddSection: () => void;
  onAddBlock: () => void;
  canAddBlock: boolean;
  onCopyMobileToDevice?: (targetDevice: DeviceBreakpoint) => void;
  onCopyMobileView?: () => void;
  onResetView: () => void;
  onSaveAll: () => void;
  saving: boolean;
  lastSaved: Date | null;
  publishAction: 'publishAll' | 'unpublishAll' | 'publishPage' | 'unpublishPage' | 'publishEdit' | null;
  onPublishClick: () => void;
  currentPageData: {
    is_homepage?: boolean;
    is_published?: boolean;
    has_unpublished_changes?: boolean;
  } | null;
}

export default function BuilderMobileBottomNav({
  currentDevice,
  onAddSection,
  onAddBlock,
  canAddBlock,
  onCopyMobileToDevice,
  onCopyMobileView,
  onResetView,
  onSaveAll,
  saving,
  lastSaved,
  publishAction,
  onPublishClick,
  currentPageData,
}: BuilderMobileBottomNavProps) {
  const [showCopyPicker, setShowCopyPicker] = useState(false);

  const getCopyLabel = () => {
    if (currentDevice === 'mobile') return 'Copy to...';
    return 'Copy Mobile';
  };

  const handleCopyPress = () => {
    if (currentDevice === 'mobile') {
      setShowCopyPicker(true);
    } else {
      onCopyMobileView?.();
    }
  };

  const getPublishButton = () => {
    if (!publishAction) return null;

    const configs = {
      publishAll: { label: 'Publish All', color: 'bg-green-600 hover:bg-green-700', icon: <Globe className="w-4 h-4" /> },
      unpublishAll: { label: 'Unpublish All', color: 'bg-orange-600 hover:bg-orange-700', icon: <GlobeLock className="w-4 h-4" /> },
      publishPage: { label: 'Publish Page', color: 'bg-blue-600 hover:bg-blue-700', icon: <Globe className="w-4 h-4" /> },
      unpublishPage: { label: 'Unpublish', color: 'bg-orange-600 hover:bg-orange-700', icon: <GlobeLock className="w-4 h-4" /> },
      publishEdit: { label: 'Publish Edits', color: 'bg-orange-600 hover:bg-orange-700', icon: <Globe className="w-4 h-4" /> },
    };

    const config = configs[publishAction];
    return (
      <button
        onClick={onPublishClick}
        className={`flex items-center gap-1.5 px-3 py-2 ${config.color} text-white rounded-lg text-sm font-medium transition-colors touch-manipulation`}
      >
        {config.icon}
        <span>{config.label}</span>
      </button>
    );
  };

  return (
    <>
      {showCopyPicker && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-50 md:hidden"
          onClick={() => setShowCopyPicker(false)}
        >
          <div
            className="absolute bottom-32 left-4 right-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">Copy Mobile View To</p>
              <p className="text-xs text-gray-500 mt-0.5">Apply your mobile layout to another device</p>
            </div>
            <div className="p-2">
              <button
                onClick={() => {
                  onCopyMobileToDevice?.('tablet');
                  setShowCopyPicker(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl transition-colors touch-manipulation"
              >
                <Tablet className="w-5 h-5 text-gray-600" />
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">Copy to Tablet</p>
                  <p className="text-xs text-gray-500">Apply mobile layout to tablet view</p>
                </div>
              </button>
              <button
                onClick={() => {
                  onCopyMobileToDevice?.('desktop');
                  setShowCopyPicker(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl transition-colors touch-manipulation"
              >
                <Monitor className="w-5 h-5 text-gray-600" />
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">Copy to Desktop</p>
                  <p className="text-xs text-gray-500">Apply mobile layout to desktop view</p>
                </div>
              </button>
            </div>
            <div className="p-3 border-t border-gray-100">
              <button
                onClick={() => setShowCopyPicker(false)}
                className="w-full py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors touch-manipulation"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-xl z-40"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex justify-around items-center h-14 px-2 border-b border-gray-100">
          <button
            onClick={onAddSection}
            className="relative flex flex-col items-center justify-center flex-1 h-full px-1 transition-colors touch-manipulation text-gray-600 active:text-blue-500"
          >
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Plus className="w-5 h-5 text-blue-600 stroke-2" />
            </div>
            <span className="text-xs mt-0.5 font-medium">Section</span>
          </button>

          <button
            onClick={onAddBlock}
            disabled={!canAddBlock}
            className={`relative flex flex-col items-center justify-center flex-1 h-full px-1 transition-colors touch-manipulation ${
              canAddBlock ? 'text-gray-600 active:text-blue-500' : 'text-gray-300'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${canAddBlock ? 'bg-blue-50' : 'bg-gray-50'}`}>
              <Layers className={`w-5 h-5 stroke-2 ${canAddBlock ? 'text-blue-600' : 'text-gray-300'}`} />
            </div>
            <span className="text-xs mt-0.5 font-medium">Block</span>
          </button>

          <button
            onClick={handleCopyPress}
            className="relative flex flex-col items-center justify-center flex-1 h-full px-1 transition-colors touch-manipulation text-gray-600 active:text-blue-500"
          >
            <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
              <Copy className="w-5 h-5 text-gray-600 stroke-2" />
            </div>
            <span className="text-xs mt-0.5 font-medium">{getCopyLabel()}</span>
          </button>

          <button
            onClick={onResetView}
            className="relative flex flex-col items-center justify-center flex-1 h-full px-1 transition-colors touch-manipulation text-gray-600 active:text-red-500"
          >
            <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-gray-600 stroke-2" />
            </div>
            <span className="text-xs mt-0.5 font-medium">Reset</span>
          </button>
        </div>

        <div className="flex items-center justify-between h-11 px-3 gap-2">
          <div className="flex-1 min-w-0">
            {saving ? (
              <span className="text-xs text-blue-600 flex items-center gap-1">
                <svg className="animate-spin h-3 w-3 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : lastSaved ? (
              <span className="text-xs text-gray-500 truncate block">
                Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            ) : (
              <span className="text-xs text-gray-400">Not saved yet</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onSaveAll}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 touch-manipulation"
            >
              <Save className="w-4 h-4" />
              <span>Save</span>
            </button>
            {getPublishButton()}
          </div>
        </div>
      </nav>
    </>
  );
}
