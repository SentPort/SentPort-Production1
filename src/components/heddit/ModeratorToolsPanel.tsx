import { useState } from 'react';
import { Shield, Settings, Users, AlertCircle, Trash2 } from 'lucide-react';

interface ModeratorToolsPanelProps {
  communityId: string;
  communityName: string;
  permissions: {
    pin_posts: boolean;
    delete_posts: boolean;
    edit_community: boolean;
    manage_moderators: boolean;
    delete_community?: boolean;
  };
  onEditCommunity: () => void;
  onManageModerators: () => void;
  onDeleteCommunity: () => void;
}

export default function ModeratorToolsPanel({
  communityId,
  communityName,
  permissions,
  onEditCommunity,
  onManageModerators,
  onDeleteCommunity
}: ModeratorToolsPanelProps) {
  return (
    <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-orange-600" />
        <h3 className="font-bold text-orange-900">Moderator Tools</h3>
      </div>

      <div className="space-y-2">
        {permissions.edit_community && (
          <button
            onClick={onEditCommunity}
            className="w-full flex items-center gap-2 px-4 py-2 bg-white border border-orange-300 rounded-lg hover:bg-orange-50 transition-colors text-left"
          >
            <Settings size={18} className="text-orange-600" />
            <span className="text-sm font-medium text-gray-900">Edit Community</span>
          </button>
        )}

        {permissions.manage_moderators && (
          <button
            onClick={onManageModerators}
            className="w-full flex items-center gap-2 px-4 py-2 bg-white border border-orange-300 rounded-lg hover:bg-orange-50 transition-colors text-left"
          >
            <Users size={18} className="text-orange-600" />
            <span className="text-sm font-medium text-gray-900">Manage Moderators</span>
          </button>
        )}

        {permissions.delete_community && (
          <button
            onClick={onDeleteCommunity}
            className="w-full flex items-center gap-2 px-4 py-2 bg-red-50 border-2 border-red-300 rounded-lg hover:bg-red-100 transition-colors text-left"
          >
            <Trash2 size={18} className="text-red-600" />
            <span className="text-sm font-medium text-red-700">Delete Community</span>
          </button>
        )}

        <div className="pt-2 border-t border-orange-200">
          <div className="flex items-start gap-2 text-xs text-orange-800">
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
            <p>
              You have moderator permissions for h/{communityName}
            </p>
          </div>
        </div>

        <div className="text-xs text-orange-700 space-y-1">
          <p className="font-semibold">Your permissions:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            {permissions.pin_posts && <li>Pin posts</li>}
            {permissions.delete_posts && <li>Delete posts</li>}
            {permissions.edit_community && <li>Edit community settings</li>}
            {permissions.manage_moderators && <li>Manage moderators</li>}
            {permissions.delete_community && <li className="text-red-600 font-medium">Delete community</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
