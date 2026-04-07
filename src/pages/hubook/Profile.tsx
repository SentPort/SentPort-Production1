import { useState, useEffect } from 'react';
import { useHuBook } from '../../contexts/HuBookContext';
import { MapPin, Briefcase, GraduationCap, Heart, Calendar, Camera } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import PostComposer from '../../components/hubook/PostComposer';
import Post from '../../components/hubook/Post';
import SharedPost from '../../components/hubook/SharedPost';
import ProfilePhotoModal from '../../components/hubook/ProfilePhotoModal';
import CoverRenderer from '../../components/shared/CoverRenderer';

export default function Profile() {
  const { hubookProfile } = useHuBook();
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfilePhotoModal, setShowProfilePhotoModal] = useState(false);
  const [showCoverPhotoModal, setShowCoverPhotoModal] = useState(false);

  useEffect(() => {
    if (hubookProfile) {
      fetchUserPosts();
    }
  }, [hubookProfile]);

  const fetchUserPosts = async () => {
    if (!hubookProfile) return;

    setLoading(true);
    try {
      const [postsRes, sharesRes] = await Promise.all([
        supabase
          .from('posts')
          .select('*')
          .eq('author_id', hubookProfile.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false }),
        supabase
          .from('shares')
          .select('*')
          .eq('user_id', hubookProfile.id)
          .order('created_at', { ascending: false })
      ]);

      if (postsRes.error) throw postsRes.error;
      if (sharesRes.error) throw sharesRes.error;

      const posts = postsRes.data || [];
      const shares = sharesRes.data || [];

      const sharePostIds = shares.map(s => s.post_id);
      const postsForShares = sharePostIds.length > 0
        ? (await supabase.from('posts').select('*').in('id', sharePostIds).eq('status', 'active')).data || []
        : [];

      const combinedItems = [
        ...posts.map(post => ({ type: 'post', data: post, timestamp: post.created_at })),
        ...shares.map(share => {
          const post = postsForShares.find(p => p.id === share.post_id);
          return post ? {
            type: 'share',
            data: { share, post, sharer: hubookProfile },
            timestamp: share.created_at
          } : null;
        }).filter(item => item !== null)
      ].sort((a, b) => new Date(b!.timestamp).getTime() - new Date(a!.timestamp).getTime());

      setFeedItems(combinedItems);
    } catch (error) {
      console.error('Error fetching user posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostCreated = () => {
    fetchUserPosts();
  };

  if (!hubookProfile) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
        <div className="relative h-64 overflow-hidden group cursor-pointer" onClick={() => setShowCoverPhotoModal(true)}>
          {hubookProfile.cover_design_data ? (
            <CoverRenderer
              designData={hubookProfile.cover_design_data}
              useFixedHeight={true}
              className="absolute inset-0"
            />
          ) : hubookProfile.cover_photo_url ? (
            <img
              src={hubookProfile.cover_photo_url}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400" />
          )}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white rounded-full p-3 shadow-lg">
              <Camera className="w-6 h-6 text-gray-700" />
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          <div className="flex gap-6 -mt-20">
            <div className="relative group cursor-pointer flex-shrink-0" onClick={() => setShowProfilePhotoModal(true)}>
              {hubookProfile.profile_photo_url ? (
                <img
                  src={hubookProfile.profile_photo_url}
                  alt={hubookProfile.display_name}
                  className="w-40 h-40 rounded-full border-4 border-white object-cover"
                />
              ) : (
                <div className="w-40 h-40 rounded-full border-4 border-white bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold text-5xl">
                  {hubookProfile.display_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white rounded-full p-2 shadow-lg">
                  <Camera className="w-5 h-5 text-gray-700" />
                </div>
              </div>
            </div>

            <div className="flex-1 pt-24">
              <h1 className="text-3xl font-bold text-gray-900 leading-tight">{hubookProfile.display_name}</h1>
              <p className="text-gray-600 mt-1">
                {hubookProfile.sex === 'male' ? 'Male' : 'Female'}, {hubookProfile.age} years old
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">About</h2>

            {hubookProfile.bio && (
              <div className="mb-4">
                <p className="text-gray-700">{hubookProfile.bio}</p>
              </div>
            )}

            <div className="space-y-3">
              {hubookProfile.work && (
                <div className="flex items-center gap-3 text-gray-700">
                  <Briefcase className="w-5 h-5 text-gray-400" />
                  <span>{hubookProfile.work}</span>
                </div>
              )}

              {hubookProfile.education && (
                <div className="flex items-center gap-3 text-gray-700">
                  <GraduationCap className="w-5 h-5 text-gray-400" />
                  <span>{hubookProfile.education}</span>
                </div>
              )}

              {hubookProfile.location && (
                <div className="flex items-center gap-3 text-gray-700">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <span>{hubookProfile.location}</span>
                </div>
              )}

              {hubookProfile.relationship_status && (
                <div className="flex items-center gap-3 text-gray-700">
                  <Heart className="w-5 h-5 text-gray-400" />
                  <span className="capitalize">{hubookProfile.relationship_status.replace('_', ' ')}</span>
                </div>
              )}

              <div className="flex items-center gap-3 text-gray-700">
                <Calendar className="w-5 h-5 text-gray-400" />
                <span>Joined {new Date(hubookProfile.joined_at).toLocaleDateString()}</span>
              </div>
            </div>

            {hubookProfile.interests && hubookProfile.interests.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {hubookProfile.interests.map((interest, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <PostComposer onPostCreated={handlePostCreated} />

          {loading ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : feedItems.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No posts yet</h3>
              <p className="text-gray-600">Share your first post above!</p>
            </div>
          ) : (
            feedItems.map((item) => (
              item.type === 'post' ? (
                <Post key={`post-${item.data.id}`} post={item.data} onUpdate={fetchUserPosts} />
              ) : (
                <SharedPost
                  key={`share-${item.data.share.id}`}
                  share={item.data.share}
                  post={item.data.post}
                  sharer={item.data.sharer}
                  onUpdate={fetchUserPosts}
                />
              )
            ))
          )}
        </div>
      </div>

      {showProfilePhotoModal && (
        <ProfilePhotoModal
          onClose={() => setShowProfilePhotoModal(false)}
          currentPhotoUrl={hubookProfile.profile_photo_url || undefined}
          photoType="profile"
        />
      )}

      {showCoverPhotoModal && (
        <ProfilePhotoModal
          onClose={() => setShowCoverPhotoModal(false)}
          currentPhotoUrl={hubookProfile.cover_photo_url || undefined}
          photoType="cover"
        />
      )}
    </div>
  );
}
