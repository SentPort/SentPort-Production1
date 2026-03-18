import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Shield, Clock, Settings, Users, Scale, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface QueueStats {
  pending: number;
  reviewed: number;
}

export default function ModerationControls() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<QueueStats>({ pending: 0, reviewed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data: pending } = await supabase
        .from('flagged_content')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { data: reviewed } = await supabase
        .from('flagged_content')
        .select('id', { count: 'exact', head: true })
        .in('status', ['approved', 'removed']);

      setStats({
        pending: pending?.length || 0,
        reviewed: reviewed?.length || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    {
      title: 'Review Queue',
      description: 'Review flagged content awaiting moderation',
      icon: Shield,
      color: 'red',
      badge: stats.pending > 0 ? `${stats.pending} pending` : null,
      path: '/admin/review-queue',
      available: true,
    },
    {
      title: 'Review History',
      description: 'View past moderation decisions and actions',
      icon: Clock,
      color: 'blue',
      badge: stats.reviewed > 0 ? `${stats.reviewed} reviewed` : null,
      path: '/admin/review-history',
      available: true,
    },
    {
      title: 'Moderation Settings',
      description: 'Configure auto-moderation thresholds and rules',
      icon: Settings,
      color: 'green',
      badge: null,
      path: '/admin/moderation-settings',
      available: true,
    },
    {
      title: 'Jury Pool',
      description: 'Manage community moderators and jury members',
      icon: Users,
      color: 'purple',
      badge: null,
      path: '/admin/jury-pool',
      available: true,
    },
    {
      title: 'Jury Cases',
      description: 'Review cases submitted to community jury',
      icon: Scale,
      color: 'purple',
      badge: null,
      path: '/admin/jury-cases',
      available: true,
    },
  ];

  const getColorClasses = (color: string, available: boolean) => {
    if (!available) {
      return {
        bg: 'bg-gray-100',
        hover: '',
        icon: 'text-gray-400',
        badge: 'bg-gray-200 text-gray-600',
      };
    }

    const colors: Record<string, any> = {
      red: {
        bg: 'bg-red-50',
        hover: 'hover:bg-red-100 hover:shadow-lg',
        icon: 'text-red-600',
        badge: 'bg-red-100 text-red-700',
      },
      blue: {
        bg: 'bg-blue-50',
        hover: 'hover:bg-blue-100 hover:shadow-lg',
        icon: 'text-blue-600',
        badge: 'bg-blue-100 text-blue-700',
      },
      green: {
        bg: 'bg-green-50',
        hover: 'hover:bg-green-100 hover:shadow-lg',
        icon: 'text-green-600',
        badge: 'bg-green-100 text-green-700',
      },
      purple: {
        bg: 'bg-purple-50',
        hover: 'hover:bg-purple-100 hover:shadow-lg',
        icon: 'text-purple-600',
        badge: 'bg-purple-100 text-purple-700',
      },
    };

    return colors[color];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-red-600" />
            <h1 className="text-3xl font-bold text-gray-900">Moderation Controls</h1>
          </div>
          <p className="text-gray-600 text-lg">
            Centralized hub for all content moderation tools and settings
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">About Moderation</h3>
              <p className="text-sm text-blue-800">
                SentPort uses a hybrid moderation system combining automated flagging with human review.
                Content is automatically paused when it receives excessive reports, then reviewed by admins
                who can approve or remove it. Configure thresholds in Moderation Settings.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => {
            const colors = getColorClasses(card.color, card.available);
            const Icon = card.icon;

            return (
              <button
                key={card.title}
                onClick={() => card.path && navigate(card.path)}
                disabled={!card.available}
                className={`${colors.bg} ${colors.hover} rounded-xl p-6 text-left transition-all duration-200 border-2 border-transparent ${
                  card.available ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-lg ${card.available ? 'bg-white' : 'bg-gray-200'}`}>
                    <Icon className={`w-6 h-6 ${colors.icon}`} />
                  </div>
                  {card.badge && (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors.badge}`}>
                      {card.badge}
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">{card.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{card.description}</p>
              </button>
            );
          })}
        </div>

        {loading && (
          <div className="mt-8 text-center text-gray-500">
            <p>Loading statistics...</p>
          </div>
        )}
      </div>
    </div>
  );
}
