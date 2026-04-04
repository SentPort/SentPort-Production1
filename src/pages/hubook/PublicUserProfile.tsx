import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPin, Briefcase, GraduationCap, Heart, UserPlus, UserCheck, Clock, ArrowLeft, Users, MessageCircle, Lock, AlertCircle, Image, Globe } from 'lucide-react';
import { useHuBook } from '../../contexts/HuBookContext';
import { supabase } from '../../lib/supabase';
import Post from '../../components/hubook/Post';
import SharedPost from '../../components/hubook/SharedPost';
import MediaViewer from '../../components/hubook/MediaViewer';

export default function PublicUserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { hubookProfile } = useHuBook();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [friendship, setFriendship] = useState<any>(null);
  const [mutualFriendsCount, setMutualFriendsCount] = useState(0);
  const [privacySettings, setPrivacySettings] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ urls: string[]; index: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'photos'>('posts');

  useEffect(() => {
    if (userId && hubookProfile?.id === userId) {
      navigate('/hubook/profile', { replace: true });
      return;
    }
    if (userId) {
      fetchUser();
      fetchFriendship();
      fetchMutualFriends();
      fetchPrivacySettings();
    }
  }, [userId, hubookProfile]);

  useEffect(() => {
    if (userId && privacySettings && friendship !== undefined) {
      fetchPosts();
      fetchPhotos();
      fetchAlbums();
    }
  }, [userId, privacySettings, friendship]);

  const fetchUser = async () => {
    const { data } = await supabase
      .from('hubook_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    setUser(data);
    setLoading(false);
  };

  const fetchPrivacySettings = async () => {
    if (!userId) return;

    const { data } = await supabase
      .from('user_privacy_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    setPrivacySettings(data || {
      friend_request_privacy: 'everyone',
      messaging_privacy: 'everyone'
    });
  };

  const fetchFriendship = async () => {
    if (!hubookProfile || !userId) return;

    const { data } = await supabase
      .from('friendships')
      .select('*')
      .or(`and(requester_id.eq.${hubookProfile.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${hubookProfile.id})`)
      .maybeSingle();

    setFriendship(data);
  };

  const fetchMutualFriends = async () => {
    if (!hubookProfile || !userId) return;

    // Get my friends
    const { data: myFriends } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${hubookProfile.id},addressee_id.eq.${hubookProfile.id}`);

    // Get their friends
    const { data: theirFriends } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

    const myFriendIds = new Set(
      (myFriends || []).map((f) =>
        f.requester_id === hubookProfile.id ? f.addressee_id : f.requester_id
      )
    );

    const theirFriendIds = new Set(
      (theirFriends || []).map((f) =>
        f.requester_id === userId ? f.addressee_id : f.requester_id
      )
    );

    const mutual = [...myFriendIds].filter((id) => theirFriendIds.has(id));
    setMutualFriendsCount(mutual.length);
  };

  const sendFriendRequest = async () => {
    if (!hubookProfile || !userId) return;

    const { error } = await supabase
      .from('friendships')
      .insert({
        requester_id: hubookProfile.id,
        addressee_id: userId,
        status: 'pending'
      });

    if (error) {
      if (error.message.includes('restricted who can send them friend requests')) {
        setErrorMessage('This user has restricted who can send them friend requests.');
      } else {
        setErrorMessage('Failed to send friend request. Please try again.');
      }
      setTimeout(() => setErrorMessage(null), 5000);
    } else {
      fetchFriendship();
    }
  };

  const cancelFriendRequest = async () => {
    if (!friendship) return;

    await supabase
      .from('friendships')
      .delete()
      .eq('id', friendship.id);

    setFriendship(null);
  };

  const acceptFriendRequest = async () => {
    if (!friendship) return;

    await supabase
      .from('friendships')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', friendship.id);

    fetchFriendship();
  };

  const startConversation = async () => {
    if (!hubookProfile || !userId) return;

    // Check if conversation already exists
    const { data: existingConversations } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', hubookProfile.id);

    if (existingConversations) {
      for (const conv of existingConversations) {
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conv.conversation_id);

        if (participants?.length === 2) {
          const userIds = participants.map(p => p.user_id);
          if (userIds.includes(hubookProfile.id) && userIds.includes(userId)) {
            navigate(`/hubook/messages?conversation=${conv.conversation_id}`);
            return;
          }
        }
      }
    }

    // Create new conversation
    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({})
      .select()
      .single();

    if (convError) {
      if (convError.message.includes('restricted who can send them messages')) {
        setErrorMessage('This user has restricted who can message them.');
      } else {
        setErrorMessage('Failed to start conversation. Please try again.');
      }
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }

    if (newConv) {
      const { error: participantError } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: newConv.id, user_id: hubookProfile.id },
          { conversation_id: newConv.id, user_id: userId }
        ]);

      if (participantError) {
        setErrorMessage('Failed to start conversation. Please try again.');
        setTimeout(() => setErrorMessage(null), 5000);
      } else {
        navigate(`/hubook/messages?conversation=${newConv.id}`);
      }
    }
  };

  const canSendFriendRequest = () => {
    if (!privacySettings) return true;
    return privacySettings.friend_request_privacy !== 'no_one';
  };

  const canSendMessage = () => {
    if (!privacySettings) return true;
    if (privacySettings.messaging_privacy === 'no_one') return false;
    if (privacySettings.messaging_privacy === 'friends_only' && friendship?.status !== 'accepted') return false;
    return true;
  };

  const canViewPosts = () => {
    if (!privacySettings) return true;
    const postVisibility = privacySettings.post_visibility_default || 'public';
    if (postVisibility === 'public' || postVisibility === 'everyone') return true;
    if ((postVisibility === 'friends_only' || postVisibility === 'friends') && friendship?.status === 'accepted') return true;
    return false;
  };

  const canViewPhotos = () => {
    if (!privacySettings) return true;
    const photoVisibility = privacySettings.who_can_see_photos || 'everyone';
    if (photoVisibility === 'public' || photoVisibility === 'everyone') return true;
    if ((photoVisibility === 'friends_only' || photoVisibility === 'friends') && friendship?.status === 'accepted') return true;
    return false;
  };

  const canViewAlbum = (albumPrivacy: string) => {
    if (albumPrivacy === 'public') return true;
    if (albumPrivacy === 'friends' && friendship?.status === 'accepted') return true;
    return false;
  };

  const fetchPosts = async () => {
    if (!userId || !canViewPosts()) {
      setFeedItems([]);
      return;
    }

    setPostsLoading(true);
    try {
      const [postsRes, sharesRes] = await Promise.all([
        supabase
          .from('posts')
          .select('*')
          .eq('author_id', userId)
          .eq('status', 'active')
          .order('created_at', { ascending: false }),
        supabase
          .from('shares')
          .select('*')
          .eq('user_id', userId)
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
            data: { share, post, sharer: user },
            timestamp: share.created_at
          } : null;
        }).filter(item => item !== null)
      ].sort((a, b) => new Date(b!.timestamp).getTime() - new Date(a!.timestamp).getTime());

      setFeedItems(combinedItems);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setPostsLoading(false);
    }
  };

  const fetchPhotos = async () => {
    if (!userId || !canViewPhotos()) {
      setPhotos([]);
      return;
    }

    setPhotosLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('author_id', userId)
        .eq('status', 'active')
        .not('media_urls', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const photosData = (data || []).filter(post =>
        post.media_urls && post.media_urls.length > 0
      );

      setPhotos(photosData);
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setPhotosLoading(false);
    }
  };

  const fetchAlbums = async () => {
    if (!userId || !canViewPhotos()) {
      setAlbums([]);
      return;
    }

    try {
      const { data: albumsData, error: albumsError } = await supabase
        .from('albums')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (albumsError) throw albumsError;

      const visibleAlbums = (albumsData || []).filter(album =>
        canViewAlbum(album.privacy)
      );

      const albumsWithCounts = await Promise.all(
        visibleAlbums.map(async (album) => {
          const { count } = await supabase
            .from('album_media')
            .select('*', { count: 'exact', head: true })
            .eq('album_id', album.id);

          const { data: coverMedia } = await supabase
            .from('album_media')
            .select('media_url')
            .eq('album_id', album.id)
            .eq('is_album_cover', true)
            .eq('media_type', 'image')
            .maybeSingle();

          let coverUrl = coverMedia?.media_url || album.cover_photo_url;

          if (!coverUrl) {
            const { data: firstMedia } = await supabase
              .from('album_media')
              .select('media_url')
              .eq('album_id', album.id)
              .eq('media_type', 'image')
              .order('uploaded_at', { ascending: true })
              .limit(1)
              .maybeSingle();

            coverUrl = firstMedia?.media_url || null;
          }

          return {
            ...album,
            media_count: count || 0,
            cover_photo_url: coverUrl
          };
        })
      );

      setAlbums(albumsWithCounts);
    } catch (error) {
      console.error('Error fetching albums:', error);
    }
  };

  const getFriendshipButton = () => {
    if (!friendship) {
      if (!canSendFriendRequest()) {
        return (
          <div className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-gray-500 font-medium rounded-lg cursor-not-allowed" title="This user is not accepting friend requests">
            <Lock className="w-5 h-5" />
            Not Accepting Requests
          </div>
        );
      }

      return (
        <button
          onClick={sendFriendRequest}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Add Friend
        </button>
      );
    }

    if (friendship.status === 'accepted') {
      return (
        <div className="flex items-center gap-2 px-6 py-2.5 bg-green-50 text-green-700 font-medium rounded-lg">
          <UserCheck className="w-5 h-5" />
          Friends
        </div>
      );
    }

    if (friendship.requester_id === hubookProfile?.id) {
      return (
        <button
          onClick={cancelFriendRequest}
          className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Clock className="w-5 h-5" />
          Request Sent
        </button>
      );
    }

    return (
      <div className="flex gap-2">
        <button
          onClick={acceptFriendRequest}
          className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Accept Request
        </button>
        <button
          onClick={cancelFriendRequest}
          className="px-6 py-2.5 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
        >
          Decline
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">User not found</h2>
        <p className="text-gray-600 mb-6">This user doesn't exist or has been removed.</p>
        <Link
          to="/hubook"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to HuBook
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        to="/hubook"
        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to HuBook
      </Link>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
        <div className="h-48 bg-gradient-to-r from-blue-400 to-blue-600"></div>

        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-16 mb-4">
            <div className="flex items-end gap-4">
              {user.profile_photo_url ? (
                <img
                  src={user.profile_photo_url}
                  alt={user.display_name}
                  className="w-32 h-32 rounded-full border-4 border-white object-cover bg-white"
                />
              ) : (
                <div className="w-32 h-32 rounded-full border-4 border-white bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-4xl">
                  {user.display_name.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{user.display_name}</h1>
                {mutualFriendsCount > 0 && (
                  <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                    <Users className="w-4 h-4" />
                    {mutualFriendsCount} mutual friend{mutualFriendsCount !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>

            {hubookProfile?.id !== user.id && (
              <div className="mb-2 flex flex-col gap-2">
                {errorMessage && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {errorMessage}
                  </div>
                )}
                <div className="flex gap-2">
                  {getFriendshipButton()}
                  {friendship?.status === 'accepted' ? (
                    canSendMessage() ? (
                      <button
                        onClick={startConversation}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <MessageCircle className="w-5 h-5" />
                        Message
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-gray-500 font-medium rounded-lg cursor-not-allowed" title="This user has restricted messaging">
                        <Lock className="w-5 h-5" />
                        Messaging Restricted
                      </div>
                    )
                  ) : null}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {user.bio && (
              <p className="text-gray-700">{user.bio}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
              {user.work && (
                <div className="flex items-center gap-3 text-gray-700">
                  <Briefcase className="w-5 h-5 text-gray-500" />
                  <span>{user.work}</span>
                </div>
              )}

              {user.education && (
                <div className="flex items-center gap-3 text-gray-700">
                  <GraduationCap className="w-5 h-5 text-gray-500" />
                  <span>{user.education}</span>
                </div>
              )}

              {user.location && (
                <div className="flex items-center gap-3 text-gray-700">
                  <MapPin className="w-5 h-5 text-gray-500" />
                  <span>{user.location}</span>
                </div>
              )}

              {user.relationship_status && (
                <div className="flex items-center gap-3 text-gray-700">
                  <Heart className="w-5 h-5 text-gray-500" />
                  <span>{user.relationship_status}</span>
                </div>
              )}
            </div>

            {user.interests && (Array.isArray(user.interests) ? user.interests.length > 0 : user.interests) && (
              <div className="pt-4 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">Interests</h3>
                {Array.isArray(user.interests) ? (
                  <div className="flex flex-wrap gap-2">
                    {user.interests.map((interest, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-700">{user.interests}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'posts'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Posts
            </button>
            <button
              onClick={() => setActiveTab('photos')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'photos'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Photos
            </button>
          </nav>
        </div>

        {activeTab === 'posts' && (
          <div className="p-6">
            {!canViewPosts() ? (
              <div className="text-center py-12">
                <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Posts are private</h3>
                <p className="text-gray-600">
                  {friendship?.status === 'accepted'
                    ? `${user.display_name} has restricted who can view their posts.`
                    : `Only friends can view ${user.display_name}'s posts.`}
                </p>
              </div>
            ) : postsLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : feedItems.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No posts yet</h3>
                <p className="text-gray-600">{user.display_name} hasn't shared anything yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {feedItems.map((item) => (
                  item.type === 'post' ? (
                    <Post key={`post-${item.data.id}`} post={item.data} onUpdate={fetchPosts} />
                  ) : (
                    <SharedPost
                      key={`share-${item.data.share.id}`}
                      share={item.data.share}
                      post={item.data.post}
                      sharer={item.data.sharer}
                      onUpdate={fetchPosts}
                    />
                  )
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'photos' && (
          <div className="p-6">
            {!canViewPhotos() ? (
              <div className="text-center py-12">
                <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Photos are private</h3>
                <p className="text-gray-600">
                  {friendship?.status === 'accepted'
                    ? `${user.display_name} has restricted who can view their photos.`
                    : `Only friends can view ${user.display_name}'s photos.`}
                </p>
              </div>
            ) : photosLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : albums.length === 0 && photos.length === 0 ? (
              <div className="text-center py-12">
                <Image className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No photos yet</h3>
                <p className="text-gray-600">{user.display_name} hasn't shared any photos yet.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {albums.length > 0 && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Albums</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {albums.map((album) => (
                        <div
                          key={album.id}
                          onClick={() => navigate(`/hubook/albums/${album.id}`)}
                          className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                        >
                          <div className="relative aspect-square bg-gradient-to-br from-blue-100 to-purple-100 overflow-hidden">
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
                            <div className="absolute top-2 left-2">
                              <div className="bg-black bg-opacity-60 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                                {album.privacy === 'public' && <Globe className="w-3 h-3" />}
                                {album.privacy === 'friends' && <Users className="w-3 h-3" />}
                                {album.privacy === 'private' && <Lock className="w-3 h-3" />}
                                <span>{album.privacy === 'public' ? 'Public' : album.privacy === 'friends' ? 'Friends' : 'Private'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="p-4">
                            <h3 className="font-semibold text-gray-900 truncate">{album.album_name}</h3>
                            {album.description && (
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{album.description}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                              {album.media_count || 0} {album.media_count === 1 ? 'item' : 'items'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {photos.length > 0 && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Photos from Posts</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {photos.flatMap(post =>
                        post.media_urls.map((url: string, urlIndex: number) => (
                          <div
                            key={`${post.id}-${urlIndex}`}
                            className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setSelectedMedia({ urls: post.media_urls, index: urlIndex })}
                          >
                            <img
                              src={url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedMedia && (
        <MediaViewer
          mediaUrls={selectedMedia.urls}
          initialIndex={selectedMedia.index}
          onClose={() => setSelectedMedia(null)}
        />
      )}
    </div>
  );
}
