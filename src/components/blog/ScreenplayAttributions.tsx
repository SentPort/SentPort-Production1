import { useState, useEffect } from 'react';
import { Sparkles, Film, BookOpen } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';

interface Attribution {
  id: string;
  attribution_note: string;
  inspired_by_post: {
    id: string;
    title: string;
    excerpt: string;
    account: {
      username: string;
      display_name: string;
      avatar_url: string;
    };
  };
}

interface ScreenplayAttributionsProps {
  postId: string;
  isScreenplay: boolean;
}

export default function ScreenplayAttributions({ postId, isScreenplay }: ScreenplayAttributionsProps) {
  const [inspirations, setInspirations] = useState<Attribution[]>([]);
  const [inspiredScreenplays, setInspiredScreenplays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isScreenplay) {
      loadInspirations();
    } else {
      loadInspiredScreenplays();
    }
  }, [postId, isScreenplay]);

  const loadInspirations = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_post_screenplay_inspirations')
        .select(`
          id,
          attribution_note,
          inspired_by_post:inspired_by_post_id (
            id,
            title,
            excerpt,
            content,
            account:account_id (
              username,
              display_name,
              avatar_url
            )
          )
        `)
        .eq('screenplay_post_id', postId);

      if (error) throw error;

      const formattedData = (data || []).map((item: any) => ({
        id: item.id,
        attribution_note: item.attribution_note,
        inspired_by_post: {
          ...item.inspired_by_post,
          excerpt: item.inspired_by_post.excerpt || item.inspired_by_post.content?.substring(0, 200) + '...'
        }
      }));

      setInspirations(formattedData);
    } catch (error) {
      console.error('Error loading screenplay inspirations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInspiredScreenplays = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_post_screenplay_inspirations')
        .select(`
          id,
          attribution_note,
          screenplay_post:screenplay_post_id (
            id,
            title,
            excerpt,
            content,
            account:account_id (
              username,
              display_name,
              avatar_url
            )
          )
        `)
        .eq('inspired_by_post_id', postId);

      if (error) throw error;

      const formattedData = (data || []).map((item: any) => ({
        id: item.id,
        attribution_note: item.attribution_note,
        screenplay: {
          ...item.screenplay_post,
          excerpt: item.screenplay_post.excerpt || item.screenplay_post.content?.substring(0, 200) + '...'
        }
      }));

      setInspiredScreenplays(formattedData);
    } catch (error) {
      console.error('Error loading inspired screenplays:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  if (isScreenplay && inspirations.length === 0) return null;
  if (!isScreenplay && inspiredScreenplays.length === 0) return null;

  return (
    <div className="space-y-6">
      {isScreenplay && inspirations.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-500 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-amber-900">
              Inspired By
            </h3>
          </div>

          <p className="text-sm text-amber-800 mb-4">
            This screenplay was inspired by {inspirations.length === 1 ? 'this story' : 'these stories'} on HuBlog:
          </p>

          <div className="space-y-3">
            {inspirations.map((inspiration) => (
              <Link
                key={inspiration.id}
                to={`/blog/post/${inspiration.inspired_by_post.id}`}
                className="block bg-white border border-amber-200 rounded-lg p-4 hover:border-amber-400 hover:shadow-md transition-all group"
              >
                <div className="flex items-start gap-3">
                  <BookOpen className="w-5 h-5 text-amber-600 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 mb-1 group-hover:text-amber-700 transition-colors">
                      {inspiration.inspired_by_post.title}
                    </h4>

                    {inspiration.attribution_note && (
                      <p className="text-sm text-amber-700 italic mb-2">
                        "{inspiration.attribution_note}"
                      </p>
                    )}

                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {inspiration.inspired_by_post.excerpt}
                    </p>

                    <div className="flex items-center gap-2">
                      {inspiration.inspired_by_post.account?.avatar_url ? (
                        <img
                          src={inspiration.inspired_by_post.account.avatar_url}
                          alt={inspiration.inspired_by_post.account.username}
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-white text-xs font-bold">
                          {inspiration.inspired_by_post.account?.display_name?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <span className="text-sm text-gray-600">
                        by <span className="font-medium">{inspiration.inspired_by_post.account?.display_name}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!isScreenplay && inspiredScreenplays.length > 0 && (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500 rounded-lg">
              <Film className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-purple-900">
              Inspired Screenplays
            </h3>
          </div>

          <p className="text-sm text-purple-800 mb-4">
            This story inspired {inspiredScreenplays.length === 1 ? 'this screenplay' : 'these screenplays'}:
          </p>

          <div className="space-y-3">
            {inspiredScreenplays.map((item) => (
              <Link
                key={item.id}
                to={`/blog/post/${item.screenplay.id}`}
                className="block bg-white border border-purple-200 rounded-lg p-4 hover:border-purple-400 hover:shadow-md transition-all group"
              >
                <div className="flex items-start gap-3">
                  <Film className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 mb-1 group-hover:text-purple-700 transition-colors">
                      {item.screenplay.title}
                    </h4>

                    {item.attribution_note && (
                      <p className="text-sm text-purple-700 italic mb-2">
                        "{item.attribution_note}"
                      </p>
                    )}

                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {item.screenplay.excerpt}
                    </p>

                    <div className="flex items-center gap-2">
                      {item.screenplay.account?.avatar_url ? (
                        <img
                          src={item.screenplay.account.avatar_url}
                          alt={item.screenplay.account.username}
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold">
                          {item.screenplay.account?.display_name?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <span className="text-sm text-gray-600">
                        by <span className="font-medium">{item.screenplay.account?.display_name}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
