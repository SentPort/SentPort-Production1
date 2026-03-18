import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface StoryViewerProps {
  accountId: string;
  onClose: () => void;
}

export default function StoryViewer({ accountId, onClose }: StoryViewerProps) {
  const { user } = useAuth();
  const [stories, setStories] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [account, setAccount] = useState<any>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetchStories();
  }, [accountId]);

  useEffect(() => {
    if (stories.length === 0) return;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          nextStory();
          return 0;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [currentIndex, stories]);

  useEffect(() => {
    if (stories[currentIndex]) {
      recordView(stories[currentIndex].id);
    }
  }, [currentIndex, stories]);

  const fetchStories = async () => {
    const { data: storiesData } = await supabase
      .from('hinsta_stories')
      .select('*, account:hinsta_accounts(*)')
      .eq('account_id', accountId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true });

    if (storiesData && storiesData.length > 0) {
      setStories(storiesData);
      setAccount(storiesData[0].account);
    } else {
      onClose();
    }
  };

  const recordView = async (storyId: string) => {
    if (!user) return;

    const { data: myAccount } = await supabase
      .from('hinsta_accounts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!myAccount) return;

    await supabase
      .from('hinsta_story_views')
      .insert({
        story_id: storyId,
        viewer_id: myAccount.id
      })
      .then(() => {})
      .catch(() => {});
  };

  const nextStory = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const prevStory = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    if (x < width / 2) {
      prevStory();
    } else {
      nextStory();
    }
  };

  if (!stories[currentIndex]) return null;

  const currentStory = stories[currentIndex];

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <div className="relative w-full max-w-md h-full bg-black">
        <div className="absolute top-0 left-0 right-0 z-10 p-2">
          <div className="flex gap-1 mb-3">
            {stories.map((_, index) => (
              <div key={index} className="flex-1 h-1 bg-white bg-opacity-30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-100"
                  style={{
                    width: index < currentIndex ? '100%' : index === currentIndex ? `${progress}%` : '0%'
                  }}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-0.5">
                <div className="w-full h-full rounded-full bg-white p-0.5">
                  {account?.avatar_url ? (
                    <img src={account.avatar_url} alt={account.username} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold">
                      {account?.username?.[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{account?.username}</p>
                <p className="text-white text-opacity-70 text-xs">
                  {new Date(currentStory.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            <button onClick={onClose} className="text-white hover:opacity-70">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="w-full h-full flex items-center justify-center" onClick={handleClick}>
          <img
            src={currentStory.media_url}
            alt="Story"
            className="max-w-full max-h-full object-contain"
          />
          {currentStory.text_overlay && (
            <div className="absolute bottom-20 left-0 right-0 text-center">
              <p className="text-white text-2xl font-bold px-4 py-2 bg-black bg-opacity-50 inline-block rounded-lg">
                {currentStory.text_overlay}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={prevStory}
          className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:opacity-70"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
        <button
          onClick={nextStory}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:opacity-70"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      </div>
    </div>
  );
}
