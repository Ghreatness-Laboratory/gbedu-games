import React from 'react';

interface GbeduLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  layout?: 'vertical' | 'horizontal';
  className?: string;
  iconOnly?: boolean;
}

export const GbeduLogo: React.FC<GbeduLogoProps> = ({
  size = 'md',
  showText = true,
  layout = 'horizontal',
  className = '',
  iconOnly = false,
}) => {
  const iconDimensions = {
    xs: 'w-7 h-7',
    sm: 'w-9 h-9',
    md: 'w-11 h-11',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  }[size];

  const textStyles = {
    xs: { main: 'text-sm', sub: 'text-[8px] tracking-[0.25em]' },
    sm: { main: 'text-base', sub: 'text-[9px] tracking-[0.28em]' },
    md: { main: 'text-xl', sub: 'text-[10px] tracking-[0.32em]' },
    lg: { main: 'text-3xl', sub: 'text-xs tracking-[0.35em]' },
    xl: { main: 'text-5xl', sub: 'text-base tracking-[0.4em]' },
  }[size];

  return (
    <div
      className={`flex ${
        layout === 'vertical' ? 'flex-col items-center text-center' : 'items-center'
      } gap-2.5 ${className}`}
    >
      {/* Official Gbedu Games Controller & Soundwave Symbol */}
      <div className={`relative shrink-0 ${iconDimensions} flex items-center justify-center`}>
        <svg
          viewBox="0 0 500 360"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_4px_12px_rgba(0,154,73,0.25)]"
        >
          {/* Sound Waveform at Top */}
          <g strokeWidth="14" strokeLinecap="round" strokeLinejoin="round">
            {/* Emerald Green Waveform Peak */}
            <path
              d="M 130 90 L 165 90 L 180 70 L 198 102 L 216 48 L 230 120 L 246 14 L 250 102"
              stroke="#009A49"
            />
            {/* Vibrant Orange Waveform Peak */}
            <path
              d="M 250 102 L 256 26 L 272 102 L 286 60 L 302 90 L 315 80 L 330 90 L 370 90"
              stroke="#FF7900"
            />
          </g>

          {/* Controller Body */}
          <g>
            <path
              d="M 185 120 
                 C 198 116, 218 110, 250 125 
                 C 282 110, 302 116, 315 120 
                 C 328 125, 342 142, 348 165 
                 C 356 198, 368 240, 362 268 
                 C 358 286, 340 292, 324 276 
                 C 305 258, 292 222, 280 226 
                 C 268 230, 260 242, 250 242 
                 C 240 242, 232 230, 220 226 
                 C 208 222, 195 258, 176 276 
                 C 160 292, 142 286, 138 268 
                 C 132 240, 144 198, 152 165 
                 C 158 142, 172 125, 185 120 Z"
              fill="#0D131A"
              stroke="#2A3847"
              strokeWidth="6"
            />

            {/* Center Chevron Stripes */}
            <path
              d="M 224 140 L 250 172 L 276 140"
              fill="none"
              stroke="#009A49"
              strokeWidth="9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M 232 127 L 250 151 L 268 127"
              fill="none"
              stroke="#FF7900"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Left Grip Chevron Patterns */}
            <path
              d="M 148 228 L 168 212 L 180 230"
              fill="none"
              stroke="#009A49"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M 143 248 L 164 233"
              fill="none"
              stroke="#FF7900"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <polygon points="168,226 177,242 160,242" fill="#FF7900" />
            <line
              x1="184"
              y1="202"
              x2="198"
              y2="226"
              stroke="#009A49"
              strokeWidth="6"
              strokeLinecap="round"
            />

            {/* Right Grip Chevron Patterns */}
            <path
              d="M 352 228 L 332 212 L 320 230"
              fill="none"
              stroke="#009A49"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M 357 248 L 336 233"
              fill="none"
              stroke="#FF7900"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <polygon points="332,226 340,242 323,242" fill="#009A49" />
            <line
              x1="316"
              y1="202"
              x2="302"
              y2="226"
              stroke="#FF7900"
              strokeWidth="6"
              strokeLinecap="round"
            />

            {/* Left Controls (Emerald Green) */}
            <rect x="180" y="157" width="10" height="28" rx="4" fill="#009A49" />
            <rect x="171" y="166" width="28" height="10" rx="4" fill="#009A49" />
            <circle cx="212" cy="198" r="15" fill="#009A49" />

            {/* Right Controls (Vibrant Orange) */}
            <circle cx="248" cy="204" r="15" fill="#FF7900" />
            <rect
              x="296"
              y="142"
              width="13"
              height="13"
              rx="2"
              transform="rotate(45 302 148)"
              fill="#FF7900"
            />
            <rect x="277" y="161" width="12" height="12" rx="2" fill="#FF7900" />
            <circle cx="325" cy="167" r="7" fill="#FF7900" />
            <polygon points="302,182 310,195 294,195" fill="#FF7900" />
          </g>
        </svg>
      </div>

      {/* Typography: GBEDU GAMES */}
      {showText && !iconOnly && (
        <div className="flex flex-col select-none leading-none">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-black tracking-tight text-white font-display ${textStyles.main}`}
            >
              GBEDU
            </span>
            <span
              className={`font-black tracking-tight text-[#FF7900] font-display ${textStyles.main}`}
            >
              GAMES
            </span>
          </div>
          <span
            className={`font-extrabold uppercase text-gray-400 font-mono mt-0.5 ${textStyles.sub}`}
          >
            PLAY • CONNECT • WIN
          </span>
        </div>
      )}
    </div>
  );
};
