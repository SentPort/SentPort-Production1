import { Routes, Route } from 'react-router-dom';
import { usePageTracking } from '../../hooks/usePageTracking';
import JoinSwitter from './JoinSwitter';
import SwitterFeed from './SwitterFeed';
import SwitterProfile from './SwitterProfile';
import SwitterTweetDetail from './SwitterTweetDetail';
import SwitterSettings from './SwitterSettings';
import SwitterMessages from './SwitterMessages';
import SwitterSearch from './SwitterSearch';
import SwitterNotifications from './SwitterNotifications';
import SwitterNotificationSettings from './SwitterNotificationSettings';
import Analytics from './Analytics';
import Trending from './Trending';
import Bookmarks from './Bookmarks';
import Lists from './Lists';
import Drafts from './Drafts';
import Followers from './Followers';
import Following from './Following';
import PrivacySettings from './PrivacySettings';
import AdvancedSearch from './AdvancedSearch';
import FlaggedContentNotificationWrapper from '../../components/shared/FlaggedContentNotificationWrapper';

export default function SwitterRouter() {
  usePageTracking('switter');

  return (
    <>
      <Routes>
        <Route path="/join" element={<JoinSwitter />} />
        <Route path="/feed" element={<SwitterFeed />} />
        <Route path="/u/:handle" element={<SwitterProfile />} />
        <Route path="/user/:handle" element={<SwitterProfile />} />
        <Route path="/tweet/:tweetId" element={<SwitterTweetDetail />} />
        <Route path="/settings" element={<SwitterSettings />} />
        <Route path="/messages" element={<SwitterMessages />} />
        <Route path="/search" element={<SwitterSearch />} />
        <Route path="/notifications" element={<SwitterNotifications />} />
        <Route path="/notification-settings" element={<SwitterNotificationSettings />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/trending" element={<Trending />} />
        <Route path="/explore" element={<Trending />} />
        <Route path="/bookmarks" element={<Bookmarks />} />
        <Route path="/lists" element={<Lists />} />
        <Route path="/drafts" element={<Drafts />} />
        <Route path="/u/:handle/followers" element={<Followers />} />
        <Route path="/u/:handle/following" element={<Following />} />
        <Route path="/privacy" element={<PrivacySettings />} />
        <Route path="/advanced-search" element={<AdvancedSearch />} />
        <Route index element={<SwitterFeed />} />
      </Routes>
      <FlaggedContentNotificationWrapper />
    </>
  );
}