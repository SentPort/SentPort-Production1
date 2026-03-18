import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import CreateStory from './CreateStory';
import StoryViewer from './StoryViewer';

export default function StoriesBar() {
  const { user } = useAuth();
  const [stories, setStories] = useState<any[]>([]);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [selectedStoryAccount, setSelectedStoryAccount] = useState<string | null>(null);
  const [myAccount, setMyAccount] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchMyAccount();
    }
  }, [user]);

  useEffect(() => {
    if (myAccount) {
      fetchStories();
    }
  }, [myAccount]);

  const fetchMyAccount = async () => {
    const { data } = await supabase
      .from('hinsta_accounts')
      .select('*')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (data) setMyAccount(data);
  };

  const fetchStories = async () => {
    if (!myAccount?.id) return;

    const { data: followsData } = await supabase
      .from('hinsta_follows')
      .select('following_id')
      .eq('follower_id', myAccount.id);

    const followingIds = followsData?.map(f => f.following_id) || [];

    if (myAccount) {
      followingIds.push(myAccount.id);
    }

    if (followingIds.length === 0) return;

    const { data: storiesData } = await supabase
      .from('hinsta_stories')
      .select(`
        *,
        account:hinsta_accounts(*)
      `)
      .in('account_id', followingIds)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (storiesData) {
      const groupedByAccount = storiesData.reduce((acc: any, story: any) => {
        const accountId = story.account_id;
        if (!acc[accountId]) {
          acc[accountId] = {
            account: story.account,
            stories: [],
            hasUnviewed: false
          };
        }
        acc[accountId].stories.push(story);
        return acc;
      }, {});

      const storiesArray = Object.values(groupedByAccount);
      setStories(storiesArray as any);
    }
  };

  const handleStoryClick = (accountId: string) => {
    setSelectedStoryAccount(accountId);
  };

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setShowCreateStory(true)}
            className="flex flex-col items-center gap-2 flex-shrink-0"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center relative">
              {myAccount?.avatar_url ? (
                <img src={myAccount.avatar_url} alt="Your story" className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold text-lg">
                  {myAccount?.username?.[0]?.toUpperCase() || 'Y'}
                </div>
              )}
              <div className="absolute bottom-0 right-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white">
                <Plus className="w-3 h-3 text-white" />
              </div>
            </div>
            <span className="text-xs text-gray-900 font-medium">Your Story</span>
          </button>

          {stories.map((item: any) => (
            <button
              key={item.account.id}
              onClick={() => handleStoryClick(item.account.id)}
              className="flex flex-col items-center gap-2 flex-shrink-0"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-0.5">
                <div className="w-full h-full rounded-full bg-white p-0.5">
                  {item.account.avatar_url ? (
                    <img src={item.account.avatar_url} alt={item.account.username} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold text-lg">
                      {item.account.username[0].toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <span className="text-xs text-gray-900 font-medium truncate w-16 text-center">
                {item.account.username}
              </span>
            </button>
          ))}
        </div>
      </div>

      {showCreateStory && (
        <CreateStory
          onClose={() => setShowCreateStory(false)}
          onCreated={() => {
            setShowCreateStory(false);
            fetchStories();
          }}
        />
      )}

      {selectedStoryAccount && (
        <StoryViewer
          accountId={selectedStoryAccount}
          onClose={() => setSelectedStoryAccount(null)}
        />
      )}
    </>
  );
}
