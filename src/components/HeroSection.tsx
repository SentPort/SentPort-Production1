import { useNavigate } from 'react-router-dom';
import { SearchWithHistory } from './shared/SearchWithHistory';
import JuryPoolVolunteerButton from './shared/JuryPoolVolunteerButton';

export default function HeroSection() {
  const navigate = useNavigate();

  const handleSearch = (query: string) => {
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}&external=false`);
    }
  };

  const handleFeelingHuman = () => {
    navigate('/search?q=human&external=false');
  };

  return (
    <section className="relative bg-gray-300 py-32">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://images.pexels.com/photos/1629236/pexels-photo-1629236.jpeg?auto=compress&cs=tinysrgb&w=1920)',
          opacity: 0.9
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/30" />

      <div className="relative max-w-4xl mx-auto px-4 text-center">
        <div className="flex justify-center mb-6">
          <img
            src="/sentient-portal-logo.png"
            alt="Sentient Portal Logo"
            className="h-48 w-auto drop-shadow-2xl"
          />
        </div>

        <h2 className="text-white text-3xl font-semibold mb-4 drop-shadow-lg tracking-wide">
          Bringing The Internet Back to Life
        </h2>

        <p className="text-white text-lg font-light tracking-wide drop-shadow-sm opacity-90 mb-8">
          Welcome to Sentient Portal, the new internet, unapologetically human!
        </p>

        <SearchWithHistory
          platform="main"
          onSearch={handleSearch}
          placeholder="Search the Human-Only Web"
          variant="main"
          className="mb-6"
        />

        <div className="flex justify-center space-x-4 mb-8">
          <button
            type="button"
            onClick={() => navigate('/search')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold shadow-lg transition-all"
          >
            SentPort Search
          </button>
          <button
            type="button"
            onClick={handleFeelingHuman}
            className="bg-white hover:bg-gray-100 text-gray-800 px-8 py-3 rounded-lg font-semibold shadow-lg transition-all"
          >
            I'm Feeling Human
          </button>
        </div>

        <JuryPoolVolunteerButton requireVerified={true} variant="homepage" />
      </div>
    </section>
  );
}
