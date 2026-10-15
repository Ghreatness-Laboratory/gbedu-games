import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RhythmSong } from '../types';
import { RHYTHM_SONGS } from '../data/rhythmTracks';
import { soundEngine } from '../audio/audioEngine';
import { Play, RotateCcw, Flame, Trophy, Award, Zap, Volume2, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface RhythmGameProps {
  onScoreUpdate: (score: number) => void;
}

const LANES = [
  { id: 0, name: 'Log Drum', keyLabel: 'D', emoji: '🥁', color: 'from-amber-500 to-amber-600', border: 'border-amber-400', glow: 'shadow-amber-500/40', textColor: 'text-amber-400' },
  { id: 1, name: 'Talking Drum', keyLabel: 'F', emoji: '🪘', color: 'from-emerald-500 to-emerald-600', border: 'border-emerald-400', glow: 'shadow-emerald-500/40', textColor: 'text-emerald-400' },
  { id: 2, name: 'Agogo Bell', keyLabel: 'J', emoji: '🔔', color: 'from-cyan-500 to-cyan-600', border: 'border-cyan-400', glow: 'shadow-cyan-500/40', textColor: 'text-cyan-400' },
  { id: 3, name: 'Shekere', keyLabel: 'K', emoji: '⚡', color: 'from-rose-500 to-rose-600', border: 'border-rose-400', glow: 'shadow-rose-500/40', textColor: 'text-rose-400' },
];

const APPROACH_TIME = 1.6; // Seconds for a note to fall from spawn to hit line
const HIT_WINDOW_PERFECT = 0.085; // +/- seconds
const HIT_WINDOW_GREAT = 0.17; // +/- seconds

export const RhythmGame: React.FC<RhythmGameProps> = ({ onScoreUpdate }) => {
  const [selectedSongIndex, setSelectedSongIndex] = useState(0);
  const currentSong = RHYTHM_SONGS[selectedSongIndex];

  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [hitCounts, setHitCounts] = useState({ perfect: 0, great: 0, miss: 0 });
  const [recentJudgment, setRecentJudgment] = useState<{ text: string; color: string; id: number } | null>(null);

  // Active key press feedback state
  const [activeLaneKeys, setActiveLaneKeys] = useState<{ [lane: number]: boolean }>({});

  const notesRef = useRef<{ id: string; lane: number; time: number; hit?: boolean; missed?: boolean }[]>([]);
  const [visibleNotes, setVisibleNotes] = useState<{ id: string; lane: number; yPercent: number; missed?: boolean }[]>([]);

  const songStartTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const judgmentCounterRef = useRef<number>(0);

  // Update multiplier according to current combo
  useEffect(() => {
    if (combo >= 20) setMultiplier(8);
    else if (combo >= 10) setMultiplier(4);
    else if (combo >= 5) setMultiplier(2);
    else setMultiplier(1);

    if (combo > maxCombo) {
      setMaxCombo(combo);
    }
  }, [combo, maxCombo]);

  const triggerHitFeedback = (text: string, color: string) => {
    judgmentCounterRef.current += 1;
    setRecentJudgment({ text, color, id: judgmentCounterRef.current });
  };

  const startSong = useCallback(() => {
    soundEngine.init();
    setIsGameOver(false);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setMultiplier(1);
    setHitCounts({ perfect: 0, great: 0, miss: 0 });
    setRecentJudgment(null);

    // Initialize notes clone
    notesRef.current = currentSong.notes.map((n, i) => ({
      id: `${currentSong.id}-${i}`,
      lane: n.lane,
      time: n.time,
    }));

    // 3 second countdown
    setCountdown(3);
    soundEngine.playAgogo(false);

    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
        soundEngine.playAgogo(count % 2 === 0);
      } else if (count === 0) {
        setCountdown(0); // "GBEDU!"
        soundEngine.playAgogo(true);
      } else {
        clearInterval(interval);
        setCountdown(null);
        setIsPlaying(true);

        const ctx = soundEngine.getAudioContext();
        songStartTimeRef.current = ctx ? ctx.currentTime : performance.now() / 1000;
        soundEngine.startBackingTrack(selectedSongIndex, currentSong.bpm);
      }
    }, 800);
  }, [currentSong, selectedSongIndex]);

  const stopSong = useCallback(() => {
    setIsPlaying(false);
    soundEngine.stopBackingTrack();
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Handle note hitting for a lane
  const hitLane = useCallback((laneIndex: number) => {
    if (!isPlaying) return;

    // Visual press effect
    setActiveLaneKeys((prev) => ({ ...prev, [laneIndex]: true }));
    setTimeout(() => {
      setActiveLaneKeys((prev) => ({ ...prev, [laneIndex]: false }));
    }, 120);

    // Play appropriate instrument sound immediately
    if (laneIndex === 0) soundEngine.playLogDrum(0);
    else if (laneIndex === 1) soundEngine.playTalkingDrum(true);
    else if (laneIndex === 2) soundEngine.playAgogo(true);
    else if (laneIndex === 3) soundEngine.playShekere();

    const ctx = soundEngine.getAudioContext();
    const currentTime = ctx ? ctx.currentTime : performance.now() / 1000;
    const songElapsed = currentTime - songStartTimeRef.current;

    // Find the closest unhit note in this lane
    const candidate = notesRef.current.find(
      (n) => n.lane === laneIndex && !n.hit && !n.missed && Math.abs(n.time - songElapsed) <= HIT_WINDOW_GREAT
    );

    if (candidate) {
      const delta = Math.abs(candidate.time - songElapsed);
      candidate.hit = true;

      if (delta <= HIT_WINDOW_PERFECT) {
        // Perfect
        const pts = 100 * multiplier;
        setScore((s) => s + pts);
        setCombo((c) => c + 1);
        setHitCounts((h) => ({ ...h, perfect: h.perfect + 1 }));
        soundEngine.playHitSound('perfect');
        triggerHitFeedback('SWEET GBEDU! +100', 'text-amber-400');
      } else {
        // Great
        const pts = 50 * multiplier;
        setScore((s) => s + pts);
        setCombo((c) => c + 1);
        setHitCounts((h) => ({ ...h, great: h.great + 1 }));
        soundEngine.playHitSound('great');
        triggerHitFeedback('NICE! +50', 'text-emerald-400');
      }
    }
  }, [isPlaying, multiplier]);

  // Keyboard input listeners (D, F, J, K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const key = e.key.toUpperCase();
      if (key === 'D') hitLane(0);
      else if (key === 'F') hitLane(1);
      else if (key === 'J') hitLane(2);
      else if (key === 'K') hitLane(3);
      else if (key === ' ' && !isPlaying && !countdown) {
        startSong();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hitLane, isPlaying, countdown, startSong]);

  // Main game tick loop
  useEffect(() => {
    if (!isPlaying) return;

    const gameLoop = () => {
      const ctx = soundEngine.getAudioContext();
      const currentTime = ctx ? ctx.currentTime : performance.now() / 1000;
      const songElapsed = currentTime - songStartTimeRef.current;

      // Check if song has finished
      if (songElapsed >= currentSong.duration) {
        stopSong();
        setIsGameOver(true);
        onScoreUpdate(score);
        soundEngine.playCheerSound();
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        return;
      }

      // Process notes: calculate vertical fall position & check misses
      const activeRenderNotes: { id: string; lane: number; yPercent: number; missed?: boolean }[] = [];

      notesRef.current.forEach((note) => {
        const timeToHit = note.time - songElapsed;

        // Note is past hit window and wasn't hit -> Mark missed
        if (timeToHit < -HIT_WINDOW_GREAT && !note.hit && !note.missed) {
          note.missed = true;
          setCombo(0);
          setHitCounts((h) => ({ ...h, miss: h.miss + 1 }));
          soundEngine.playHitSound('miss');
          triggerHitFeedback('MISS', 'text-rose-500');
        }

        // Only render notes in view (from spawn top down to hit line)
        if (timeToHit <= APPROACH_TIME && timeToHit >= -0.2 && !note.hit) {
          // 0% at spawn (top), 85% at hit line
          const progress = 1 - timeToHit / APPROACH_TIME;
          const yPercent = Math.min(100, Math.max(0, progress * 85));
          activeRenderNotes.push({
            id: note.id,
            lane: note.lane,
            yPercent,
            missed: note.missed,
          });
        }
      });

      setVisibleNotes(activeRenderNotes);
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, currentSong, score, stopSong, onScoreUpdate]);

  // Clean up sound on unmount
  useEffect(() => {
    return () => {
      soundEngine.stopBackingTrack();
    };
  }, []);

  const totalNotes = currentSong.notes.length;
  const totalHit = hitCounts.perfect + hitCounts.great;
  const accuracy = totalNotes > 0 ? Math.round((totalHit / totalNotes) * 100) : 0;

  // Grade calculation
  const getGrade = () => {
    if (accuracy >= 92) return { grade: 'S', color: 'text-amber-400', label: 'ODOGWU SUPREME' };
    if (accuracy >= 80) return { grade: 'A', color: 'text-emerald-400', label: 'GBEDU MASTER' };
    if (accuracy >= 65) return { grade: 'B', color: 'text-cyan-400', label: 'VIBE STAR' };
    if (accuracy >= 45) return { grade: 'C', color: 'text-yellow-400', label: 'PARTY STARTER' };
    return { grade: 'D', color: 'text-gray-400', label: 'WARM UP REQUIRED' };
  };

  return (
    <div className="flex flex-col items-center w-full max-w-5xl mx-auto px-4 py-4">
      {/* Top Song Selector Bar */}
      <div className="w-full bg-[#121826] rounded-2xl p-3 border border-white/10 flex flex-wrap items-center justify-between gap-3 mb-4 shadow-xl">
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          <span className="text-xs uppercase font-extrabold text-gray-400 tracking-wider mr-1">Tracks:</span>
          {RHYTHM_SONGS.map((song, idx) => (
            <button
              key={song.id}
              onClick={() => {
                if (isPlaying) stopSong();
                setSelectedSongIndex(idx);
                soundEngine.playAgogo(true);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedSongIndex === idx
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              <span>{song.title}</span>
              <span className="ml-1.5 opacity-75 text-[10px]">({song.bpm} BPM)</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            {currentSong.difficulty}
          </span>
          <span className="text-xs font-mono text-gray-400">
            {currentSong.duration}s
          </span>
        </div>
      </div>

      {/* Game Stage Area */}
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#0e1626] to-[#080d17] rounded-3xl border-2 border-white/10 overflow-hidden shadow-2xl flex flex-col items-center">
        {/* Live HUD Header */}
        <div className="w-full bg-black/40 backdrop-blur-md px-5 py-3 border-b border-white/10 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Score</p>
              <p className="text-2xl font-black font-display text-white tracking-tight">
                {score.toLocaleString()}
              </p>
            </div>

            {multiplier > 1 && (
              <div className={`px-2.5 py-1 rounded-lg font-black text-xs flex items-center gap-1 animate-bounce ${
                multiplier >= 8 ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/50' : 'bg-amber-500 text-black'
              }`}>
                <Flame className="w-3.5 h-3.5" />
                <span>{multiplier}X MULTIPLIER</span>
              </div>
            )}
          </div>

          {/* Combo Meter */}
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Streak</p>
            <p className={`text-2xl font-black font-display tracking-tight transition-transform ${combo > 0 ? 'scale-110 text-amber-400' : 'text-gray-500'}`}>
              {combo} <span className="text-xs font-bold text-gray-400">COMBO</span>
            </p>
          </div>
        </div>

        {/* Central Judgment Alert Overlay */}
        {recentJudgment && (
          <div
            key={recentJudgment.id}
            className={`absolute top-28 z-30 font-display font-black text-2xl md:text-3xl ${recentJudgment.color} animate-ping pointer-events-none drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]`}
          >
            {recentJudgment.text}
          </div>
        )}

        {/* Countdown Overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-30 flex flex-col items-center justify-center">
            <div className="text-7xl font-black text-amber-400 font-display animate-pulse drop-shadow-[0_0_30px_rgba(245,158,11,0.6)]">
              {countdown === 0 ? 'GBEDU!' : countdown}
            </div>
            <p className="text-gray-300 font-bold mt-3 text-sm tracking-wide">
              GET YOUR FINGERS READY! (D • F • J • K)
            </p>
          </div>
        )}

        {/* Start Game Prompt Overlay */}
        {!isPlaying && !countdown && !isGameOver && (
          <div className="absolute inset-0 bg-[#0b0f17]/85 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-3xl shadow-xl shadow-amber-500/30 mb-4 animate-bounce">
              🥁
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold font-display text-white mb-2">
              Ready to Catch the Gbedu?
            </h2>
            <p className="text-gray-300 text-xs md:text-sm max-w-md mb-6 leading-relaxed">
              Hit the falling notes right as they reach the target line! Use keyboard keys <span className="text-amber-400 font-bold">D, F, J, K</span> or tap on screen.
            </p>
            <button
              onClick={startSong}
              className="flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 text-black font-extrabold text-sm md:text-base hover:scale-105 active:scale-95 transition-all shadow-xl shadow-amber-500/30 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>START BEAT TAP</span>
            </button>
            <p className="text-gray-400 text-[11px] mt-4 font-mono">
              Press SPACEBAR to quickly start
            </p>
          </div>
        )}

        {/* 4 Rhythm Lanes Container */}
        <div className="relative w-full h-[420px] md:h-[480px] flex justify-between px-3 md:px-6 py-2 overflow-hidden">
          {/* Subtle lane divider grid */}
          <div className="absolute inset-0 grid grid-cols-4 pointer-events-none opacity-20">
            <div className="border-r border-white/30" />
            <div className="border-r border-white/30" />
            <div className="border-r border-white/30" />
            <div />
          </div>

          {/* Target Strike Line (at 85% height) */}
          <div className="absolute left-0 right-0 top-[85%] -translate-y-1/2 h-1 bg-gradient-to-r from-amber-400 via-rose-400 to-cyan-400 shadow-[0_0_15px_rgba(245,158,11,0.8)] z-10 pointer-events-none opacity-80" />

          {/* Falling Note Entities */}
          {visibleNotes.map((note) => {
            const laneInfo = LANES[note.lane];
            return (
              <div
                key={note.id}
                style={{
                  top: `${note.yPercent}%`,
                  left: `${(note.lane * 25) + 3}%`,
                  width: '19%',
                }}
                className={`absolute -translate-y-1/2 h-9 rounded-xl bg-gradient-to-r ${laneInfo.color} ${laneInfo.border} border-2 shadow-lg ${laneInfo.glow} flex items-center justify-center font-bold text-xs text-white z-10 transition-opacity ${
                  note.missed ? 'opacity-30 grayscale' : 'opacity-100'
                }`}
              >
                <span>{laneInfo.emoji}</span>
              </div>
            );
          })}

          {/* 4 Interactive Columns with Bottom Hit Buttons */}
          {LANES.map((lane) => {
            const isPressed = !!activeLaneKeys[lane.id];
            return (
              <div
                key={lane.id}
                className="relative w-[23%] h-full flex flex-col justify-end items-center pb-2 z-10"
              >
                {/* Visual lane highlight on press */}
                <div
                  className={`absolute inset-0 bg-gradient-to-t ${lane.color} opacity-0 transition-opacity duration-100 pointer-events-none ${
                    isPressed ? 'opacity-25' : ''
                  }`}
                />

                {/* Target Hit Button Indicator */}
                <button
                  onMouseDown={() => hitLane(lane.id)}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    hitLane(lane.id);
                  }}
                  className={`w-full py-3 md:py-4 rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition-all cursor-pointer ${
                    isPressed
                      ? `scale-95 bg-white text-black ${lane.border} shadow-xl shadow-white/40`
                      : `bg-white/10 ${lane.border} hover:bg-white/15 text-white shadow-md`
                  }`}
                >
                  <span className="text-lg md:text-xl">{lane.emoji}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] md:text-xs font-black font-mono px-1.5 py-0.5 rounded bg-black/40 border border-white/20">
                      {lane.keyLabel}
                    </span>
                    <span className="hidden md:inline text-[10px] font-bold text-gray-300">
                      {lane.name}
                    </span>
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* Bottom Status bar */}
        <div className="w-full bg-[#0c121d] px-5 py-2.5 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">● LIVE GBEDU</span>
            <span className="text-gray-500">|</span>
            <span>Acc: <strong className="text-white">{accuracy}%</strong></span>
          </div>
          <div className="flex items-center gap-3">
            <span>P: <strong className="text-amber-400">{hitCounts.perfect}</strong></span>
            <span>G: <strong className="text-emerald-400">{hitCounts.great}</strong></span>
            <span>M: <strong className="text-rose-400">{hitCounts.miss}</strong></span>
          </div>
        </div>

        {/* Game Over / Victory Modal */}
        {isGameOver && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-lg z-40 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 rounded-2xl bg-amber-500/20 border-2 border-amber-500/50 flex items-center justify-center text-4xl mb-3 shadow-xl shadow-amber-500/30">
              🏆
            </div>
            <h2 className="text-3xl font-black font-display text-white mb-1">
              Song Finished!
            </h2>
            <p className="text-amber-400 text-sm font-bold mb-4">
              {currentSong.title} ({currentSong.genre})
            </p>

            {/* Scorecard Box */}
            <div className="w-full max-w-sm bg-[#121927] border border-white/15 rounded-2xl p-4 mb-6 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div>
                  <p className="text-[11px] text-gray-400 uppercase font-bold">Final Score</p>
                  <p className="text-3xl font-black text-white font-display">{score.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-gray-400 uppercase font-bold">Rank</p>
                  <p className={`text-3xl font-black font-display ${getGrade().color}`}>
                    {getGrade().grade}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3 text-center">
                <div className="bg-white/5 p-2 rounded-xl">
                  <p className="text-[10px] text-gray-400">Accuracy</p>
                  <p className="text-base font-extrabold text-white">{accuracy}%</p>
                </div>
                <div className="bg-white/5 p-2 rounded-xl">
                  <p className="text-[10px] text-gray-400">Max Combo</p>
                  <p className="text-base font-extrabold text-amber-400">{maxCombo}x</p>
                </div>
                <div className="bg-white/5 p-2 rounded-xl">
                  <p className="text-[10px] text-gray-400">Status</p>
                  <p className="text-[11px] font-bold text-emerald-400 truncate">{getGrade().label}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={startSong}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-black font-extrabold text-sm hover:bg-amber-400 active:scale-95 transition-all shadow-lg shadow-amber-500/25 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>PLAY AGAIN</span>
              </button>
              <button
                onClick={() => setIsGameOver(false)}
                className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm transition-colors cursor-pointer"
              >
                CLOSE
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
