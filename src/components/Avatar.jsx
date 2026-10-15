import React, { useState, useId } from 'react';
import {
  SKIN_TONES,
  AURAS,
  getPresetById,
  parseAvatarConfig,
} from '../data/avatarData';

/**
 * Avatar Component - Gbedu Games
 * Renders a bold, flat-cartoon layered SVG character with soft gradients,
 * big expressive eyes, confident smirk, animated aura ring, and Gen Z energy.
 * Supports:
 * - Direct config: { skin, hair, outfit, accessory, aura, size }
 * - Preset ID: avatarId="avatar-01" to "avatar-12"
 * - Avatar string / JSON / emoji / image URL via avatarUrl
 * - Interactive hover / tap sparkles and hype bounce
 * - Respects prefers-reduced-motion
 */
const Avatar = React.memo(({
  skin,
  hair,
  outfit,
  accessory,
  aura,
  size = 'md',
  avatarId,
  config,
  avatarUrl,
  username = 'player',
  className = '',
  interactive = true,
  showAura = true,
  onClick,
}) => {
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isTapped, setIsTapped] = useState(false);
  const uniqueId = useId().replace(/:/g, '');

  // 1. Resolve configuration from all possible input styles
  let resolvedConfig;
  if (config) {
    resolvedConfig = config;
  } else if (skin || hair || outfit || accessory || aura) {
    const base = getPresetById('avatar-01').config;
    resolvedConfig = {
      skin: skin || base.skin,
      hair: hair || base.hair,
      outfit: outfit || base.outfit,
      accessory: accessory || base.accessory,
      aura: aura || base.aura,
    };
  } else if (avatarId) {
    resolvedConfig = getPresetById(avatarId).config;
  } else if (avatarUrl) {
    resolvedConfig = parseAvatarConfig(avatarUrl, 'avatar-01');
  } else {
    resolvedConfig = getPresetById('avatar-01').config;
  }

  // 2. Map color definitions
  const skinData = SKIN_TONES.find((s) => s.id === resolvedConfig.skin) || SKIN_TONES[2];
  const auraData = AURAS.find((a) => a.id === resolvedConfig.aura) || AURAS[0];

  // 3. Resolve pixel size
  let dimension = 48;
  if (typeof size === 'number') {
    dimension = size;
  } else {
    switch (size) {
      case 'xs': dimension = 28; break;
      case 'sm': dimension = 36; break;
      case 'md': dimension = 48; break;
      case 'lg': dimension = 64; break;
      case 'xl': dimension = 96; break;
      case '2xl': dimension = 130; break;
      case '3xl': dimension = 180; break;
      case 'preview': dimension = 220; break;
      default: dimension = 48;
    }
  }

  // Handle external image fallback if avatarUrl is a direct image path and hasn't failed
  const isDirectImage = typeof avatarUrl === 'string' &&
    (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://') || avatarUrl.startsWith('/avatars/')) &&
    !imgError;

  const handleClick = (e) => {
    setIsTapped(true);
    setTimeout(() => setIsTapped(false), 500);
    if (onClick) onClick(e);
  };

  if (isDirectImage) {
    return (
      <div
        style={{ width: dimension, height: dimension }}
        className={`relative rounded-full flex items-center justify-center select-none ${
          interactive ? 'cursor-pointer transition-transform hover:scale-105 active:scale-95' : ''
        } ${className}`}
        onClick={handleClick}
      >
        {showAura && (
          <div
            className="absolute -inset-1 rounded-full animate-aura-pulse blur-sm"
            style={{
              background: `radial-gradient(circle, ${auraData.color1} 0%, ${auraData.color2} 70%, transparent 100%)`,
            }}
          />
        )}
        <img
          src={avatarUrl}
          alt={username}
          loading="lazy"
          decoding="async"
          onError={() => setImgError(true)}
          className="relative z-10 w-full h-full rounded-full object-cover border-2 border-white/20 shadow-md"
        />
      </div>
    );
  }

  // Pure Vector Layered SVG Character
  const auraGradId = `aura-grad-${uniqueId}`;
  const auraBlurId = `aura-blur-${uniqueId}`;
  const skinGradId = `skin-grad-${uniqueId}`;
  const eyeGradId = `eye-grad-${uniqueId}`;

  return (
    <div
      style={{ width: dimension, height: dimension }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      className={`relative inline-flex items-center justify-center select-none shrink-0 ${
        interactive ? 'cursor-pointer transition-transform duration-300 hover:scale-105 active:scale-95' : ''
      } ${isTapped ? 'scale-110' : ''} ${className}`}
    >
      {/* Floating Sparkle Particles on Hover/Tap */}
      {(isHovered || isTapped) && interactive && (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-visible">
          <span className="absolute -top-1 -right-1 text-xs animate-bounce text-amber-300">✨</span>
          <span className="absolute -bottom-1 -left-1 text-[10px] animate-pulse text-pink-400">⚡</span>
          <span className="absolute top-1/2 -left-2 text-[10px] animate-bounce text-cyan-300">★</span>
        </div>
      )}

      <svg
        viewBox="0 0 200 200"
        width="100%"
        height="100%"
        className="w-full h-full overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* 1. Aura Radial & Linear Gradients */}
          <radialGradient id={auraGradId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={auraData.color1} stopOpacity="0.9" />
            <stop offset="70%" stopColor={auraData.color2} stopOpacity="0.6" />
            <stop offset="100%" stopColor={auraData.color1} stopOpacity="0" />
          </radialGradient>

          {/* SVG Aura Glow Filter */}
          <filter id={auraBlurId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* 2. Skin Tone Gradient */}
          <linearGradient id={skinGradId} x1="30%" y1="0%" x2="70%" y2="100%">
            <stop offset="0%" stopColor={skinData.highlight} />
            <stop offset="45%" stopColor={skinData.fill} />
            <stop offset="100%" stopColor={skinData.shadow} />
          </linearGradient>

          {/* 3. Eye Depth Gradient */}
          <linearGradient id={eyeGradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#451a03" />
            <stop offset="100%" stopColor="#1e0902" />
          </linearGradient>

          {/* Ankara Wax Print Pattern for Hoodie */}
          <pattern id={`ankara-pattern-${uniqueId}`} width="18" height="18" patternUnits="userSpaceOnUse">
            <rect width="18" height="18" fill="#d97706" />
            <polygon points="0,0 9,0 0,9" fill="#047857" />
            <polygon points="9,9 18,9 9,18" fill="#be123c" />
            <polygon points="0,9 9,18 0,18" fill="#f59e0b" />
            <circle cx="9" cy="9" r="2.5" fill="#fef08a" />
          </pattern>

          {/* Kente Woven Pattern */}
          <pattern id={`kente-pattern-${uniqueId}`} width="14" height="14" patternUnits="userSpaceOnUse">
            <rect width="14" height="14" fill="#0f172a" />
            <rect x="0" y="0" width="7" height="7" fill="#eab308" />
            <rect x="7" y="7" width="7" height="7" fill="#15803d" />
            <line x1="0" y1="7" x2="14" y2="7" stroke="#b91c1c" strokeWidth="1.5" />
          </pattern>
        </defs>

        {/* ================= LAYER 1: AURA GLOW RING ================= */}
        {showAura && (
          <g className="avatar-aura-group">
            {/* Soft Ambient Radial Halo */}
            <circle
              cx="100"
              cy="98"
              r="86"
              fill={`url(#${auraGradId})`}
              className="animate-aura-pulse"
              opacity="0.85"
            />
            {/* Crisp Glowing Ring */}
            <circle
              cx="100"
              cy="98"
              r="82"
              fill="none"
              stroke={auraData.color1}
              strokeWidth="5"
              strokeOpacity="0.8"
              filter={`url(#${auraBlurId})`}
              className="animate-aura-pulse"
            />
            {/* Subtle Rotating Dotted Orbital Ring */}
            <circle
              cx="100"
              cy="98"
              r="78"
              fill="none"
              stroke={auraData.color2}
              strokeWidth="2.5"
              strokeDasharray="10 8"
              strokeOpacity="0.7"
              className="animate-aura-rotate"
            />
          </g>
        )}

        {/* ================= LAYER 2: CHARACTER CONTAINER (BOB) ================= */}
        <g className="animate-avatar-bob">
          {/* --- LAYER 2A: BACK HAIR (Braids & Locs behind shoulders) --- */}
          {resolvedConfig.hair === 'braids' && (
            <g className="hair-back">
              {/* Left flowing braids */}
              <path d="M50 85 Q35 125 42 175 Q46 178 52 175 Q45 125 60 92 Z" fill="#171717" />
              <path d="M42 90 Q28 135 34 180 Q38 183 44 180 Q38 135 52 98 Z" fill="#0a0a0a" />
              <circle cx="47" cy="170" r="3.5" fill="#f59e0b" />
              <circle cx="39" cy="176" r="3.5" fill="#fbbf24" />

              {/* Right flowing braids */}
              <path d="M150 85 Q165 125 158 175 Q154 178 148 175 Q155 125 140 92 Z" fill="#171717" />
              <path d="M158 90 Q172 135 166 180 Q162 183 156 180 Q162 135 148 98 Z" fill="#0a0a0a" />
              <circle cx="153" cy="170" r="3.5" fill="#f59e0b" />
              <circle cx="161" cy="176" r="3.5" fill="#fbbf24" />
            </g>
          )}

          {resolvedConfig.hair === 'locs' && (
            <g className="hair-back">
              <path d="M48 85 C32 115 36 155 45 185 C50 187 56 184 54 178 C46 150 44 115 58 92 Z" fill="#1f1a17" />
              <path d="M152 85 C168 115 164 155 155 185 C150 187 144 184 146 178 C154 150 156 115 142 92 Z" fill="#1f1a17" />
              {/* Gold Wire Wraps on Locs */}
              <line x1="39" y1="130" x2="48" y2="134" stroke="#f59e0b" strokeWidth="2.5" />
              <line x1="41" y1="145" x2="50" y2="149" stroke="#fbbf24" strokeWidth="2.5" />
              <line x1="161" y1="130" x2="152" y2="134" stroke="#f59e0b" strokeWidth="2.5" />
              <line x1="159" y1="145" x2="150" y2="149" stroke="#fbbf24" strokeWidth="2.5" />
            </g>
          )}

          {/* --- LAYER 2B: NECK & THROAT --- */}
          <g className="neck">
            <path
              d="M82 110 L82 142 Q100 150 118 142 L118 110 Z"
              fill={skinData.shadow}
            />
            {/* Throat highlight */}
            <path
              d="M87 114 L87 138 Q100 144 113 138 L113 114 Z"
              fill={`url(#${skinGradId})`}
            />
          </g>

          {/* --- LAYER 2C: OUTFITS (Torso & Shoulders) --- */}
          {resolvedConfig.outfit === 'ankara-hoodie' && (
            <g className="outfit-ankara-hoodie">
              {/* Torso Base */}
              <path
                d="M40 185 C45 145 68 135 100 135 C132 135 155 145 160 185 L160 200 L40 200 Z"
                fill={`url(#ankara-pattern-${uniqueId})`}
                stroke="#b45309"
                strokeWidth="2"
              />
              {/* Folded Hood Collar */}
              <path
                d="M66 142 C72 132 85 130 100 130 C115 130 128 132 134 142 C125 158 75 158 66 142 Z"
                fill="#b45309"
              />
              {/* White Drawstrings */}
              <path d="M88 144 Q86 160 84 174" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
              <circle cx="84" cy="175" r="2.5" fill="#f59e0b" />
              <path d="M112 144 Q114 160 116 174" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
              <circle cx="116" cy="175" r="2.5" fill="#f59e0b" />
            </g>
          )}

          {resolvedConfig.outfit === 'football-jersey' && (
            <g className="outfit-football-jersey">
              {/* Base Green Jersey */}
              <path
                d="M40 185 C45 145 68 135 100 135 C132 135 155 145 160 185 L160 200 L40 200 Z"
                fill="#059669"
              />
              {/* Naija 94 Feather Chevrons */}
              <path d="M52 165 L68 152 L68 162 L52 175 Z" fill="#ffffff" />
              <path d="M68 152 L84 142 L84 152 L68 162 Z" fill="#ffffff" />
              <path d="M148 165 L132 152 L132 162 L148 175 Z" fill="#ffffff" />
              <path d="M132 152 L116 142 L116 152 L132 162 Z" fill="#ffffff" />
              {/* Golden Super Eagles Crest */}
              <circle cx="78" cy="170" r="5" fill="#f59e0b" />
              <polygon points="78,166 81,173 75,173" fill="#ffffff" />
              {/* V-Neck Ribbed Collar */}
              <polygon points="100,154 84,136 116,136" fill="#111827" />
              <polygon points="100,150 88,136 112,136" fill="#047857" />
            </g>
          )}

          {resolvedConfig.outfit === 'kente-jacket' && (
            <g className="outfit-kente-jacket">
              {/* Bomber Black Torso */}
              <path
                d="M40 185 C45 145 68 135 100 135 C132 135 155 145 160 185 L160 200 L40 200 Z"
                fill="#0f172a"
              />
              {/* Center Zipper Stripe */}
              <line x1="100" y1="140" x2="100" y2="200" stroke="#f59e0b" strokeWidth="3" />
              {/* Left and Right Kente Trim Bands */}
              <rect x="80" y="142" width="16" height="58" fill={`url(#kente-pattern-${uniqueId})`} />
              <rect x="104" y="142" width="16" height="58" fill={`url(#kente-pattern-${uniqueId})`} />
              {/* Bomber Ribbed Collar */}
              <path d="M74 140 C82 134 118 134 126 140 C116 147 84 147 74 140 Z" fill="#1e293b" />
            </g>
          )}

          {resolvedConfig.outfit === 'streetwear-tee' && (
            <g className="outfit-streetwear-tee">
              {/* Boxy Heavyweight Tee */}
              <path
                d="M40 185 C45 145 68 135 100 135 C132 135 155 145 160 185 L160 200 L40 200 Z"
                fill="#18181b"
              />
              {/* Thick Ribbed Crew Collar */}
              <path d="M78 138 C84 146 116 146 122 138 C116 133 84 133 78 138 Z" fill="#27272a" stroke="#3f3f46" strokeWidth="1" />
              {/* Neon "GBEDU" Graffiti Chest Print */}
              <text
                x="100"
                y="172"
                fill="#f59e0b"
                fontSize="11"
                fontWeight="900"
                fontFamily="Impact, sans-serif"
                textAnchor="middle"
                letterSpacing="1"
              >
                GBEDU
              </text>
              <line x1="82" y1="176" x2="118" y2="176" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" />
            </g>
          )}

          {resolvedConfig.outfit === 'agbada-top' && (
            <g className="outfit-agbada-top">
              {/* Flowing Wide Agbada Shoulders */}
              <path
                d="M32 188 C38 142 66 132 100 132 C134 132 162 142 168 188 L168 200 L32 200 Z"
                fill="#ffffff"
                stroke="#e2e8f0"
                strokeWidth="1.5"
              />
              {/* Deep V-Collar with Golden Threadwork */}
              <path d="M100 168 L80 134 L120 134 Z" fill="#f8fafc" stroke="#f59e0b" strokeWidth="2.5" />
              {/* Intricate Gold Cord Chain Loops */}
              <circle cx="100" cy="148" r="4" fill="none" stroke="#d97706" strokeWidth="2" />
              <circle cx="94" cy="156" r="3" fill="none" stroke="#d97706" strokeWidth="1.5" />
              <circle cx="106" cy="156" r="3" fill="none" stroke="#d97706" strokeWidth="1.5" />
              <path d="M100 160 L100 188" stroke="#f59e0b" strokeWidth="3" strokeDasharray="3 2" />
            </g>
          )}

          {resolvedConfig.outfit === 'denim-jacket' && (
            <g className="outfit-denim-jacket">
              {/* Indigo Denim Base */}
              <path
                d="M40 185 C45 145 68 135 100 135 C132 135 155 145 160 185 L160 200 L40 200 Z"
                fill="#1e3a8a"
              />
              {/* Yellow Stitch Seams */}
              <line x1="72" y1="150" x2="72" y2="200" stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="2 2" />
              <line x1="128" y1="150" x2="128" y2="200" stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="2 2" />
              {/* Shearling Wool Collar */}
              <path
                d="M72 138 C70 148 85 152 94 146 L100 152 L106 146 C115 152 130 148 128 138 C118 132 82 132 72 138 Z"
                fill="#f1f5f9"
                stroke="#cbd5e1"
                strokeWidth="1.5"
              />
              {/* Brass Pocket Buttons */}
              <circle cx="68" cy="165" r="3" fill="#d97706" />
              <circle cx="132" cy="165" r="3" fill="#d97706" />
            </g>
          )}

          {/* --- LAYER 2D: NECK ACCESSORIES (Gold Chain or DJ Headphones) --- */}
          {resolvedConfig.accessory === 'gold-chain' && (
            <g className="accessory-gold-chain">
              <path
                d="M80 140 Q100 166 120 140"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="4"
                strokeDasharray="4 2"
              />
              <path
                d="M82 140 Q100 164 118 140"
                fill="none"
                stroke="#fef08a"
                strokeWidth="1.5"
              />
              {/* Medallion */}
              <circle cx="100" cy="164" r="6" fill="#f59e0b" stroke="#78350f" strokeWidth="1.5" />
              <circle cx="100" cy="164" r="4" fill="#fbbf24" />
              <text x="100" y="167" fill="#78350f" fontSize="6" fontWeight="bold" textAnchor="middle">★</text>
            </g>
          )}

          {resolvedConfig.accessory === 'headphones' && (
            <g className="accessory-headphones">
              {/* Headphone Band around Neck */}
              <path
                d="M62 130 C60 162 140 162 138 130"
                fill="none"
                stroke="#18181b"
                strokeWidth="6"
                strokeLinecap="round"
              />
              {/* Left Earcup */}
              <ellipse cx="62" cy="132" rx="10" ry="14" fill="#27272a" stroke="#3f3f46" strokeWidth="2" />
              <circle cx="62" cy="132" r="6" fill="#06b6d4" filter={`url(#${auraBlurId})`} opacity="0.9" />
              {/* Right Earcup */}
              <ellipse cx="138" cy="132" rx="10" ry="14" fill="#27272a" stroke="#3f3f46" strokeWidth="2" />
              <circle cx="138" cy="132" r="6" fill="#06b6d4" filter={`url(#${auraBlurId})`} opacity="0.9" />
            </g>
          )}

          {/* --- LAYER 2E: EARS & EARRINGS (Under Head) --- */}
          <g className="ears">
            {/* Left Ear */}
            <circle cx="60" cy="85" r="11" fill={skinData.fill} />
            <circle cx="61" cy="85" r="6.5" fill={skinData.shadow} />
            {/* Right Ear */}
            <circle cx="140" cy="85" r="11" fill={skinData.fill} />
            <circle cx="139" cy="85" r="6.5" fill={skinData.shadow} />

            {/* Gold Hoop Earrings */}
            {resolvedConfig.accessory === 'gold-hoops' && (
              <g className="earrings-hoops">
                <circle cx="58" cy="95" r="9" fill="none" stroke="#f59e0b" strokeWidth="3" />
                <circle cx="58" cy="95" r="8.5" fill="none" stroke="#fef08a" strokeWidth="1" />
                <circle cx="142" cy="95" r="9" fill="none" stroke="#f59e0b" strokeWidth="3" />
                <circle cx="142" cy="95" r="8.5" fill="none" stroke="#fef08a" strokeWidth="1" />
              </g>
            )}
          </g>

          {/* --- LAYER 2F: HEAD & JAW --- */}
          <g className="head">
            {/* Smooth Sculpted Head with Chin */}
            <path
              d="M62 75 C62 45 78 30 100 30 C122 30 138 45 138 75 C138 98 126 120 100 120 C74 120 62 98 62 75 Z"
              fill={`url(#${skinGradId})`}
            />

            {/* Cheek Warmth / Blush */}
            <circle cx="75" cy="88" r="8" fill="#e11d48" opacity="0.16" />
            <circle cx="125" cy="88" r="8" fill="#e11d48" opacity="0.16" />

            {/* Nose Contour */}
            <path
              d="M97 78 Q100 86 104 86 Q100 87 96 86"
              fill="none"
              stroke={skinData.shadow}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>

          {/* --- LAYER 2G: EXPRESSIVE EYES & BROWS --- */}
          <g className="eyes-and-brows">
            {/* Confident Cocked Eyebrows */}
            <path
              d="M72 63 Q84 57 93 64"
              fill="none"
              stroke="#0f172a"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <path
              d="M107 64 Q116 55 128 61"
              fill="none"
              stroke="#0f172a"
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            {/* Animated Blinking Eyes Group */}
            <g className="animate-avatar-blink">
              {/* Left Eye */}
              <ellipse cx="82" cy="74" rx="10" ry="7.5" fill="#ffffff" />
              <circle cx="83" cy="74" r="5.5" fill={`url(#${eyeGradId})`} />
              {/* Iris highlights */}
              <circle cx="85" cy="72" r="2.2" fill="#ffffff" />
              <circle cx="81" cy="76" r="1.1" fill="#ffffff" />
              {/* Upper Eyeliner Wing */}
              <path d="M71 73 Q82 66 93 73" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />

              {/* Right Eye */}
              <ellipse cx="118" cy="74" rx="10" ry="7.5" fill="#ffffff" />
              <circle cx="117" cy="74" r="5.5" fill={`url(#${eyeGradId})`} />
              {/* Iris highlights */}
              <circle cx="119" cy="72" r="2.2" fill="#ffffff" />
              <circle cx="115" cy="76" r="1.1" fill="#ffffff" />
              {/* Upper Eyeliner Wing */}
              <path d="M107 73 Q118 66 129 73" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
            </g>

            {/* Confident Smirk Mouth */}
            <g className="mouth">
              {/* Mouth line */}
              <path
                d="M86 98 Q98 104 116 98 Q118 96 114 94"
                fill="none"
                stroke="#3f1d13"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              {/* White tooth glint */}
              <path d="M96 99 Q104 102 110 99" fill="#ffffff" stroke="#ffffff" strokeWidth="0.5" />
              {/* Glossy Lower Lip highlight */}
              <path
                d="M93 103 Q102 107 111 103"
                fill="none"
                stroke="#ea580c"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.75"
              />
            </g>
          </g>

          {/* --- LAYER 2H: FRONT HAIR STYLES --- */}
          {resolvedConfig.hair === 'braids' && (
            <g className="hair-braids">
              {/* Scalp Parting Lines */}
              <path d="M60 70 C60 35 75 22 100 22 C125 22 140 35 140 70 C134 50 120 40 100 40 C80 40 66 50 60 70 Z" fill="#171717" />
              <line x1="100" y1="22" x2="100" y2="46" stroke="#c68642" strokeWidth="1.5" />
              <line x1="82" y1="26" x2="86" y2="46" stroke="#c68642" strokeWidth="1.5" />
              <line x1="118" y1="26" x2="114" y2="46" stroke="#c68642" strokeWidth="1.5" />
              {/* Front Braids Framing Face */}
              <path d="M64 54 Q54 85 58 118" stroke="#0f172a" strokeWidth="6" strokeLinecap="round" />
              <path d="M136 54 Q146 85 142 118" stroke="#0f172a" strokeWidth="6" strokeLinecap="round" />
              {/* Metallic Gold Bead Clips */}
              <rect x="55" y="100" width="6" height="5" rx="1.5" fill="#f59e0b" />
              <rect x="139" y="100" width="6" height="5" rx="1.5" fill="#f59e0b" />
            </g>
          )}

          {resolvedConfig.hair === 'afro-puff' && (
            <g className="hair-afro-puff">
              {/* Large Voluminous Textured Puffs */}
              <circle cx="68" cy="38" r="24" fill="#171717" />
              <circle cx="56" cy="46" r="18" fill="#0f172a" />
              <circle cx="132" cy="38" r="24" fill="#171717" />
              <circle cx="144" cy="46" r="18" fill="#0f172a" />
              <circle cx="100" cy="32" r="20" fill="#262626" />
              {/* Hair Base hugging forehead */}
              <path d="M62 65 C62 42 75 38 100 38 C125 38 138 42 138 65 C132 50 118 46 100 46 C82 46 68 50 62 65 Z" fill="#171717" />
              {/* Golden Hair Bands */}
              <ellipse cx="74" cy="48" rx="8" ry="3" fill="#f59e0b" />
              <ellipse cx="126" cy="48" rx="8" ry="3" fill="#f59e0b" />
            </g>
          )}

          {resolvedConfig.hair === 'fade' && (
            <g className="hair-fade">
              {/* Textured Sponge Twist Top */}
              <path
                d="M66 58 C66 32 80 24 100 24 C120 24 134 32 134 58 C130 50 120 46 100 46 C80 46 70 50 66 58 Z"
                fill="#171717"
              />
              {/* Crisp Razor Edge-up Line */}
              <path
                d="M68 56 L76 56 L76 50 L124 50 L124 56 L132 56"
                stroke="#09090b"
                strokeWidth="2.5"
                fill="none"
              />
              {/* Tapered Temple Shading */}
              <path d="M62 68 C62 58 66 52 68 52 C70 56 68 64 66 70 Z" fill="#27272a" opacity="0.6" />
              <path d="M138 68 C138 58 134 52 132 52 C130 56 132 64 134 70 Z" fill="#27272a" opacity="0.6" />
            </g>
          )}

          {resolvedConfig.hair === 'locs' && (
            <g className="hair-locs">
              {/* Crown dread bundles */}
              <path d="M64 62 C62 30 78 22 100 22 C122 22 138 30 136 62 C130 46 116 42 100 42 C84 42 70 46 64 62 Z" fill="#1f1a17" />
              {/* Sculpted frontal locs */}
              <path d="M72 42 Q68 70 66 94" stroke="#0a0a0a" strokeWidth="5.5" strokeLinecap="round" />
              <path d="M84 38 Q82 66 78 88" stroke="#1f1a17" strokeWidth="5" strokeLinecap="round" />
              <path d="M128 42 Q132 70 134 94" stroke="#0a0a0a" strokeWidth="5.5" strokeLinecap="round" />
              <path d="M116 38 Q118 66 122 88" stroke="#1f1a17" strokeWidth="5" strokeLinecap="round" />
              {/* Spiral gold wire accents */}
              <circle cx="70" cy="74" r="3" fill="#f59e0b" />
              <circle cx="130" cy="74" r="3" fill="#f59e0b" />
            </g>
          )}

          {resolvedConfig.hair === 'bantu-knots' && (
            <g className="hair-bantu-knots">
              <path d="M62 68 C62 45 78 35 100 35 C122 35 138 45 138 68 C132 52 118 48 100 48 C82 48 68 52 62 68 Z" fill="#171717" />
              {/* 5 Sculpted Geometric Bantu Knots */}
              <ellipse cx="100" cy="28" rx="8" ry="7" fill="#09090b" stroke="#f59e0b" strokeWidth="1" />
              <ellipse cx="76" cy="34" rx="7.5" ry="6.5" fill="#09090b" stroke="#f59e0b" strokeWidth="1" />
              <ellipse cx="124" cy="34" rx="7.5" ry="6.5" fill="#09090b" stroke="#f59e0b" strokeWidth="1" />
              <ellipse cx="62" cy="48" rx="6.5" ry="6" fill="#09090b" stroke="#f59e0b" strokeWidth="1" />
              <ellipse cx="138" cy="48" rx="6.5" ry="6" fill="#09090b" stroke="#f59e0b" strokeWidth="1" />
            </g>
          )}

          {resolvedConfig.hair === 'bob' && (
            <g className="hair-bob">
              {/* Sleek Textured Asymmetrical Bob */}
              <path
                d="M58 88 C54 48 70 24 100 24 C130 24 146 48 142 88 C136 96 130 102 126 92 C124 62 115 48 100 48 C85 48 76 62 74 92 C70 102 64 96 58 88 Z"
                fill="#18181b"
              />
              {/* Glossy Hair Streak Highlight */}
              <path d="M82 32 Q96 28 114 34" stroke="#52525b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </g>
          )}

          {resolvedConfig.hair === 'headwrap' && (
            <g className="hair-headwrap">
              {/* Grand Sculptural Nigerian Gele / Headwrap */}
              {/* Back Fan Pleats */}
              <path
                d="M48 52 C42 16 75 10 100 10 C125 10 158 16 152 52 C140 40 120 32 100 32 C80 32 60 40 48 52 Z"
                fill="#d97706"
              />
              {/* Front Folded Wrap Band */}
              <path
                d="M56 62 C60 42 76 36 100 36 C124 36 140 42 144 62 C136 50 120 46 100 46 C80 46 64 50 56 62 Z"
                fill="#047857"
              />
              {/* Elegant Gold Brooch Centerpiece */}
              <polygon points="100,38 105,45 100,52 95,45" fill="#f59e0b" stroke="#fef08a" strokeWidth="1" />
            </g>
          )}

          {resolvedConfig.hair === 'durag' && (
            <g className="hair-durag">
              {/* Silky Wave Cap */}
              <path
                d="M62 65 C62 38 78 28 100 28 C122 28 138 38 138 65 C132 54 118 52 100 52 C82 52 68 54 62 65 Z"
                fill="#1e1b4b"
              />
              {/* Front Tie Band */}
              <path d="M62 60 Q100 56 138 60" stroke="#312e81" strokeWidth="4" fill="none" />
              {/* 360 Waves Sheen */}
              <path d="M78 40 Q100 35 122 40" stroke="#4338ca" strokeWidth="2" fill="none" opacity="0.8" />
              <path d="M74 48 Q100 43 126 48" stroke="#4338ca" strokeWidth="2" fill="none" opacity="0.8" />
              {/* Hanging Cape on Right Side */}
              <path d="M136 60 Q146 95 142 140 Q138 142 134 138 Q138 95 132 64 Z" fill="#1e1b4b" />
            </g>
          )}

          {/* --- LAYER 2I: FACE / EYE ACCESSORIES --- */}
          {resolvedConfig.accessory === 'round-shades' && (
            <g className="accessory-round-shades">
              {/* Left Lens */}
              <circle cx="82" cy="74" r="12" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" />
              <path d="M74 72 Q82 66 88 70" stroke="#38bdf8" strokeWidth="1.5" fill="none" opacity="0.8" />
              {/* Right Lens */}
              <circle cx="118" cy="74" r="12" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" />
              <path d="M110 72 Q118 66 124 70" stroke="#38bdf8" strokeWidth="1.5" fill="none" opacity="0.8" />
              {/* Golden Bridge & Temples */}
              <line x1="94" y1="74" x2="106" y2="74" stroke="#f59e0b" strokeWidth="2" />
              <line x1="70" y1="74" x2="62" y2="78" stroke="#f59e0b" strokeWidth="1.8" />
              <line x1="130" y1="74" x2="138" y2="78" stroke="#f59e0b" strokeWidth="1.8" />
            </g>
          )}

          {resolvedConfig.accessory === 'star-glasses' && (
            <g className="accessory-star-glasses">
              {/* Left Star Lens */}
              <polygon
                points="82,62 85,71 94,71 87,77 90,86 82,80 74,86 77,77 70,71 79,71"
                fill="#ec4899"
                stroke="#f43f5e"
                strokeWidth="1.5"
                opacity="0.9"
              />
              {/* Right Star Lens */}
              <polygon
                points="118,62 121,71 130,71 123,77 126,86 118,80 110,86 113,77 106,71 115,71"
                fill="#ec4899"
                stroke="#f43f5e"
                strokeWidth="1.5"
                opacity="0.9"
              />
              <line x1="93" y1="74" x2="107" y2="74" stroke="#fb7185" strokeWidth="2" />
            </g>
          )}

          {resolvedConfig.accessory === 'bucket-hat' && (
            <g className="accessory-bucket-hat">
              {/* Crown of Bucket Hat */}
              <path
                d="M62 48 L68 18 L132 18 L138 48 Z"
                fill="#0f172a"
                stroke="#f59e0b"
                strokeWidth="1.5"
              />
              {/* Downward Sloping Brim */}
              <path
                d="M50 56 Q100 48 150 56 L154 52 Q100 42 46 52 Z"
                fill="#1e293b"
                stroke="#334155"
                strokeWidth="1.5"
              />
              {/* Embroidered Afro Flame Badge */}
              <polygon points="100,24 104,32 96,32" fill="#ef4444" />
              <polygon points="100,28 103,34 97,34" fill="#f59e0b" />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
});

Avatar.displayName = 'Avatar';

export default Avatar;
export { Avatar };
