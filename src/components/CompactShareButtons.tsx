import { Facebook, Twitter, MessageCircle, Mail } from 'lucide-react';

interface CompactShareButtonsProps {
  variant?: 'icons' | 'minimal' | 'inline';
  size?: 'sm' | 'md';
}

export default function CompactShareButtons({ variant = 'icons', size = 'sm' }: CompactShareButtonsProps) {
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

  const iconSize = size === 'sm' ? 14 : 16;

  if (variant === 'icons') {
    return (
      <div className="flex items-center gap-2">
        <a
          href={facebookShareUrl}
          onClick={handleShareClick(facebookShareUrl)}
          className="p-2 rounded-full bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-600 transition-colors"
          title="Share on Facebook"
        >
          <Facebook size={iconSize} />
        </a>
        <a
          href={twitterShareUrl}
          onClick={handleShareClick(twitterShareUrl)}
          className="p-2 rounded-full bg-gray-100 hover:bg-sky-100 text-gray-700 hover:text-sky-600 transition-colors"
          title="Share on X"
        >
          <Twitter size={iconSize} />
        </a>
        <a
          href={whatsappShareUrl}
          onClick={handleShareClick(whatsappShareUrl)}
          className="p-2 rounded-full bg-gray-100 hover:bg-green-100 text-gray-700 hover:text-green-600 transition-colors"
          title="Share on WhatsApp"
        >
          <MessageCircle size={iconSize} />
        </a>
        <a
          href={emailShareUrl}
          className="p-2 rounded-full bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-600 transition-colors"
          title="Share via Email"
        >
          <Mail size={iconSize} />
        </a>
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-2">Share with friends</p>
        <div className="flex items-center justify-center gap-3">
          <a
            href={facebookShareUrl}
            onClick={handleShareClick(facebookShareUrl)}
            className="text-gray-600 hover:text-blue-600 transition-colors"
            title="Facebook"
          >
            <Facebook size={18} />
          </a>
          <a
            href={twitterShareUrl}
            onClick={handleShareClick(twitterShareUrl)}
            className="text-gray-600 hover:text-sky-600 transition-colors"
            title="X"
          >
            <Twitter size={18} />
          </a>
          <a
            href={whatsappShareUrl}
            onClick={handleShareClick(whatsappShareUrl)}
            className="text-gray-600 hover:text-green-600 transition-colors"
            title="WhatsApp"
          >
            <MessageCircle size={18} />
          </a>
          <a
            href={emailShareUrl}
            className="text-gray-600 hover:text-orange-600 transition-colors"
            title="Email"
          >
            <Mail size={18} />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 text-sm">
      <span className="text-gray-600">Share:</span>
      <a
        href={facebookShareUrl}
        onClick={handleShareClick(facebookShareUrl)}
        className="text-blue-600 hover:text-blue-700 transition-colors"
      >
        Facebook
      </a>
      <span className="text-gray-400">•</span>
      <a
        href={twitterShareUrl}
        onClick={handleShareClick(twitterShareUrl)}
        className="text-sky-600 hover:text-sky-700 transition-colors"
      >
        X
      </a>
      <span className="text-gray-400">•</span>
      <a
        href={whatsappShareUrl}
        onClick={handleShareClick(whatsappShareUrl)}
        className="text-green-600 hover:text-green-700 transition-colors"
      >
        WhatsApp
      </a>
      <span className="text-gray-400">•</span>
      <a
        href={emailShareUrl}
        className="text-orange-600 hover:text-orange-700 transition-colors"
      >
        Email
      </a>
    </div>
  );
}
