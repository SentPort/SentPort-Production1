import { Facebook, Twitter, MessageCircle, Mail } from 'lucide-react';

export default function ShareSection() {
  const siteUrl = "https://sentport.com";

  const facebookMessage = 'Tired of bots, fake accounts, and algorithmic manipulation? Join the Human Internet at Sentient Portal - where every user is verified as human. Experience social media the way it should be: HuTube, Heddit, HuBook, Hinsta, Switter, and HuBlog. No bots. No AI spam. Just real people. Come help us build a better internet!';

  const twitterMessage = 'Bot farms. Fake AI accounts. Algorithm manipulation. Had enough?\n\nJoin the Human Internet at Sentient Portal - verified humans only. Real social media: HuTube, Heddit, HuBook, Hinsta, Switter, HuBlog.\n\nNo bots. No slop. Just people.';

  const whatsappMessage = 'Found this awesome FREE social network - verified humans only, no bots or slop! Like the old internet. Check it out!';

  const emailMessage = 'Reclaiming the internet for real human voices in an age of bot-farms, mass-produced fake AI accounts, and exploitative algorithmic manipulation.\n\nCome to Sentient Portal and join the human-only Internet! Discover social media ecosystems where every user is verified as human and there is no disingenuous algorithmic manipulation to boost fake content. Sentient Portal offers a "new internet" search engine and social sites that promote verified-human content - no bots or machine-generated media. We offer free subdomains and a full website builder to our free verified users, which are then prioritized in our search results for being verifiably human - a new way to rank content! Connect authentically on HuTube, Heddit, HuBook, Hinsta, Switter, and HuBlog. Be part of building a better internet! An internet that feels like something from the past!';

  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(siteUrl)}&quote=${encodeURIComponent(facebookMessage)}`;
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterMessage + '\n\n' + siteUrl)}`;
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage + '\n\n' + siteUrl)}`;
  const emailShareUrl = `mailto:?subject=${encodeURIComponent('Join the Human Internet!')}&body=${encodeURIComponent(emailMessage + '\n\n' + siteUrl)}`;

  const handleShareClick = (url: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.open(url, 'share-dialog', 'width=600,height=400,toolbar=no,menubar=no,scrollbars=yes,resizable=yes');
  };

  return (
    <section className="bg-gradient-to-br from-emerald-500 to-teal-600 py-16">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-white text-4xl font-bold mb-4">
          Love the Human Internet? Spread the Word!
        </h2>
        <p className="text-white text-lg mb-8">
          Help us grow the verified-human web by inviting your friends and family
        </p>

        <div className="flex justify-center space-x-4 flex-wrap gap-4">
          <a
            href={facebookShareUrl}
            onClick={handleShareClick(facebookShareUrl)}
            className="bg-white hover:bg-gray-100 text-gray-800 px-6 py-3 rounded-lg font-semibold flex items-center space-x-2 transition-colors"
          >
            <Facebook size={20} />
            <span>Share on Facebook</span>
          </a>
          <a
            href={twitterShareUrl}
            onClick={handleShareClick(twitterShareUrl)}
            className="bg-white hover:bg-gray-100 text-gray-800 px-6 py-3 rounded-lg font-semibold flex items-center space-x-2 transition-colors"
          >
            <Twitter size={20} />
            <span>Share on X</span>
          </a>
          <a
            href={whatsappShareUrl}
            onClick={handleShareClick(whatsappShareUrl)}
            className="bg-white hover:bg-gray-100 text-gray-800 px-6 py-3 rounded-lg font-semibold flex items-center space-x-2 transition-colors"
          >
            <MessageCircle size={20} />
            <span>Share on WhatsApp</span>
          </a>
          <a
            href={emailShareUrl}
            className="bg-white hover:bg-gray-100 text-gray-800 px-6 py-3 rounded-lg font-semibold flex items-center space-x-2 transition-colors"
          >
            <Mail size={20} />
            <span>Email</span>
          </a>
        </div>
      </div>
    </section>
  );
}
