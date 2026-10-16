/**
 * Offline match persistence, IndexedDB storage, and background sync queue
 * Ensures vs Computer and Pass & Play matches award XP and sync when connection returns
 */

export interface MatchResult {
  id: string; // Unique match ID to prevent duplicate syncs
  userId: string;
  gameId: string;
  gameName: string;
  mode: 'ai' | 'pass' | 'online';
  outcome: 'win' | 'loss' | 'draw';
  xpEarned: number;
  coinsEarned: number;
  timestamp: number;
  synced: boolean;
}

export interface LastPlayedGame {
  gameId: string;
  gameName: string;
  outcome: 'win' | 'loss' | 'draw';
  timestamp: number;
}

const DB_NAME = 'gbedu_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'match_queue';
const LOCAL_STORAGE_QUEUE_KEY = 'gbedu_pending_matches';
const LAST_PLAYED_KEY = 'gbedu_last_game_played';

// Open IndexedDB safely with fallback
function openDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

// Fallback localStorage queue
function getLocalQueue(): MatchResult[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalQueue(items: MatchResult[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_QUEUE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota
  }
}

/**
 * Save match result locally (in IndexedDB and localStorage)
 */
export async function saveMatchResult(
  data: Omit<MatchResult, 'id' | 'timestamp' | 'synced'>
): Promise<MatchResult> {
  const match: MatchResult = {
    ...data,
    id: `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    synced: false,
  };

  // 1. Update last played game cache for "Continue Playing" card
  try {
    const lastPlayed: LastPlayedGame = {
      gameId: match.gameId,
      gameName: match.gameName,
      outcome: match.outcome,
      timestamp: match.timestamp,
    };
    localStorage.setItem(LAST_PLAYED_KEY, JSON.stringify(lastPlayed));
  } catch {
    // ignore
  }

  // 2. Update daily challenge progress
  incrementDailyChallenge(match.outcome === 'win');

  // 3. Save to IndexedDB
  const db = await openDB();
  if (db) {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(match);
    } catch {
      // Fallback to localStorage
    }
  }

  // 4. Always maintain in localStorage queue for instant redundancy
  const queue = getLocalQueue();
  queue.push(match);
  setLocalQueue(queue);

  // 5. If online, attempt immediate background sync
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    setTimeout(() => {
      syncPendingMatches();
    }, 500);
  }

  return match;
}

/**
 * Get all unsynced matches from IndexedDB or localStorage
 */
export async function getPendingMatches(): Promise<MatchResult[]> {
  const db = await openDB();
  if (db) {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      const results: MatchResult[] = await new Promise((resolve) => {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
      return results.filter((m) => !m.synced);
    } catch {
      return getLocalQueue().filter((m) => !m.synced);
    }
  }
  return getLocalQueue().filter((m) => !m.synced);
}

/**
 * Sync pending matches to server/Supabase
 */
let isSyncing = false;
export async function syncPendingMatches(
  onSynced?: (count: number) => void
): Promise<number> {
  if (isSyncing || typeof navigator === 'undefined' || !navigator.onLine) {
    return 0;
  }

  const pending = await getPendingMatches();
  if (pending.length === 0) return 0;

  isSyncing = true;
  let syncedCount = 0;

  try {
    for (const match of pending) {
      try {
        const res = await fetch('/api/matches/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(match),
        });

        if (res.ok) {
          syncedCount++;
          match.synced = true;

          // Update in IndexedDB
          const db = await openDB();
          if (db) {
            try {
              const tx = db.transaction(STORE_NAME, 'readwrite');
              tx.objectStore(STORE_NAME).put(match);
            } catch {
              // ignore
            }
          }
        }
      } catch {
        // Stop on network failure
        break;
      }
    }

    // Clean up synced items from localStorage queue
    const currentQueue = getLocalQueue().filter((m) => !m.synced);
    setLocalQueue(currentQueue);

    if (syncedCount > 0 && onSynced) {
      onSynced(syncedCount);
    }
  } finally {
    isSyncing = false;
  }

  return syncedCount;
}

/**
 * Get cached last played game
 */
export function getLastPlayedGame(): LastPlayedGame | null {
  try {
    const raw = localStorage.getItem(LAST_PLAYED_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Daily Challenge tracking (resets daily based on YYYY-MM-DD)
 */
export interface DailyChallengeState {
  date: string;
  goal: string;
  targetWins: number;
  currentWins: number;
  rewardXP: number;
  rewardCoins: number;
  claimed: boolean;
}

export function getDailyChallenge(): DailyChallengeState {
  const todayStr = new Date().toISOString().slice(0, 10);
  const defaultChallenge: DailyChallengeState = {
    date: todayStr,
    goal: 'Win 1 game today',
    targetWins: 1,
    currentWins: 0,
    rewardXP: 150,
    rewardCoins: 50,
    claimed: false,
  };

  try {
    const raw = localStorage.getItem('gbedu_daily_challenge');
    if (!raw) return defaultChallenge;
    const parsed: DailyChallengeState = JSON.parse(raw);
    if (parsed.date !== todayStr) {
      // New day, reset challenge
      localStorage.setItem('gbedu_daily_challenge', JSON.stringify(defaultChallenge));
      return defaultChallenge;
    }
    return parsed;
  } catch {
    return defaultChallenge;
  }
}

export function incrementDailyChallenge(isWin: boolean): DailyChallengeState {
  const challenge = getDailyChallenge();
  if (isWin && !challenge.claimed) {
    challenge.currentWins = Math.min(challenge.targetWins, challenge.currentWins + 1);
    try {
      localStorage.setItem('gbedu_daily_challenge', JSON.stringify(challenge));
    } catch {
      // ignore
    }
  }
  return challenge;
}

export function claimDailyReward(): boolean {
  const challenge = getDailyChallenge();
  if (challenge.currentWins >= challenge.targetWins && !challenge.claimed) {
    challenge.claimed = true;
    try {
      localStorage.setItem('gbedu_daily_challenge', JSON.stringify(challenge));
    } catch {
      // ignore
    }
    return true;
  }
  return false;
}

// Auto-sync listener on window reconnect
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncPendingMatches();
  });
}
