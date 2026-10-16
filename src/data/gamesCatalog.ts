export interface GameDefinition {
  id: string;
  name: string;
  tagline: string;
  category: 'All' | 'Classic' | 'Board' | 'Word' | 'Strategy' | 'Trivia';
  icon: string;
  iconBg: string;
  colorTheme: string;
  borderTheme: string;
  playerCount: string;
  status: 'playable' | 'coming_soon';
  description: string;
  rulesOverview?: string[];
  bannerGradient: string;
  accentColor: string;
}

export const GAMES_CATALOG: GameDefinition[] = [
  {
    id: 'xo',
    name: 'X & O',
    tagline: 'Quick 3x3 Street Rivalry',
    category: 'Classic',
    icon: '❌⭕',
    iconBg: 'from-amber-500/20 to-orange-500/20',
    colorTheme: 'text-amber-400',
    borderTheme: 'border-amber-500/30 hover:border-amber-400',
    playerCount: '1-2 Players',
    status: 'playable',
    description: 'Fast-paced Tic-Tac-Toe with Odogwu AI, local Pass & Play, and online multiplayer.',
    bannerGradient: 'from-amber-600/30 via-orange-600/20 to-transparent',
    accentColor: '#f59e0b',
  },
  {
    id: 'ayo',
    name: 'Ayo Olopon',
    tagline: 'Yoruba Mancala Seed Sowing',
    category: 'Board',
    icon: '🟤',
    iconBg: 'from-emerald-500/20 to-teal-500/20',
    colorTheme: 'text-emerald-400',
    borderTheme: 'border-emerald-500/30 hover:border-emerald-400',
    playerCount: '1-2 Players',
    status: 'playable',
    description: 'Ancient Yoruba strategic pit-and-pebble mancala. Sow your seeds counter-clockwise and capture rival pits.',
    bannerGradient: 'from-emerald-600/30 via-teal-600/20 to-transparent',
    accentColor: '#10b981',
  },
  {
    id: 'ludo',
    name: 'Ludo Naija',
    tagline: 'Roll 6 & Chop Rivals',
    category: 'Board',
    icon: '🎲',
    iconBg: 'from-rose-500/20 to-pink-500/20',
    colorTheme: 'text-rose-400',
    borderTheme: 'border-rose-500/30 hover:border-rose-400',
    playerCount: '2-4 Players',
    status: 'playable',
    description: 'Classic Naija parlor Ludo. Roll the dice, break out of home base, and chase rivals around the board.',
    bannerGradient: 'from-rose-600/30 via-pink-600/20 to-transparent',
    accentColor: '#f43f5e',
  },
  {
    id: 'biro-soccer',
    name: 'Biro Soccer',
    tagline: 'Classroom Desk Football',
    category: 'Classic',
    icon: '⚽',
    iconBg: 'from-blue-500/20 to-cyan-500/20',
    colorTheme: 'text-blue-400',
    borderTheme: 'border-blue-500/30 hover:border-blue-400',
    playerCount: '1-2 Players',
    status: 'playable',
    description: 'Authentic pen-and-paper grid football played across Nigerian secondary schools. Bounce off posts and score past the keeper!',
    bannerGradient: 'from-blue-600/30 via-cyan-600/20 to-transparent',
    accentColor: '#3b82f6',
  },
  {
    id: 'chess',
    name: 'Chess Masters',
    tagline: 'Grandmaster Street Tactics',
    category: 'Strategy',
    icon: '♞',
    iconBg: 'from-purple-500/20 to-indigo-500/20',
    colorTheme: 'text-purple-400',
    borderTheme: 'border-purple-500/30 hover:border-purple-400',
    playerCount: '1-2 Players',
    status: 'playable',
    description: 'Standard 8x8 chess inspired by Chess in Slums Africa. Play against AI or challenge a buddy.',
    bannerGradient: 'from-purple-600/30 via-indigo-600/20 to-transparent',
    accentColor: '#a855f7',
  },
  {
    id: 'rps',
    name: 'Rock Paper Scissors',
    tagline: 'Stone, Paper, Cutlass Showdown',
    category: 'Classic',
    icon: '✂️',
    iconBg: 'from-yellow-500/20 to-amber-500/20',
    colorTheme: 'text-yellow-400',
    borderTheme: 'border-yellow-500/30 hover:border-yellow-400',
    playerCount: '1-2 Players',
    status: 'playable',
    description: 'Instant reaction duel with authentic Afro banters, combo multipliers, and best-of-5 rounds.',
    bannerGradient: 'from-yellow-600/30 via-amber-600/20 to-transparent',
    accentColor: '#eab308',
  },
  {
    id: 'tycoon',
    name: 'Gbedu Tycoon',
    tagline: 'Lagos & Accra Real Estate Empire',
    category: 'Strategy',
    icon: '🏢',
    iconBg: 'from-cyan-500/20 to-blue-500/20',
    colorTheme: 'text-cyan-400',
    borderTheme: 'border-cyan-500/30 hover:border-cyan-400',
    playerCount: '2-4 Players',
    status: 'playable',
    description: 'Roll dice, acquire prime real estate from Osu Oxford Street to Lekki Phase 1, and collect rent from rivals.',
    bannerGradient: 'from-cyan-600/30 via-blue-600/20 to-transparent',
    accentColor: '#06b6d4',
  },
  {
    id: 'snakes-ladders',
    name: 'Snakes & Ladders',
    tagline: 'Danfo Jams & VIP Ladders',
    category: 'Board',
    icon: '🐍',
    iconBg: 'from-emerald-500/20 to-lime-500/20',
    colorTheme: 'text-lime-400',
    borderTheme: 'border-lime-500/30 hover:border-lime-400',
    playerCount: '2-4 Players',
    status: 'playable',
    description: 'Naija-themed 100-tile board game. Climb Keke NAPEP ladders and dodge Ojuelegba traffic jams!',
    bannerGradient: 'from-emerald-600/30 via-lime-600/20 to-transparent',
    accentColor: '#84cc16',
  },
  {
    id: 'word-play',
    name: 'Word Play',
    tagline: 'Guess, Scramble, Chain & Search',
    category: 'Word',
    icon: '🔤',
    iconBg: 'from-emerald-500/20 to-teal-500/20',
    colorTheme: 'text-emerald-400',
    borderTheme: 'border-emerald-500/30 hover:border-emerald-400',
    playerCount: '1-6 Players',
    status: 'playable',
    description: 'The ultimate Naija word puzzle suite. Play Guess the Word (5-letter flips), Word Scramble, Word Chain vs Odogwu AI, and 10x10 Word Search.',
    bannerGradient: 'from-emerald-600/30 via-teal-600/20 to-transparent',
    accentColor: '#1fd1a0',
  },
  {
    id: 'naija-trivia',
    name: 'Naija Trivia',
    tagline: 'Nigeria Facts & Culture Quiz',
    category: 'Trivia',
    icon: '💡',
    iconBg: 'from-amber-500/20 to-yellow-500/20',
    colorTheme: 'text-amber-400',
    borderTheme: 'border-amber-500/30 hover:border-amber-400',
    playerCount: '1-2 Players',
    status: 'playable',
    description: 'Test your Nigeria knowledge across History, Geography, Afrobeats, Nollywood, Super Eagles, Food, and Street Pidgin with lifelines & streak multipliers.',
    bannerGradient: 'from-amber-600/30 via-yellow-600/20 to-transparent',
    accentColor: '#ffb703',
  },
  {
    id: 'word-gbedu',
    name: 'Word Gbedu',
    tagline: 'Afro Slang Scramble',
    category: 'Word',
    icon: '🔤',
    iconBg: 'from-violet-500/20 to-purple-500/20',
    colorTheme: 'text-violet-400',
    borderTheme: 'border-violet-500/30 hover:border-violet-400',
    playerCount: '1-2 Players',
    status: 'playable',
    description: 'Unscramble words, assemble letters from your rack, and score bonus points for authentic Nigerian cultural words.',
    bannerGradient: 'from-violet-600/30 via-purple-600/20 to-transparent',
    accentColor: '#8b5cf6',
  },
  {
    id: 'whot',
    name: 'Naija Whot',
    tagline: 'The King of Nigerian Card Games',
    category: 'Classic',
    icon: '🃏',
    iconBg: 'from-amber-500/20 to-rose-500/20',
    colorTheme: 'text-amber-400',
    borderTheme: 'border-amber-500/40 hover:border-amber-300',
    playerCount: '2-6 Players',
    status: 'playable',
    description: 'The national card game of Nigeria. Play Hold On, Pick Two, General Market, and Whot 20 with authentic rules and sounds.',
    bannerGradient: 'from-amber-500/30 via-rose-500/20 to-transparent',
    accentColor: '#f59e0b',
  },
  {
    id: 'checkers',
    name: 'Draft / Checkers',
    tagline: 'Kiosk Master Draughts',
    category: 'Board',
    icon: '🏁',
    iconBg: 'from-gray-500/20 to-slate-500/20',
    colorTheme: 'text-gray-400',
    borderTheme: 'border-gray-600/30',
    playerCount: '2 Players',
    status: 'coming_soon',
    description: 'Popular roadside Nigerian draughts played on wooden boards with bottle caps and crowned kings.',
    bannerGradient: 'from-gray-700/20 to-transparent',
    accentColor: '#6b7280',
  },
  {
    id: 'suya-chef',
    name: 'Suya Grill Master',
    tagline: 'Street Food Tycoon',
    category: 'Strategy',
    icon: '🍢',
    iconBg: 'from-red-500/20 to-orange-500/20',
    colorTheme: 'text-red-400',
    borderTheme: 'border-red-600/30',
    playerCount: '1 Player',
    status: 'coming_soon',
    description: 'Slice meat, apply Yaji spice, turn the skewers, and serve hungry late-night Lagos clubbers.',
    bannerGradient: 'from-red-700/20 to-transparent',
    accentColor: '#ef4444',
  },
];

export const CATEGORIES = ['All', 'Classic', 'Board', 'Word', 'Trivia', 'Strategy'] as const;

export function getGameById(id: string): GameDefinition | undefined {
  return GAMES_CATALOG.find((g) => g.id === id);
}

export function getLastPlayedGame(): GameDefinition {
  const lastId = typeof window !== 'undefined' ? localStorage.getItem('gbedu_last_played_game') : null;
  const game = lastId ? getGameById(lastId) : undefined;
  return (game && game.status === 'playable') ? game : GAMES_CATALOG[0]; // defaults to X & O
}

export function setLastPlayedGame(id: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('gbedu_last_played_game', id);
  }
}

export function getRandomPlayableGame(excludeId?: string): GameDefinition {
  const playables = GAMES_CATALOG.filter((g) => g.status === 'playable' && g.id !== excludeId);
  return playables[Math.floor(Math.random() * playables.length)] || GAMES_CATALOG[0];
}
