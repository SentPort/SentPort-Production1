import React, { useState } from 'react';
import { SubdomainPage } from '../../types/builder';
import { X, Plus, FileText, Home, CheckCircle, Circle, Trash2 } from 'lucide-react';

interface PageManagerModalProps {
  pages: SubdomainPage[];
  currentPageId: string;
  subdomainId: string;
  onClose: () => void;
  onSwitchPage: (pageId: string) => void;
  onCreatePage: (pageData: { path: string; title: string; type: string }) => void;
  onDeletePage: (pageId: string) => void;
}

export default function PageManagerModal({
  pages,
  currentPageId,
  onClose,
  onSwitchPage,
  onCreatePage,
  onDeletePage,
}: PageManagerModalProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPage, setNewPage] = useState({
    path: '',
    title: '',
    type: 'content_page',
  });
  const [pageToDelete, setPageToDelete] = useState<SubdomainPage | null>(null);

  const handleCreate = () => {
    if (!newPage.path || !newPage.title) {
      alert('Please fill in all fields');
      return;
    }

    if (!newPage.path.startsWith('/')) {
      setNewPage(prev => ({ ...prev, path: '/' + prev.path }));
    }

    onCreatePage(newPage);
    setShowCreateForm(false);
    setNewPage({ path: '', title: '', type: 'content_page' });
  };

  const handleDeleteClick = (e: React.MouseEvent, page: SubdomainPage) => {
    e.stopPropagation();

    if (page.is_homepage) {
      alert('Cannot delete the homepage. Please set another page as homepage first.');
      return;
    }

    if (pages.length === 1) {
      alert('Cannot delete the last remaining page.');
      return;
    }

    setPageToDelete(page);
  };

  const confirmDelete = () => {
    if (pageToDelete) {
      onDeletePage(pageToDelete.id);
      setPageToDelete(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Manage Pages</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!showCreateForm ? (
            <div className="space-y-3">
              {pages.map(page => (
                <div
                  key={page.id}
                  className={`p-4 rounded-lg border-2 transition-all cursor-pointer relative group ${
                    page.id === currentPageId
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                  onClick={() => {
                    onSwitchPage(page.id);
                    onClose();
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {page.is_homepage ? (
                        <Home className="w-5 h-5 text-blue-600 mt-1" />
                      ) : (
                        <FileText className="w-5 h-5 text-gray-400 mt-1" />
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {page.page_title}
                          {page.is_homepage && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              Homepage
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">{page.page_path}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              page.is_published
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {page.is_published ? 'Published' : 'Draft'}
                          </span>
                          {page.has_unpublished_changes && (
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                              Unpublished Changes
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {page.is_published ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-300" />
                      )}
                      {!page.is_homepage && pages.length > 1 && (
                        <button
                          onClick={(e) => handleDeleteClick(e, page)}
                          className="p-2 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete page"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Create New Page</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Page Title
                </label>
                <input
                  type="text"
                  value={newPage.title}
                  onChange={e => setNewPage(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="About Us"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Page Path (URL)
                </label>
                <div className="flex items-center">
                  <span className="text-gray-500 mr-2">/</span>
                  <input
                    type="text"
                    value={newPage.path.replace('/', '')}
                    onChange={e =>
                      setNewPage(prev => ({ ...prev, path: '/' + e.target.value.replace('/', '') }))
                    }
                    placeholder="about"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Example: /about, /contact, /services
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Page Type
                </label>
                <select
                  value={newPage.type}
                  onChange={e => setNewPage(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="content_page">Content Page</option>
                  <option value="blog_post">Blog Post</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCreate}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Page
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {!showCreateForm && (
          <div className="p-6 border-t border-gray-200">
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Create New Page
            </button>
          </div>
        )}
      </div>

      {pageToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Delete Page?</h3>
            <p className="text-gray-600 mb-2">
              Are you sure you want to delete <span className="font-semibold">{pageToDelete.page_title}</span>?
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Path: {pageToDelete.page_path}
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-red-800 font-medium mb-1">Warning:</p>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• All page content will be permanently deleted</li>
                {pageToDelete.is_published && <li>• Published content will be removed from the live site</li>}
                {pageToDelete.has_unpublished_changes && <li>• Unsaved changes will be lost</li>}
                <li>• This action cannot be undone</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setPageToDelete(null)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
