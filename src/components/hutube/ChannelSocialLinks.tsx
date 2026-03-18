import { Globe, CheckCircle2 } from 'lucide-react';

interface ChannelSocialLinksProps {
  website?: string | null;
  switterHandle?: string | null;
  hinstaUsername?: string | null;
  hubookUserId?: string | null;
  socialLinksPrivacy?: {
    show_switter?: boolean;
    show_hinsta?: boolean;
    show_hubook?: boolean;
  };
  socialLinksVerification?: {
    switter?: {
      exists?: boolean;
      is_owned_by_user?: boolean;
      verified_badge?: boolean;
    };
    hinsta?: {
      exists?: boolean;
      is_owned_by_user?: boolean;
      is_private?: boolean;
    };
    hubook?: {
      exists?: boolean;
      is_owned_by_user?: boolean;
      profile_visibility?: string;
    };
  };
}

export default function ChannelSocialLinks({
  website,
  switterHandle,
  hinstaUsername,
  hubookUserId,
  socialLinksPrivacy = {},
  socialLinksVerification = {}
}: ChannelSocialLinksProps) {
  const links = [];

  if (
    switterHandle &&
    socialLinksPrivacy.show_switter &&
    socialLinksVerification.switter?.exists &&
    socialLinksVerification.switter?.is_owned_by_user
  ) {
    links.push({
      platform: 'Switter',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z"/>
        </svg>
      ),
      text: 'Follow on Switter',
      url: `/switter/${switterHandle}`,
      bgColor: 'bg-blue-500 hover:bg-blue-600',
      verified: socialLinksVerification.switter?.verified_badge === true
    });
  }

  if (
    hinstaUsername &&
    socialLinksPrivacy.show_hinsta &&
    socialLinksVerification.hinsta?.exists &&
    socialLinksVerification.hinsta?.is_owned_by_user &&
    !socialLinksVerification.hinsta?.is_private
  ) {
    links.push({
      platform: 'Hinsta',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
          <circle cx="12" cy="12" r="4" fill="white"/>
          <circle cx="18" cy="6" r="1.5" fill="white"/>
        </svg>
      ),
      text: 'Follow on Hinsta',
      url: `/hinsta/${hinstaUsername}`,
      bgColor: 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-90',
      verified: false
    });
  }

  if (
    hubookUserId &&
    socialLinksPrivacy.show_hubook &&
    socialLinksVerification.hubook?.exists &&
    socialLinksVerification.hubook?.is_owned_by_user &&
    socialLinksVerification.hubook?.profile_visibility === 'public'
  ) {
    links.push({
      platform: 'HuBook',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
      text: 'Connect on HuBook',
      url: `/hubook/user/${hubookUserId}`,
      bgColor: 'bg-blue-600 hover:bg-blue-700',
      verified: false
    });
  }

  if (website) {
    try {
      const url = new URL(website);
      const domain = url.hostname.replace('www.', '');

      links.push({
        platform: 'Website',
        icon: <Globe className="w-4 h-4" />,
        text: domain,
        url: website,
        bgColor: 'bg-gray-600 hover:bg-gray-700',
        external: true,
        verified: false
      });
    } catch {
    }
  }

  if (links.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Connect</h3>
      <div className="flex flex-wrap gap-3">
        {links.map((link) => (
          <a
            key={link.platform}
            href={link.url}
            target={link.external ? '_blank' : undefined}
            rel={link.external ? 'noopener noreferrer' : undefined}
            className={`${link.bgColor} text-white px-4 py-2 rounded-full flex items-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md group relative`}
          >
            {link.icon}
            <span className="text-sm font-medium">{link.text}</span>
            {link.verified && (
              <CheckCircle2 className="w-3.5 h-3.5 absolute -top-1 -right-1 bg-white rounded-full text-green-600" />
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
