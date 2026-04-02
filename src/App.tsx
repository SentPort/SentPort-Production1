import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { HuBookProvider } from './contexts/HuBookContext';
import Header from './components/Header';
import TestingModeBanner from './components/shared/TestingModeBanner';
import ErrorBoundary from './components/shared/ErrorBoundary';
import VerificationStatusModal from './components/shared/VerificationStatusModal';
import Home from './pages/Home';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import ResetPassword from './pages/ResetPassword';
import EmailVerificationCallback from './pages/EmailVerificationCallback';
import EmailNotVerified from './pages/EmailNotVerified';
import MakeYourOwnSite from './pages/MakeYourOwnSite';
import Dashboard from './pages/Dashboard';
import EditProfile from './pages/EditProfile';
import SubdomainAnalytics from './pages/SubdomainAnalytics';
import AdminRoute from './components/shared/AdminRoute';
import ModerationControls from './pages/admin/ModerationControls';
import ModerationSettings from './pages/admin/ModerationSettings';
import ReviewQueue from './pages/admin/ReviewQueue';
import ReviewHistory from './pages/admin/ReviewHistory';
import JuryPool from './pages/admin/JuryPool';
import JuryCases from './pages/admin/JuryCases';
import SubdomainLookup from './pages/admin/SubdomainLookup';
import WebCrawlerDashboard from './pages/admin/WebCrawlerDashboard';
import AnalyticsDashboard from './pages/admin/AnalyticsDashboard';
import HuTubeAnalyticsLookup from './pages/admin/HuTubeAnalyticsLookup';
import HinstaAnalyticsLookup from './pages/admin/HinstaAnalyticsLookup';
import BlogPinsManagement from './pages/admin/BlogPinsManagement';
import PinsManagement from './pages/admin/PinsManagement';
import HedditPinsManagement from './pages/admin/HedditPinsManagement';
import HuBookPinsManagement from './pages/admin/HuBookPinsManagement';
import HuTubePinsManagement from './pages/admin/HuTubePinsManagement';
import HinstaPinsManagement from './pages/admin/HinstaPinsManagement';
import SwitterPinsManagement from './pages/admin/SwitterPinsManagement';
import TagManagement from './pages/admin/TagManagement';
import UserAccounts from './pages/admin/UserAccounts';
import HuBookRouter from './pages/hubook/HuBookRouter';
import HuBookLayout from './components/hubook/HuBookLayout';
import NewsFeed from './pages/hubook/NewsFeed';
import ModerationDashboard from './pages/hubook/admin/ModerationDashboard';
import Friends from './pages/hubook/Friends';
import Photos from './pages/hubook/Photos';
import AlbumView from './pages/hubook/AlbumView';
import Messages from './pages/hubook/Messages';
import Settings from './pages/hubook/Settings';
import Notifications from './pages/hubook/Notifications';
import NotificationsPage from './pages/hubook/NotificationsPage';
import NotificationSettingsPage from './pages/hubook/NotificationSettingsPage';
import Profile from './pages/hubook/Profile';
import UserSearch from './pages/hubook/UserSearch';
import PublicUserProfile from './pages/hubook/PublicUserProfile';
import HedditRouter from './pages/heddit/HedditRouter';
import HuTubeRouter from './pages/hutube/HuTubeRouter';
import HinstaRouter from './pages/hinsta/HinstaRouter';
import SwitterRouter from './pages/switter/SwitterRouter';
import BlogRouter from './pages/blog/BlogRouter';
import Manifesto from './pages/Manifesto';
import About from './pages/About';
import SearchResults from './pages/SearchResults';
import WebsiteBuilder from './pages/builder/WebsiteBuilder';
import WebsiteBuilderV2 from './pages/builder/WebsiteBuilderV2';
import Preview from './pages/builder/Preview';
import PublicSite from './pages/PublicSite';
import GetVerified from './pages/GetVerified';
import VerificationCallback from './pages/VerificationCallback';
import VerificationReturn from './pages/VerificationReturn';
import JuryCaseReview from './pages/jury/JuryCaseReview';
import TermsOfService from './pages/TermsOfService';

function AppContent() {
  const { verificationStatusChanged, clearVerificationNotification } = useAuth();

  return (
    <>
      <div className="min-h-screen bg-white">
        <TestingModeBanner />
        <Routes>
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/auth/callback" element={<EmailVerificationCallback />} />
              <Route path="/email-not-verified" element={<EmailNotVerified />} />
              <Route path="/get-verified" element={<GetVerified />} />
              <Route path="/verification-callback" element={<VerificationCallback />} />
              <Route path="/verification-return" element={<VerificationReturn />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/make-your-own-site" element={<MakeYourOwnSite />} />

              <Route path="/builder/:subdomainId" element={
                <ErrorBoundary fallbackPath="/dashboard" fallbackMessage="The website builder encountered an error. Your work has been auto-saved.">
                  <WebsiteBuilderV2 />
                </ErrorBoundary>
              } />
              <Route path="/builder/:subdomainId/page/:pageId" element={
                <ErrorBoundary fallbackPath="/dashboard" fallbackMessage="The website builder encountered an error. Your work has been auto-saved.">
                  <WebsiteBuilderV2 />
                </ErrorBoundary>
              } />
              <Route path="/builder-v1/:subdomainId" element={<WebsiteBuilder />} />
              <Route path="/builder-v1/:subdomainId/page/:pageId" element={<WebsiteBuilder />} />
              <Route path="/preview/:subdomainId/page/:pageId" element={<Preview />} />

              <Route path="/site/:subdomain" element={<PublicSite />} />
              <Route path="/site/:subdomain/:pagePath" element={<PublicSite />} />

              <Route
                path="/dashboard"
                element={
                  <>
                    <Header />
                    <Dashboard />
                  </>
                }
              />

              <Route
                path="/edit-profile"
                element={
                  <>
                    <Header />
                    <EditProfile />
                  </>
                }
              />

              <Route
                path="/subdomain-analytics/:subdomainId"
                element={
                  <>
                    <Header />
                    <SubdomainAnalytics />
                  </>
                }
              />

              <Route
                path="/jury/case/:caseId"
                element={
                  <>
                    <Header />
                    <JuryCaseReview />
                  </>
                }
              />

              <Route
                path="/admin/moderation-controls"
                element={
                  <AdminRoute>
                    <Header />
                    <ModerationControls />
                  </AdminRoute>
                }
              />

              <Route
                path="/admin/moderation-settings"
                element={
                  <AdminRoute>
                    <ModerationSettings />
                  </AdminRoute>
                }
              />

              <Route
                path="/admin/review-queue"
                element={
                  <AdminRoute>
                    <Header />
                    <ReviewQueue />
                  </AdminRoute>
                }
              />

              <Route
                path="/admin/review-history"
                element={
                  <AdminRoute>
                    <Header />
                    <ReviewHistory />
                  </AdminRoute>
                }
              />

              <Route
                path="/admin/jury-pool"
                element={
                  <AdminRoute>
                    <Header />
                    <JuryPool />
                  </AdminRoute>
                }
              />

              <Route
                path="/admin/jury-cases"
                element={
                  <AdminRoute>
                    <Header />
                    <JuryCases />
                  </AdminRoute>
                }
              />

              <Route
                path="/admin/subdomain-lookup"
                element={
                  <AdminRoute>
                    <Header />
                    <SubdomainLookup />
                  </AdminRoute>
                }
              />

              <Route
                path="/admin/user-accounts"
                element={
                  <AdminRoute>
                    <Header />
                    <UserAccounts />
                  </AdminRoute>
                }
              />

              <Route
                path="/admin/web-crawler"
                element={
                  <AdminRoute>
                    <WebCrawlerDashboard />
                  </AdminRoute>
                }
              />

              <Route
                path="/admin/analytics"
                element={
                  <AdminRoute>
                    <AnalyticsDashboard />
                  </AdminRoute>
                }
              />

              <Route
                path="/admin/hutube-analytics"
                element={
                  <AdminRoute>
                    <HuTubeAnalyticsLookup />
                  </AdminRoute>
                }
              />

              <Route
                path="/admin/hinsta-analytics"
                element={
                  <AdminRoute>
                    <HinstaAnalyticsLookup />
                  </AdminRoute>
                }
              />

              <Route
                path="/admin/blog-pins"
                element={
                  <AdminRoute>
                    <Header />
                    <BlogPinsManagement />
                  </AdminRoute>
                }
              />

              <Route
                path="/admin/pins-management"
                element={
                  <AdminRoute>
                    <Header />
                    <PinsManagement />
                  </AdminRoute>
                }
              />

              <Route
                path="/admin/heddit-pins"
                element={
                  <AdminRoute>
                    <Header />
                    <HedditPinsManagement />
                  </AdminRoute>
                }
              />

              <Route
                path="/admin/hubook-pins"
                element={
                  <AdminRoute>
                    <Header />
                    <HuBookPinsManagement />
                  </AdminRoute>
                }
              />

              <Route
                path="/admin/hutube-pins"
                element={
                  <AdminRoute>
                    <Header />
                    <HuTubePinsManagement />
                  </AdminRoute>
                }
              />

              <Route
                path="/admin/hinsta-pins"
                element={
                  <AdminRoute>
                    <Header />
                    <HinstaPinsManagement />
                  </AdminRoute>
                }
              />

              <Route
                path="/admin/switter-pins"
                element={
                  <AdminRoute>
                    <Header />
                    <SwitterPinsManagement />
                  </AdminRoute>
                }
              />

              <Route
                path="/admin/tag-management"
                element={
                  <AdminRoute>
                    <Header />
                    <TagManagement />
                  </AdminRoute>
                }
              />

              <Route
                path="/hubook/*"
                element={
                  <HuBookRouter>
                    <HuBookLayout>
                      <Routes>
                        <Route path="/" element={<NewsFeed />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/friends" element={<Friends />} />
                        <Route path="/photos" element={<Photos />} />
                        <Route path="/albums/:albumId" element={<AlbumView />} />
                        <Route path="/messages" element={<Messages />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/notifications" element={<NotificationsPage />} />
                        <Route path="/notification-settings" element={<NotificationSettingsPage />} />
                        <Route path="/search" element={<UserSearch />} />
                        <Route path="/user/:userId" element={<PublicUserProfile />} />
                        <Route path="/admin/moderation" element={<ModerationDashboard />} />
                      </Routes>
                    </HuBookLayout>
                  </HuBookRouter>
                }
              />

              <Route path="/heddit/*" element={<HedditRouter />} />
              <Route path="/hutube/*" element={<HuTubeRouter />} />
              <Route path="/hinsta/*" element={<HinstaRouter />} />
              <Route path="/switter/*" element={<SwitterRouter />} />
              <Route path="/blog/*" element={<BlogRouter />} />

              <Route
                path="/manifesto"
                element={
                  <>
                    <Header />
                    <Manifesto />
                  </>
                }
              />

              <Route
                path="/about"
                element={
                  <>
                    <Header />
                    <About />
                  </>
                }
              />

              <Route path="/search" element={<SearchResults />} />

              <Route
                path="/"
                element={
                  <>
                    <Header />
                    <Home />
                  </>
                }
              />
            </Routes>
          </div>

          {verificationStatusChanged && (
            <VerificationStatusModal
              status={verificationStatusChanged.status}
              onClose={clearVerificationNotification}
            />
          )}
        </>
  );
}

function App() {
  return (
    <AuthProvider>
      <HuBookProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </HuBookProvider>
    </AuthProvider>
  );
}

export default App;
