export default function PortalBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="portalGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.3" />
            <stop offset="30%" stopColor="#1e40af" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#0f172a" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#020617" stopOpacity="1" />
          </radialGradient>

          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <rect width="100%" height="100%" fill="#0a0e1a" />

        <ellipse cx="50%" cy="50%" rx="45%" ry="45%" fill="url(#portalGradient)" opacity="0.6">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 50 50"
            to="360 50 50"
            dur="60s"
            repeatCount="indefinite"
          />
        </ellipse>

        <g filter="url(#glow)">
          {[...Array(80)].map((_, i) => {
            const angle = (i * 137.5) % 360;
            const distance = 10 + (i % 40);
            const x = 50 + distance * Math.cos((angle * Math.PI) / 180);
            const y = 50 + distance * Math.sin((angle * Math.PI) / 180);
            const size = 0.1 + Math.random() * 0.3;
            const duration = 3 + Math.random() * 7;
            const delay = Math.random() * 5;
            const opacity = 0.4 + Math.random() * 0.6;

            return (
              <g key={i}>
                <line
                  x1="50%"
                  y1="50%"
                  x2={`${x}%`}
                  y2={`${y}%`}
                  stroke="#60a5fa"
                  strokeWidth={size}
                  opacity={opacity}
                  strokeLinecap="round"
                >
                  <animate
                    attributeName="opacity"
                    values={`0;${opacity};0`}
                    dur={`${duration}s`}
                    begin={`${delay}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="stroke"
                    values="#3b82f6;#60a5fa;#93c5fd;#60a5fa;#3b82f6"
                    dur={`${duration}s`}
                    begin={`${delay}s`}
                    repeatCount="indefinite"
                  />
                </line>
                <circle
                  cx={`${x}%`}
                  cy={`${y}%`}
                  r={size * 2}
                  fill="#93c5fd"
                  opacity={opacity}
                >
                  <animate
                    attributeName="opacity"
                    values={`0;${opacity * 1.5};0`}
                    dur={`${duration}s`}
                    begin={`${delay}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="r"
                    values={`${size};${size * 3};${size}`}
                    dur={`${duration}s`}
                    begin={`${delay}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              </g>
            );
          })}
        </g>

        {[...Array(120)].map((_, i) => {
          const spiralTurns = 3;
          const t = i / 120;
          const angle = t * spiralTurns * 360;
          const distance = 5 + t * 45;
          const x = 50 + distance * Math.cos((angle * Math.PI) / 180);
          const y = 50 + distance * Math.sin((angle * Math.PI) / 180);
          const size = 0.15 + Math.random() * 0.25;
          const rotationSpeed = 20 + Math.random() * 20;

          return (
            <circle
              key={`spiral-${i}`}
              cx={`${x}%`}
              cy={`${y}%`}
              r={size}
              fill="#3b82f6"
              opacity="0.5"
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                from={`0 50 50`}
                to={`360 50 50`}
                dur={`${rotationSpeed}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.3;0.8;0.3"
                dur={`${rotationSpeed / 2}s`}
                repeatCount="indefinite"
              />
            </circle>
          );
        })}

        {[...Array(30)].map((_, i) => {
          const angle = (i * 12) % 360;
          const x = 50 + 48 * Math.cos((angle * Math.PI) / 180);
          const y = 50 + 48 * Math.sin((angle * Math.PI) / 180);
          const size = 0.5 + Math.random() * 0.8;

          return (
            <circle
              key={`star-${i}`}
              cx={`${x}%`}
              cy={`${y}%`}
              r={size}
              fill="#ffffff"
              opacity="0.8"
            >
              <animate
                attributeName="opacity"
                values="0.3;1;0.3"
                dur={`${2 + Math.random() * 3}s`}
                repeatCount="indefinite"
              />
            </circle>
          );
        })}
      </svg>
    </div>
  );
}
