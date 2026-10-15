export type GameTab = 'rhythm' | 'lyrics' | 'beatmaker' | 'guess' | 'party';

export interface NoteItem {
  id: string;
  lane: number; // 0: Log Drum, 1: Talking Drum, 2: Agogo, 3: Shekere
  time: number; // Time in seconds from song start
  hit?: boolean;
  missed?: boolean;
}

export interface RhythmSong {
  id: string;
  title: string;
  artist: string;
  genre: 'Afrobeats' | 'Amapiano' | 'Afro-Fusion' | 'Highlife';
  bpm: number;
  duration: number; // seconds
  difficulty: 'Easy' | 'Medium' | 'Odogwu (Hard)';
  description: string;
  notes: { lane: number; time: number }[];
}

export interface QuizQuestion {
  id: string;
  title: string;
  snippet: string;
  missingLyric?: string;
  options: string[];
  correctAnswer: string;
  artist: string;
  trackName: string;
  year: string;
  funFact: string;
  category: 'Finish Lyrics' | 'Afrobeats Trivia' | 'Street Slang' | 'Album Knowledge';
}

export interface SoundPad {
  id: string;
  label: string;
  category: 'percussion' | 'synth' | 'vocal';
  key: string;
  color: string;
  soundType: string;
  pitchOffset?: number;
}

export interface PlayerProfile {
  name: string;
  title: string;
  avatar: string;
  totalScore: number;
  rhythmHighScore: number;
  lyricsStreak: number;
  unlockedBadges: string[];
}

export interface MelodyChallenge {
  id: string;
  title: string;
  artist: string;
  genre: string;
  notes: { freq: number; duration: number }[];
  options: string[];
  correctAnswer: string;
  hint: string;
}
