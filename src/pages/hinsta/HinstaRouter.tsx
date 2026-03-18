import { Routes, Route } from 'react-router-dom';
import { usePageTracking } from '../../hooks/usePageTracking';
import { HinstaNotificationProvider } from '../../contexts/HinstaNotificationContext';
import JoinHinsta from './JoinHinsta';
import HinstaFeed from './HinstaFeed';
import HinstaProfile from './HinstaProfile';
import PostDetail from './PostDetail';
import Explore from './Explore';
import Messages from './Messages';
import MessageThread from './MessageThread';
import Notifications from './Notifications';
import Settings from './Settings';
import Saved from './Saved';
import HashtagDetail from './HashtagDetail';
import Analytics from './Analytics';
import PostAnalytics from './PostAnalytics';
import FlaggedContentNotificationWrapper from '../../components/shared/FlaggedContentNotificationWrapper';

export default function HinstaRouter() {
  usePageTracking('hinsta');

  return (
    <HinstaNotificationProvider>
      <Routes>
        <Route path="/join" element={<JoinHinsta />} />
        <Route path="/feed" element={<HinstaFeed />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/post/:id" element={<PostDetail />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:conversationId" element={<MessageThread />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/saved" element={<Saved />} />
        <Route path="/hashtag/:tag" element={<HashtagDetail />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/analytics/post/:postId" element={<PostAnalytics />} />
        <Route path="/profile/:username" element={<HinstaProfile />} />
        <Route path="/:username" element={<HinstaProfile />} />
        <Route index element={<HinstaFeed />} />
      </Routes>
      <FlaggedContentNotificationWrapper />
    </HinstaNotificationProvider>
  );
}