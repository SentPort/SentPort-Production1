import { Link } from 'react-router-dom';
import { Pin, Video, Camera, MessageSquare, FileText, Users, Bird } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface PinStats {
  platform: string;
  count: number;
  icon: any;
  color: string;
  link: string;
}

export default function PinsManagement() {
  const [stats, setStats] = useState<PinStats[]>([
    { platform: 'Heddit', count: 0, icon: MessageSquare, color: 'orange', link: '/admin/heddit-pins' },
    { platform: 'HuBook', count: 0, icon: Users, color: 'blue', link: '/admin/hubook-pins' },
    { platform: 'HuTube', count: 0, icon: Video, color: 'red', link: '/admin/hutube-pins' },
    { platform: 'Hinsta', count: 0, icon: Camera, color: 'pink', link: '/admin/hinsta-pins' },
    { platform: 'Switter', count: 0, icon: Bird, color: 'sky', link: '/admin/switter-pins' },
    { platform: 'HuBlog', count: 0, icon: FileText, color: 'teal', link: '/admin/blog-pins' },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [heddit, hubook, hutube, hinsta, switter, blog] = await Promise.all([
        supabase.from('heddit_posts').select('id', { count: 'exact', head: true }).eq('is_pinned', true),
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('is_pinned', true),
        supabase.from('hutube_videos').select('id', { count: 'exact', head: true }).eq('is_pinned', true),
        supabase.from('hinsta_posts').select('id', { count: 'exact', head: true }).eq('is_pinned', true),
        supabase.from('switter_tweets').select('id', { count: 'exact', head: true }).eq('is_pinned', true),
        supabase.from('blog_posts').select('id', { count: 'exact', head: true }).eq('is_pinned', true),
      ]);

      setStats([
        { platform: 'Heddit', count: heddit.count || 0, icon: MessageSquare, color: 'orange', link: '/admin/heddit-pins' },
        { platform: 'HuBook', count: hubook.count || 0, icon: Users, color: 'blue', link: '/admin/hubook-pins' },
        { platform: 'HuTube', count: hutube.count || 0, icon: Video, color: 'red', link: '/admin/hutube-pins' },
        { platform: 'Hinsta', count: hinsta.count || 0, icon: Camera, color: 'pink', link: '/admin/hinsta-pins' },
        { platform: 'Switter', count: switter.count || 0, icon: Bird, color: 'sky', link: '/admin/switter-pins' },
        { platform: 'HuBlog', count: blog.count || 0, icon: FileText, color: 'teal', link: '/admin/blog-pins' },
      ]);
    } catch (error) {
      console.error('Error loading pin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPins = stats.reduce((sum, stat) => sum + stat.count, 0);

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
      orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600', iconBg: 'bg-orange-100' },
      blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', iconBg: 'bg-blue-100' },
      red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', iconBg: 'bg-red-100' },
      pink: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-600', iconBg: 'bg-pink-100' },
      sky: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-600', iconBg: 'bg-sky-100' },
      teal: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-600', iconBg: 'bg-teal-100' },
    };
    return colors[color] || colors.blue;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading pin statistics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pinned Content Management</h1>
          <p className="text-gray-600">Manage pinned content across all platforms</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <Pin className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{totalPins} Total Pinned Items</h2>
              <p className="text-gray-600">Across all platforms (max 5 per platform)</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.map((stat) => {
            const IconComponent = stat.icon;
            const colors = getColorClasses(stat.color);

            return (
              <Link
                key={stat.platform}
                to={stat.link}
                className={`${colors.bg} border-2 ${colors.border} rounded-lg p-6 hover:shadow-lg transition-all transform hover:-translate-y-1`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 ${colors.iconBg} rounded-lg flex items-center justify-center`}>
                    <IconComponent className={`w-6 h-6 ${colors.text}`} />
                  </div>
                  <div className={`px-3 py-1 ${colors.iconBg} ${colors.text} rounded-full text-sm font-semibold`}>
                    {stat.count}/5
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-1">{stat.platform}</h3>
                <p className="text-gray-600 text-sm mb-4">
                  {stat.count === 0 ? 'No pinned content' : `${stat.count} ${stat.count === 1 ? 'item' : 'items'} pinned`}
                </p>

                <div className="flex items-center gap-2 text-sm font-medium" style={{ color: colors.text.replace('text-', '') }}>
                  <Pin className="w-4 h-4" />
                  <span>Manage Pins</span>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">About Pinned Content</h3>
          <ul className="space-y-2 text-gray-700 text-sm">
            <li className="flex items-start gap-2">
              <Pin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>Each platform can have up to 5 pinned items</span>
            </li>
            <li className="flex items-start gap-2">
              <Pin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>Pinned content appears at the top of feeds with a distinctive visual indicator</span>
            </li>
            <li className="flex items-start gap-2">
              <Pin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>Pins are platform-specific and do not automatically expire</span>
            </li>
            <li className="flex items-start gap-2">
              <Pin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>HuBook pinned posts are visible to all users regardless of friendship status</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
