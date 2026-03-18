import { Routes, Route } from 'react-router-dom';
import { usePageTracking } from '../../hooks/usePageTracking';
import JoinHeddit from './JoinHeddit';
import HedditFeed from './HedditFeed';
import HedditSubreddit from './HedditSubreddit';
import HedditProfile from './HedditProfile';
import CreateSubreddit from './CreateSubreddit';
import CreatePost from './CreatePost';
import ViewPost from './ViewPost';
import SearchResults from './SearchResults';
import TagDetail from './TagDetail';
import Messages from './Messages';
import Settings from './Settings';
import NotificationSettings from './NotificationSettings';
import Leaderboard from './Leaderboard';
import KarmaGuide from './KarmaGuide';
import FlaggedContentNotificationWrapper from '../../components/shared/FlaggedContentNotificationWrapper';

export default function HedditRouter() {
  usePageTracking('heddit');

  return (
    <>
      <Routes>
        <Route path="/join" element={<JoinHeddit />} />
        <Route path="/feed" element={<HedditFeed />} />
        <Route path="/create-post" element={<CreatePost />} />
        <Route path="/post/:postId" element={<ViewPost />} />
        <Route path="/h/:subredditName" element={<HedditSubreddit />} />
        <Route path="/r/:subredditName" element={<HedditSubreddit />} />
        <Route path="/u/:username" element={<HedditProfile />} />
        <Route path="/user/:username" element={<HedditProfile />} />
        <Route path="/create-subreddit" element={<CreateSubreddit />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/tag/:tagName" element={<TagDetail />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/notification-settings" element={<NotificationSettings />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/karma-guide" element={<KarmaGuide />} />
        <Route index element={<HedditFeed />} />
      </Routes>
      <FlaggedContentNotificationWrapper />
    </>
  );
}