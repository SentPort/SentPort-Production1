import { usePageTracking } from '../hooks/usePageTracking';
import HeroSection from '../components/HeroSection';
import SocialIconsSection from '../components/SocialIconsSection';
import FeaturesSection from '../components/FeaturesSection';
import ShareSection from '../components/ShareSection';
import JoinSection from '../components/JoinSection';
import Footer from '../components/Footer';

export default function Home() {
  usePageTracking('homepage');

  return (
    <div className="overflow-x-hidden w-full">
      <HeroSection />
      <SocialIconsSection />
      <FeaturesSection />
      <ShareSection />
      <JoinSection />
      <Footer />
    </div>
  );
}
