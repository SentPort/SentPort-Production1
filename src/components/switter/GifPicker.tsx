import { useState, useEffect } from 'react';
import { Image, Search, X } from 'lucide-react';

interface GifPickerProps {
  onGifSelect: (gifUrl: string) => void;
}

const TRENDING_GIFS = [
  'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif',
  'https://media.giphy.com/media/3oz8xLd9DJq2l2VFtu/giphy.gif',
  'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif',
  'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
  'https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif',
  'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif',
  'https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif',
  'https://media.giphy.com/media/26u4lOMA8JKSnL9Uk/giphy.gif'
];

export default function GifPicker({ onGifSelect }: GifPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState(TRENDING_GIFS);

  useEffect(() => {
    if (searchQuery.trim()) {
      setGifs(TRENDING_GIFS.filter(() => Math.random() > 0.3));
    } else {
      setGifs(TRENDING_GIFS);
    }
  }, [searchQuery]);

  const handleSelect = (gifUrl: string) => {
    onGifSelect(gifUrl);
    setShowPicker(false);
    setSearchQuery('');
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className="p-2 hover:bg-blue-50 text-blue-500 rounded-full transition-colors"
        title="Add GIF"
      >
        <Image className="w-5 h-5" />
      </button>

      {showPicker && (
        <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-xl w-96 z-50">
          <div className="p-3 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold">Choose a GIF</h3>
              <button
                type="button"
                onClick={() => setShowPicker(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search GIFs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="p-3 grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
            {gifs.map((gif, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSelect(gif)}
                className="aspect-square rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
              >
                <img
                  src={gif}
                  alt="GIF"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>

          {gifs.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <p>No GIFs found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
