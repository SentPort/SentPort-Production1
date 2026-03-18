import { Routes, Route } from 'react-router-dom';
import { usePageTracking } from '../../hooks/usePageTracking';
import JoinHuTube from './JoinHuTube';
import HuTubeFeed from './HuTubeFeed';
import HuTubeChannel from './HuTubeChannel';
import HuTubeWatch from './HuTubeWatch';
import UploadVideo from './UploadVideo';
import Search from './Search';
import Trending from './Trending';
import Subscriptions from './Subscriptions';
import History from './History';
import WatchLater from './WatchLater';
import LikedVideos from './LikedVideos';
import Playlists from './Playlists';
import PlaylistView from './PlaylistView';
import Notifications from './Notifications';
import NotificationSettings from './NotificationSettings';
import Settings from './Settings';
import Profile from './Profile';
import Analytics from './Analytics';
import VideoAnalytics from './VideoAnalytics';
import FlaggedContentNotificationWrapper from '../../components/shared/FlaggedContentNotificationWrapper';

export default function HuTubeRouter() {
  usePageTracking('hutube');

  return (
    <>
      <Routes>
        <Route path="/join" element={<JoinHuTube />} />
        <Route path="/feed" element={<HuTubeFeed />} />
        <Route path="/upload" element={<UploadVideo />} />
        <Route path="/search" element={<Search />} />
        <Route path="/trending" element={<Trending />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
        <Route path="/history" element={<History />} />
        <Route path="/watch-later" element={<WatchLater />} />
        <Route path="/liked-videos" element={<LikedVideos />} />
        <Route path="/playlists" element={<Playlists />} />
        <Route path="/playlist/:playlistId" element={<PlaylistView />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/notification-settings" element={<NotificationSettings />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/analytics/video/:videoId" element={<VideoAnalytics />} />
        <Route path="/channel/:handle" element={<HuTubeChannel />} />
        <Route path="/watch/:videoId" element={<HuTubeWatch />} />
        <Route index element={<HuTubeFeed />} />
      </Routes>
      <FlaggedContentNotificationWrapper />
    </>
  );
}
