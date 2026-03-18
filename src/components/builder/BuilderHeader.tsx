import React from 'react';
import { Subdomain, SubdomainPage } from '../../types/builder';
import { Save, Eye, Upload, Monitor, Tablet, Smartphone, FileText, X, Undo, Redo } from 'lucide-react';

interface BuilderHeaderProps {
  subdomain: Subdomain;
  currentPage: SubdomainPage;
  viewMode: 'desktop' | 'tablet' | 'mobile';
  isDirty: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onSave: () => void;
  onPublish: () => void;
  onPreview: () => void;
  onViewModeChange: (mode: 'desktop' | 'tablet' | 'mobile') => void;
  onOpenPageManager: () => void;
  onExit: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

export default function BuilderHeader({
  subdomain,
  currentPage,
  viewMode,
  isDirty,
  canUndo = false,
  canRedo = false,
  onSave,
  onPublish,
  onPreview,
  onViewModeChange,
  onOpenPageManager,
  onExit,
  onUndo,
  onRedo,
}: BuilderHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-3 md:px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2 md:gap-6">
        <button
          onClick={onExit}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Exit Builder"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        <div className="hidden sm:block">
          <h1 className="text-lg font-semibold text-gray-900">
            {subdomain.subdomain}.sentport.com
          </h1>
          <p className="text-sm text-gray-600">
            Editing: {currentPage.page_title}
            {currentPage.has_unpublished_changes && (
              <span className="ml-2 text-orange-600 font-medium">• Unpublished changes</span>
            )}
          </p>
        </div>
        <div className="sm:hidden">
          <h1 className="text-sm font-semibold text-gray-900">
            {currentPage.page_title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-2 rounded transition-colors ${
              canUndo
                ? 'text-gray-700 hover:bg-white hover:shadow-sm'
                : 'text-gray-400 cursor-not-allowed'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-2 rounded transition-colors ${
              canRedo
                ? 'text-gray-700 hover:bg-white hover:shadow-sm'
                : 'text-gray-400 cursor-not-allowed'
            }`}
            title="Redo (Ctrl+Y)"
          >
            <Redo className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={onOpenPageManager}
          className="flex items-center gap-2 px-3 md:px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <FileText className="w-4 h-4" />
          <span className="text-sm font-medium hidden sm:inline">Pages</span>
        </button>

        <div className="hidden md:flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => onViewModeChange('desktop')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'desktop'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            title="Desktop View"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange('tablet')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'tablet'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            title="Tablet View"
          >
            <Tablet className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange('mobile')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'mobile'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            title="Mobile View"
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>

        {viewMode === 'desktop' && (
          <button
            onClick={onPreview}
            className="hidden sm:flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span className="text-sm font-medium">Preview</span>
          </button>
        )}

        <button
          onClick={onSave}
          disabled={!isDirty}
          className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg transition-colors ${
            isDirty
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Save className="w-4 h-4" />
          <span className="text-sm font-medium hidden sm:inline">
            {isDirty ? 'Save Changes' : 'Saved'}
          </span>
        </button>

        <button
          onClick={onPublish}
          className="flex items-center gap-2 px-3 md:px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          <Upload className="w-4 h-4" />
          <span className="text-sm hidden sm:inline">Publish</span>
        </button>
      </div>
    </header>
  );
}
