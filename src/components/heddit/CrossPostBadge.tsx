import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Share2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CrossPostBadgeProps {
  postId: string;
  currentSubredditName?: string;
}

interface CrossPostedSubreddit {
  id: string;
  name: string;
  display_name: string;
  is_primary: boolean;
}

export default function CrossPostBadge({ postId, currentSubredditName }: CrossPostBadgeProps) {
  const [crossPosts, setCrossPosts] = useState<CrossPostedSubreddit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCrossPosts();
  }, [postId]);

  const fetchCrossPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('heddit_post_subreddits')
        .select(`
          is_primary,
          heddit_subreddits (
            id,
            name,
            display_name
          )
        `)
        .eq('post_id', postId);

      if (!error && data && data.length > 1) {
        const subreddits = data.map(item => ({
          id: (item.heddit_subreddits as any).id,
          name: (item.heddit_subreddits as any).name,
          display_name: (item.heddit_subreddits as any).display_name,
          is_primary: item.is_primary
        }));
        setCrossPosts(subreddits);
      }
    } catch (error) {
      console.error('Error fetching cross-posts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || crossPosts.length <= 1) return null;

  const otherSubreddits = crossPosts.filter(sub => sub.name !== currentSubredditName);
  const primarySubreddit = crossPosts.find(sub => sub.is_primary);

  if (otherSubreddits.length === 0) return null;

  return (
    <div className="flex items-start gap-2 p-2.5 bg-blue-50 rounded-lg border border-blue-200 text-sm">
      <Share2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <span className="text-blue-800">
          Also posted in:{' '}
          {otherSubreddits.map((sub, index) => (
            <span key={sub.id}>
              <Link
                to={`/heddit/h/${sub.name}`}
                className="font-medium hover:underline"
              >
                h/{sub.name}
              </Link>
              {index < otherSubreddits.length - 1 && ', '}
            </span>
          ))}
        </span>
        {primarySubreddit && primarySubreddit.name !== currentSubredditName && (
          <div className="text-xs text-blue-600 mt-1">
            Originally posted in{' '}
            <Link
              to={`/heddit/h/${primarySubreddit.name}`}
              className="font-medium hover:underline"
            >
              h/{primarySubreddit.name}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
