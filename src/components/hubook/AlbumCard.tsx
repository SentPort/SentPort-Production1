import { useState } from 'react';
import { Image, Lock, Users, Globe, MoreVertical, Pencil, Trash2 } from 'lucide-react';

interface Album {
  id: string;
  album_name: string;
  description: string | null;
  privacy: string;
  cover_photo_url: string | null;
  created_at: string;
  media_count?: number;
}

interface AlbumCardProps {
  album: Album;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function AlbumCard({ album, onClick, onEdit, onDelete }: AlbumCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const getPrivacyIcon = () => {
    switch (album.privacy) {
      case 'private':
        return <Lock className="w-4 h-4" />;
      case 'friends':
        return <Users className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const getPrivacyLabel = () => {
    switch (album.privacy) {
      case 'private':
        return 'Private';
      case 'friends':
        return 'Friends';
      default:
        return 'Public';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
      <div
        onClick={onClick}
        className="relative aspect-square bg-gradient-to-br from-blue-100 to-purple-100 cursor-pointer overflow-hidden"
      >
        {album.cover_photo_url ? (
          <img
            src={album.cover_photo_url}
            alt={album.album_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Image className="w-16 h-16 text-gray-400" />
          </div>
        )}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-2">
          <div className="bg-black bg-opacity-60 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
            {getPrivacyIcon()}
            <span>{getPrivacyLabel()}</span>
          </div>

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1.5 bg-black bg-opacity-60 hover:bg-opacity-80 rounded-full transition-all"
            >
              <MoreVertical className="w-4 h-4 text-white" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onEdit();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit Album
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onDelete();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Album
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex-1 min-w-0">
          <h3
            onClick={onClick}
            className="font-semibold text-gray-900 truncate cursor-pointer hover:text-blue-600 transition-colors"
          >
            {album.album_name}
          </h3>
          {album.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{album.description}</p>
          )}
          <p className="text-xs text-gray-500 mt-2">
            {album.media_count || 0} {album.media_count === 1 ? 'item' : 'items'}
          </p>
        </div>
      </div>
    </div>
  );
}
