import { useState, useEffect } from 'react';
import { Heart, Sparkles, Lightbulb, ThumbsUp, Brain, HandHelping, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface ReactionButtonProps {
  postId: string;
  initialCounts?: {
    like: number;
    love: number;
    insightful: number;
    inspiring: number;
    thoughtful: number;
    helpful: number;
    mindblown: number;
  };
  onReactionChange?: () => void;
  variant?: 'default' | 'compact';
}

type ReactionType = 'like' | 'love' | 'insightful' | 'inspiring' | 'thoughtful' | 'helpful' | 'mindblown';

const reactionConfig = {
  like: {
    icon: ThumbsUp,
    label: 'Like',
    color: 'text-blue-500',
    hoverColor: 'hover:bg-blue-50',
    activeColor: 'bg-blue-100'
  },
  love: {
    icon: Heart,
    label: 'Love',
    color: 'text-red-500',
    hoverColor: 'hover:bg-red-50',
    activeColor: 'bg-red-100'
  },
  insightful: {
    icon: Lightbulb,
    label: 'Insightful',
    color: 'text-yellow-500',
    hoverColor: 'hover:bg-yellow-50',
    activeColor: 'bg-yellow-100'
  },
  inspiring: {
    icon: Sparkles,
    label: 'Inspiring',
    color: 'text-pink-500',
    hoverColor: 'hover:bg-pink-50',
    activeColor: 'bg-pink-100'
  },
  thoughtful: {
    icon: Brain,
    label: 'Thoughtful',
    color: 'text-teal-600',
    hoverColor: 'hover:bg-teal-50',
    activeColor: 'bg-teal-100'
  },
  helpful: {
    icon: HandHelping,
    label: 'Helpful',
    color: 'text-green-600',
    hoverColor: 'hover:bg-green-50',
    activeColor: 'bg-green-100'
  },
  mindblown: {
    icon: Zap,
    label: 'Mind-blown',
    color: 'text-orange-500',
    hoverColor: 'hover:bg-orange-50',
    activeColor: 'bg-orange-100'
  }
};

export default function ReactionButton({
  postId,
  initialCounts,
  onReactionChange,
  variant = 'default'
}: ReactionButtonProps) {
  const { user } = useAuth();
  const [counts, setCounts] = useState(initialCounts || { like: 0, love: 0, insightful: 0, inspiring: 0, thoughtful: 0, helpful: 0, mindblown: 0 });
  const [myReaction, setMyReaction] = useState<ReactionType | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [myBlogAccountId, setMyBlogAccountId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadReactionData();
    }
  }, [user, postId]);

  const loadReactionData = async () => {
    if (!user) return;

    try {
      const { data: myAccount } = await supabase
        .from('blog_accounts')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!myAccount) return;
      setMyBlogAccountId(myAccount.id);

      const [reactionData, countsData] = await Promise.all([
        supabase
          .from('blog_reactions')
          .select('reaction_type')
          .eq('post_id', postId)
          .eq('account_id', myAccount.id)
          .maybeSingle(),
        supabase
          .from('blog_posts')
          .select('like_count, love_count, insightful_count, inspiring_count, thoughtful_count, helpful_count, mindblown_count')
          .eq('id', postId)
          .single()
      ]);

      if (reactionData.data) {
        setMyReaction(reactionData.data.reaction_type as ReactionType);
      }

      if (countsData.data) {
        setCounts({
          like: countsData.data.like_count || 0,
          love: countsData.data.love_count || 0,
          insightful: countsData.data.insightful_count || 0,
          inspiring: countsData.data.inspiring_count || 0,
          thoughtful: countsData.data.thoughtful_count || 0,
          helpful: countsData.data.helpful_count || 0,
          mindblown: countsData.data.mindblown_count || 0
        });
      }
    } catch (error) {
      console.error('Error loading reaction data:', error);
    }
  };

  const refreshCounts = async () => {
    const { data } = await supabase
      .from('blog_posts')
      .select('like_count, love_count, insightful_count, inspiring_count, thoughtful_count, helpful_count, mindblown_count')
      .eq('id', postId)
      .single();

    if (data) {
      setCounts({
        like: data.like_count || 0,
        love: data.love_count || 0,
        insightful: data.insightful_count || 0,
        inspiring: data.inspiring_count || 0,
        thoughtful: data.thoughtful_count || 0,
        helpful: data.helpful_count || 0,
        mindblown: data.mindblown_count || 0
      });
    }
  };

  const handleReaction = async (type: ReactionType) => {
    if (!user || !myBlogAccountId || isLoading) return;

    setIsLoading(true);
    try {
      if (myReaction === type) {
        const { error } = await supabase
          .from('blog_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('account_id', myBlogAccountId);

        if (error) throw error;

        setMyReaction(null);
      } else {
        const { error } = await supabase
          .from('blog_reactions')
          .upsert({
            post_id: postId,
            account_id: myBlogAccountId,
            reaction_type: type
          }, {
            onConflict: 'post_id,account_id'
          });

        if (error) throw error;

        setMyReaction(type);
      }

      await refreshCounts();
      onReactionChange?.();
      setIsOpen(false);
    } catch (error) {
      console.error('Error toggling reaction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalReactions = Object.values(counts).reduce((sum, count) => sum + count, 0);

  if (!user || !myBlogAccountId) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <Heart className="w-5 h-5" />
        <span className="text-sm">{totalReactions}</span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
            myReaction ? reactionConfig[myReaction].activeColor : 'hover:bg-gray-100'
          }`}
        >
          {myReaction ? (
            <>
              {(() => {
                const Icon = reactionConfig[myReaction].icon;
                return <Icon className={`w-4 h-4 ${reactionConfig[myReaction].color}`} />;
              })()}
              <span className="text-sm font-medium">{totalReactions}</span>
            </>
          ) : (
            <>
              <Heart className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">{totalReactions}</span>
            </>
          )}
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            ></div>
            <div className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 z-50 flex gap-2">
              {(Object.keys(reactionConfig) as ReactionType[]).map((type) => {
                const config = reactionConfig[type];
                const Icon = config.icon;
                const count = counts[type];
                const isActive = myReaction === type;

                return (
                  <button
                    key={type}
                    onClick={() => handleReaction(type)}
                    className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[48px] ${
                      isActive ? config.activeColor : config.hoverColor
                    }`}
                    title={config.label}
                  >
                    <Icon className={`w-5 h-5 ${config.color}`} />
                    {count > 0 && (
                      <span className="text-xs font-medium text-gray-600">{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
          myReaction ? reactionConfig[myReaction].activeColor : 'hover:bg-gray-100 border border-gray-200'
        }`}
      >
        {myReaction ? (
          <>
            {(() => {
              const Icon = reactionConfig[myReaction].icon;
              return <Icon className={`w-5 h-5 ${reactionConfig[myReaction].color}`} />;
            })()}
            <span className="font-medium">{reactionConfig[myReaction].label}</span>
          </>
        ) : (
          <>
            <Heart className="w-5 h-5 text-gray-400" />
            <span className="text-gray-600">React</span>
          </>
        )}
        {totalReactions > 0 && (
          <span className="ml-1 text-sm text-gray-500">({totalReactions})</span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          ></div>
          <div className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-5 z-50">
            <div className="grid grid-cols-3 gap-4 min-w-[360px]">
              {(Object.keys(reactionConfig) as ReactionType[]).map((type) => {
                const config = reactionConfig[type];
                const Icon = config.icon;
                const count = counts[type];
                const isActive = myReaction === type;

                return (
                  <button
                    key={type}
                    onClick={() => handleReaction(type)}
                    className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg transition-all min-w-[100px] ${
                      isActive ? config.activeColor : config.hoverColor
                    }`}
                    title={config.label}
                  >
                    <Icon className={`w-6 h-6 ${config.color}`} />
                    <span className="text-xs font-medium text-gray-700 whitespace-nowrap">{config.label}</span>
                    {count > 0 && (
                      <span className="text-xs text-gray-500">{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
