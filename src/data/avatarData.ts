export interface AvatarConfig {
  skin: 'warm-sand' | 'caramel' | 'rich-bronze' | 'deep-cocoa' | 'dark-chocolate' | 'espresso';
  hair: 'braids' | 'afro-puff' | 'fade' | 'locs' | 'bantu-knots' | 'bob' | 'headwrap' | 'durag';
  outfit: 'ankara-hoodie' | 'football-jersey' | 'kente-jacket' | 'streetwear-tee' | 'agbada-top' | 'denim-jacket';
  accessory: 'round-shades' | 'star-glasses' | 'gold-chain' | 'headphones' | 'bucket-hat' | 'gold-hoops' | 'none';
  aura: 'neon-gold' | 'magenta' | 'cyan' | 'lime' | 'orange' | 'purple' | 'red' | 'electric-blue';
}

export interface AvatarPreset {
  id: string; // 'avatar-01' to 'avatar-12'
  label: string;
  tagline: string;
  config: AvatarConfig;
}

export const SKIN_TONES = [
  { id: 'warm-sand', name: 'Warm Sand', fill: '#e4a973', shadow: '#c8864d', highlight: '#f5cca8' },
  { id: 'caramel', name: 'Golden Caramel', fill: '#c68642', shadow: '#9e6022', highlight: '#e2a363' },
  { id: 'rich-bronze', name: 'Rich Bronze', fill: '#9b5c2a', shadow: '#753f17', highlight: '#b97a45' },
  { id: 'deep-cocoa', name: 'Deep Cocoa', fill: '#6f3b19', shadow: '#4d230b', highlight: '#8e5229' },
  { id: 'dark-chocolate', name: 'Dark Chocolate', fill: '#4a2511', shadow: '#311406', highlight: '#68391d' },
  { id: 'espresso', name: 'Pure Espresso', fill: '#2c160b', shadow: '#1a0a03', highlight: '#462514' },
] as const;

export const HAIR_STYLES = [
  { id: 'braids', name: 'Box Braids', icon: '✨' },
  { id: 'afro-puff', name: 'Afro Puff', icon: '☁️' },
  { id: 'fade', name: 'Razor Fade', icon: '💈' },
  { id: 'locs', name: 'Gold-Wire Locs', icon: '👑' },
  { id: 'bantu-knots', name: 'Bantu Knots', icon: '⭐' },
  { id: 'bob', name: 'Sleek Bob', icon: '💇' },
  { id: 'headwrap', name: 'Gele Headwrap', icon: '🧣' },
  { id: 'durag', name: 'Wave Durag', icon: '🌊' },
] as const;

export const OUTFITS = [
  { id: 'ankara-hoodie', name: 'Ankara Hoodie', tag: 'Wax Print' },
  { id: 'football-jersey', name: 'Super Eagles Kit', tag: 'Naija 94' },
  { id: 'kente-jacket', name: 'Kente-Trim Bomber', tag: 'Gold Woven' },
  { id: 'streetwear-tee', name: 'Gbedu Heavy Tee', tag: 'Oversized' },
  { id: 'agbada-top', name: 'Agbada Embroidery', tag: 'Regal Gold' },
  { id: 'denim-jacket', name: 'Washed Denim & Sherpa', tag: 'Vintage' },
] as const;

export const ACCESSORIES = [
  { id: 'round-shades', name: 'Round Shades', icon: '🕶️' },
  { id: 'star-glasses', name: 'Star Glasses', icon: '⭐' },
  { id: 'gold-chain', name: 'Cuban Gold Chain', icon: '⛓️' },
  { id: 'headphones', name: 'DJ Headphones', icon: '🎧' },
  { id: 'bucket-hat', name: 'Flame Bucket Hat', icon: '🧢' },
  { id: 'gold-hoops', name: 'Bamboo Gold Hoops', icon: '💫' },
  { id: 'none', name: 'No Accessory', icon: '🚫' },
] as const;

export const AURAS = [
  { id: 'neon-gold', name: 'Gbedu Gold', color1: '#f59e0b', color2: '#fbbf24', glow: 'rgba(245,158,11,0.6)' },
  { id: 'magenta', name: 'Lagos Pink', color1: '#ec4899', color2: '#f43f5e', glow: 'rgba(236,72,153,0.6)' },
  { id: 'cyan', name: 'Alte Cyan', color1: '#06b6d4', color2: '#38bdf8', glow: 'rgba(6,182,212,0.6)' },
  { id: 'lime', name: 'Naija Green', color1: '#84cc16', color2: '#22c55e', glow: 'rgba(132,204,22,0.6)' },
  { id: 'orange', name: 'Afro Sunset', color1: '#f97316', color2: '#ea580c', glow: 'rgba(249,115,22,0.6)' },
  { id: 'purple', name: 'Groove Violet', color1: '#8b5cf6', color2: '#a855f7', glow: 'rgba(139,92,246,0.6)' },
  { id: 'red', name: 'Shrine Flame', color1: '#ef4444', color2: '#dc2626', glow: 'rgba(239,68,68,0.6)' },
  { id: 'electric-blue', name: 'Electric Amapiano', color1: '#3b82f6', color2: '#6366f1', glow: 'rgba(59,130,246,0.6)' },
] as const;

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'avatar-01',
    label: 'Lagos Tech Sis',
    tagline: 'Coding in Victoria Island, vibing to Asake',
    config: {
      skin: 'rich-bronze',
      hair: 'braids',
      outfit: 'ankara-hoodie',
      accessory: 'round-shades',
      aura: 'neon-gold',
    },
  },
  {
    id: 'avatar-02',
    label: 'Amapiano Boy',
    tagline: 'Log drum fanatic, bassline speaker shaker',
    config: {
      skin: 'caramel',
      hair: 'fade',
      outfit: 'streetwear-tee',
      accessory: 'headphones',
      aura: 'electric-blue',
    },
  },
  {
    id: 'avatar-03',
    label: 'Olori Glam',
    tagline: 'Grand Gele queen, runs the wedding entrance',
    config: {
      skin: 'deep-cocoa',
      hair: 'headwrap',
      outfit: 'agbada-top',
      accessory: 'gold-hoops',
      aura: 'magenta',
    },
  },
  {
    id: 'avatar-04',
    label: 'Super Eagle',
    tagline: 'Star forward, green-white-green on his chest',
    config: {
      skin: 'dark-chocolate',
      hair: 'locs',
      outfit: 'football-jersey',
      accessory: 'gold-chain',
      aura: 'lime',
    },
  },
  {
    id: 'avatar-05',
    label: 'Alte Wave',
    tagline: 'Experimental sound curator, indie Lagos spirit',
    config: {
      skin: 'espresso',
      hair: 'bantu-knots',
      outfit: 'kente-jacket',
      accessory: 'star-glasses',
      aura: 'cyan',
    },
  },
  {
    id: 'avatar-06',
    label: 'Street Drip',
    tagline: 'Velvet durag waves, 100% authentic Mainland swag',
    config: {
      skin: 'warm-sand',
      hair: 'durag',
      outfit: 'denim-jacket',
      accessory: 'bucket-hat',
      aura: 'orange',
    },
  },
  {
    id: 'avatar-07',
    label: 'Afro Pop Star',
    tagline: 'Billboard charter, stadium filler, stage commander',
    config: {
      skin: 'rich-bronze',
      hair: 'afro-puff',
      outfit: 'streetwear-tee',
      accessory: 'gold-chain',
      aura: 'purple',
    },
  },
  {
    id: 'avatar-08',
    label: 'Studio Chef',
    tagline: 'Cooking spicy beats on the MPC at 3 AM',
    config: {
      skin: 'caramel',
      hair: 'bob',
      outfit: 'ankara-hoodie',
      accessory: 'headphones',
      aura: 'neon-gold',
    },
  },
  {
    id: 'avatar-09',
    label: 'Kalakuta Rebel',
    tagline: 'Horn section conductor, Afrobeat truth speaker',
    config: {
      skin: 'deep-cocoa',
      hair: 'locs',
      outfit: 'kente-jacket',
      accessory: 'round-shades',
      aura: 'red',
    },
  },
  {
    id: 'avatar-10',
    label: 'Party Minister',
    tagline: 'President of Enjoyment, never leaves before dawn',
    config: {
      skin: 'warm-sand',
      hair: 'braids',
      outfit: 'agbada-top',
      accessory: 'gold-hoops',
      aura: 'magenta',
    },
  },
  {
    id: 'avatar-11',
    label: 'Afrobeat Don',
    tagline: 'Big rings, calm confidence, Last Card master',
    config: {
      skin: 'dark-chocolate',
      hair: 'fade',
      outfit: 'football-jersey',
      accessory: 'star-glasses',
      aura: 'lime',
    },
  },
  {
    id: 'avatar-12',
    label: 'Vibe Queen',
    tagline: 'Golden smile, infectious rhythm, party anchor',
    config: {
      skin: 'espresso',
      hair: 'headwrap',
      outfit: 'denim-jacket',
      accessory: 'gold-chain',
      aura: 'cyan',
    },
  },
];

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = AVATAR_PRESETS[0].config;

export function getRandomAvatarConfig(): AvatarConfig {
  const skins: AvatarConfig['skin'][] = ['warm-sand', 'caramel', 'rich-bronze', 'deep-cocoa', 'dark-chocolate', 'espresso'];
  const hairs: AvatarConfig['hair'][] = ['braids', 'afro-puff', 'fade', 'locs', 'bantu-knots', 'bob', 'headwrap', 'durag'];
  const outfits: AvatarConfig['outfit'][] = ['ankara-hoodie', 'football-jersey', 'kente-jacket', 'streetwear-tee', 'agbada-top', 'denim-jacket'];
  const accessories: AvatarConfig['accessory'][] = ['round-shades', 'star-glasses', 'gold-chain', 'headphones', 'bucket-hat', 'gold-hoops', 'none'];
  const auras: AvatarConfig['aura'][] = ['neon-gold', 'magenta', 'cyan', 'lime', 'orange', 'purple', 'red', 'electric-blue'];

  return {
    skin: skins[Math.floor(Math.random() * skins.length)],
    hair: hairs[Math.floor(Math.random() * hairs.length)],
    outfit: outfits[Math.floor(Math.random() * outfits.length)],
    accessory: accessories[Math.floor(Math.random() * accessories.length)],
    aura: auras[Math.floor(Math.random() * auras.length)],
  };
}

export function getPresetById(id?: string | null): AvatarPreset {
  if (!id) return AVATAR_PRESETS[0];
  const found = AVATAR_PRESETS.find((p) => p.id === id);
  return found || AVATAR_PRESETS[0];
}

export function parseAvatarConfig(val: unknown, fallbackPresetId: string = 'avatar-01'): AvatarConfig {
  if (!val) return getPresetById(fallbackPresetId).config;

  if (typeof val === 'object') {
    const obj = val as Record<string, string>;
    if (obj.skin && obj.hair && obj.outfit) {
      return {
        skin: (obj.skin as AvatarConfig['skin']) || 'rich-bronze',
        hair: (obj.hair as AvatarConfig['hair']) || 'braids',
        outfit: (obj.outfit as AvatarConfig['outfit']) || 'ankara-hoodie',
        accessory: (obj.accessory as AvatarConfig['accessory']) || 'round-shades',
        aura: (obj.aura as AvatarConfig['aura']) || 'neon-gold',
      };
    }
  }

  if (typeof val === 'string') {
    if (val.startsWith('{') && val.endsWith('}')) {
      try {
        const parsed = JSON.parse(val);
        return parseAvatarConfig(parsed, fallbackPresetId);
      } catch {
        // Fall back to preset
      }
    }

    if (val.startsWith('avatar-')) {
      const p = AVATAR_PRESETS.find((preset) => preset.id === val);
      if (p) return p.config;
    }

    // Emoji to preset mapping
    if (val === '👑') return AVATAR_PRESETS[0].config;
    if (val === '🦁') return AVATAR_PRESETS[1].config;
    if (val === '🕶️') return AVATAR_PRESETS[4].config;
    if (val === '💃') return AVATAR_PRESETS[2].config;
    if (val === '🪘') return AVATAR_PRESETS[8].config;
    if (val === '🧢') return AVATAR_PRESETS[5].config;
    if (val === '⭐') return AVATAR_PRESETS[6].config;
    if (val === '🔥') return AVATAR_PRESETS[10].config;
  }

  return getPresetById(fallbackPresetId).config;
}
