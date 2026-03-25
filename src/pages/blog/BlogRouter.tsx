import { Routes, Route, Navigate } from 'react-router-dom';
import { usePageTracking } from '../../hooks/usePageTracking';
import JoinHuBlog from './JoinHuBlog';
import BlogFeed from './BlogFeed';
import CreatePost from './CreatePost';
import EditPost from './EditPost';
import MyPosts from './MyPosts';
import Drafts from './Drafts';
import ViewPost from './ViewPost';
import BlogProfile from './BlogProfile';
import EditProfile from './EditProfile';
import Explore from './Explore';
import SavedStories from './SavedStories';
import Messages from './Messages';
import Collaborations from './Collaborations';
import ProposalsDashboard from './ProposalsDashboard';
import ProposalReview from './ProposalReview';
import CollaborationWorkspace from './CollaborationWorkspace';
import Collections from './Collections';
import CollectionView from './CollectionView';
import Trending from './Trending';
import Following from './Following';
import ReadingHistory from './ReadingHistory';
import Settings from './Settings';
import Analytics from './Analytics';
import SearchResults from './SearchResults';
import FlaggedContentNotificationWrapper from '../../components/shared/FlaggedContentNotificationWrapper';
import ErrorBoundary from '../../components/shared/ErrorBoundary';

export default function BlogRouter() {
  usePageTracking('blog');

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/blog/feed" replace />} />
        <Route path="/feed" element={<BlogFeed />} />
        <Route path="/trending" element={<Trending />} />
        <Route path="/following" element={<Following />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/saved" element={<SavedStories />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/collaborations" element={<Collaborations />} />
        <Route path="/collaborations/new" element={<Collaborations />} />
        <Route path="/collaborations/proposals" element={<ProposalsDashboard />} />
        <Route path="/collaborations/proposal/:proposalId" element={<ProposalReview />} />
        <Route path="/collaborations/workspace/:collaborationId" element={<CollaborationWorkspace />} />
        <Route path="/collections" element={<Collections />} />
        <Route path="/collection/:collectionId" element={<CollectionView />} />
        <Route path="/reading-history" element={<ReadingHistory />} />
        <Route path="/discover-writers" element={<Explore />} />
        <Route path="/join" element={<JoinHuBlog />} />
        <Route path="/create-account" element={<Navigate to="/blog/join" replace />} />
        <Route path="/create-post" element={<CreatePost />} />
        <Route path="/edit-post/:postId" element={<EditPost />} />
        <Route path="/my-posts" element={<MyPosts />} />
        <Route path="/drafts" element={<Drafts />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/edit-profile" element={<EditProfile />} />
        <Route path="/post/:postId" element={<ViewPost />} />
        <Route path="/@:username" element={<ErrorBoundary fallbackPath="/blog/feed"><BlogProfile /></ErrorBoundary>} />
        <Route path="/profile/:username" element={<ErrorBoundary fallbackPath="/blog/feed"><BlogProfile /></ErrorBoundary>} />
        <Route path="/author/:username" element={<ErrorBoundary fallbackPath="/blog/feed"><BlogProfile /></ErrorBoundary>} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
      <FlaggedContentNotificationWrapper />
    </>
  );
}
