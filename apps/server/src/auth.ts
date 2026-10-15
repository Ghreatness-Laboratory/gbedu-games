import { UserProfile } from '@gbedu/shared';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase client instance (if configured via env)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// In-Memory store for fast lookup and dev fallback
const profilesByUsername = new Map<string, UserProfile>();
const profilesById = new Map<string, UserProfile>();
const userStats = new Map<string, { gamesPlayed: number; gamesWon: number; totalCards: number; streak: number }>();

// Pre-seed default Nigerian Whot characters for easy multi-account testing
const SEED_PROFILES: UserProfile[] = [
  { id: 'usr_ada', username: 'ada', displayName: 'Ada Lovelace', avatarUrl: '👑', bio: 'Whot Queen of Lagos', isOnline: false },
  { id: 'usr_tobi', username: 'tobi', displayName: 'Tobi Bakre', avatarUrl: '🦁', bio: 'Log drum specialist', isOnline: false },
  { id: 'usr_chi', username: 'chi', displayName: 'Chidinma', avatarUrl: '🕶️', bio: 'Never misses Last Card', isOnline: false },
  { id: 'usr_emeka', username: 'emeka', displayName: 'Emeka', avatarUrl: '🧢', bio: 'General Market master', isOnline: false },
  { id: 'usr_zainab', username: 'zainab', displayName: 'Zainab', avatarUrl: '💃', bio: 'Amapiano groove goddess', isOnline: false },
  { id: 'usr_femi', username: 'femi', displayName: 'Femi Shrine', avatarUrl: '🪘', bio: 'Afrobeat rhythm elder', isOnline: false },
];

SEED_PROFILES.forEach((p) => {
  profilesByUsername.set(p.username.toLowerCase(), p);
  profilesById.set(p.id, p);
  userStats.set(p.id, { gamesPlayed: 5, gamesWon: 2, totalCards: 28, streak: 1 });
});

export async function verifyUserToken(token: string): Promise<UserProfile | null> {
  if (!token) return null;

  // 1. Check if token is a Supabase JWT
  if (supabase) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        let profile = profilesById.get(user.id);
        if (!profile) {
          const { data: dbProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          if (dbProfile) {
            profile = {
              id: dbProfile.id,
              username: dbProfile.username,
              displayName: dbProfile.display_name,
              avatarUrl: dbProfile.avatar_url || '👑',
              bio: dbProfile.bio,
              isOnline: true,
            };
            profilesById.set(profile.id, profile);
            profilesByUsername.set(profile.username.toLowerCase(), profile);
          }
        }
        return profile || null;
      }
    } catch {
      // Fall through to local session handling
    }
  }

  // 2. Local session / Seeded profile token
  // Supports tokens in the form "user_<id>" or direct user id
  const targetId = token.startsWith('token_') ? token.replace('token_', '') : token;
  const localProfile = profilesById.get(targetId);
  return localProfile || null;
}

export function registerOrLoginUser(params: { username: string; displayName?: string; avatarUrl?: string }): {
  success: boolean;
  profile?: UserProfile;
  token?: string;
  error?: string;
} {
  const cleanUsername = params.username.trim().toLowerCase();
  if (cleanUsername.length < 3 || cleanUsername.length > 20) {
    return { success: false, error: 'Username must be between 3 and 20 characters' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
    return { success: false, error: 'Username can only contain letters, numbers, and underscores' };
  }

  let profile = profilesByUsername.get(cleanUsername);

  if (!profile) {
    // New registration
    const newId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    profile = {
      id: newId,
      username: cleanUsername,
      displayName: params.displayName?.trim() || cleanUsername,
      avatarUrl: params.avatarUrl || '👑',
      bio: 'New Whot Contender',
      isOnline: true,
    };
    profilesByUsername.set(cleanUsername, profile);
    profilesById.set(newId, profile);
    userStats.set(newId, { gamesPlayed: 0, gamesWon: 0, totalCards: 0, streak: 0 });
  } else {
    // Existing login: update status
    if (params.displayName) profile.displayName = params.displayName;
  }

  // Asynchronously attempt to sync profile to Supabase if table exists
  if (supabase) {
    Promise.resolve(
      supabase.from('profiles').upsert({
        id: profile.id,
        username: profile.username,
        display_name: profile.displayName,
        avatar_url: profile.avatarUrl,
        bio: profile.bio,
        is_online: true,
        updated_at: new Date().toISOString(),
      })
    ).catch(() => {});
  }

  return {
    success: true,
    profile,
    token: `token_${profile.id}`,
  };
}

export function searchProfiles(query: string, excludeUserId: string): UserProfile[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: UserProfile[] = [];
  profilesByUsername.forEach((p) => {
    if (p.id !== excludeUserId && p.username.toLowerCase().includes(q)) {
      results.push({
        id: p.id,
        username: p.username,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        bio: p.bio,
        isOnline: p.isOnline,
      });
    }
  });

  return results.slice(0, 10);
}

export function getProfileById(userId: string): UserProfile | null {
  return profilesById.get(userId) || null;
}

export function getStatsById(userId: string) {
  return userStats.get(userId) || { gamesPlayed: 0, gamesWon: 0, totalCards: 0, streak: 0 };
}

export function recordGameResult(winnerId: string, playerIds: string[], cardsPlayedCount: number) {
  playerIds.forEach((id) => {
    const stats = getStatsById(id);
    stats.gamesPlayed += 1;
    stats.totalCards += cardsPlayedCount;
    if (id === winnerId) {
      stats.gamesWon += 1;
      stats.streak += 1;
    } else {
      stats.streak = 0;
    }
    userStats.set(id, stats);
  });
}
