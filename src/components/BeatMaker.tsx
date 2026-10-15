import React, { useState, useEffect, useRef } from 'react';
import { soundEngine } from '../audio/audioEngine';
import { Play, Square, RotateCcw, Sparkles, Sliders, Music, Disc3, Volume2 } from 'lucide-react';

interface PadConfig {
  id: string;
  label: string;
  sub: string;
  key: string;
  color: string;
  trigger: () => void;
}

export const BeatMaker: React.FC = () => {
  const [bpm, setBpm] = useState(118);
  const [isPlayingSeq, setIsPlayingSeq] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Sequencer Grid: 4 tracks x 16 steps
  // 0: Kick, 1: Log Drum, 2: Talking Drum, 3: Shekere
  const [grid, setGrid] = useState<boolean[][]>([
    // Kick (Four-on-the-floor with syncopation)
    [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
    // Log Drum (Amapiano bounce)
    [false, false, true, false, false, true, false, false, true, false, false, true, false, false, true, false],
    // Talking Drum
    [false, false, false, true, false, false, false, true, false, false, true, false, false, true, false, false],
    // Shekere (continuous 8th/16th shuffle)
    [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
  ]);

  const [activePad, setActivePad] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const pads: PadConfig[] = [
    // Row 1: Amapiano Log Drums
    { id: 'log1', label: 'Log 808 Deep', sub: 'Sub Bass', key: '1', color: 'from-amber-600 to-amber-700 border-amber-500', trigger: () => soundEngine.playLogDrum(-2) },
    { id: 'log2', label: 'Log Drum Mid', sub: 'Amapiano Punch', key: '2', color: 'from-amber-500 to-amber-600 border-amber-400', trigger: () => soundEngine.playLogDrum(0) },
    { id: 'log3', label: 'Log Drum High', sub: 'High Glide', key: '3', color: 'from-amber-400 to-amber-500 border-amber-300', trigger: () => soundEngine.playLogDrum(3) },
    { id: 'log4', label: 'Log Pitch Dive', sub: 'Slide Drop', key: '4', color: 'from-amber-500 to-orange-600 border-orange-400', trigger: () => soundEngine.playLogDrum(6) },

    // Row 2: African Drums
    { id: 'td1', label: 'Talking Drum ↑', sub: 'Gangan High', key: 'Q', color: 'from-emerald-600 to-emerald-700 border-emerald-500', trigger: () => soundEngine.playTalkingDrum(true) },
    { id: 'td2', label: 'Talking Drum ↓', sub: 'Gangan Low', key: 'W', color: 'from-emerald-500 to-emerald-600 border-emerald-400', trigger: () => soundEngine.playTalkingDrum(false) },
    { id: 'bell1', label: 'Agogo High', sub: 'Twin Bell', key: 'E', color: 'from-cyan-600 to-cyan-700 border-cyan-500', trigger: () => soundEngine.playAgogo(true) },
    { id: 'bell2', label: 'Agogo Low', sub: 'Cowbell Tone', key: 'R', color: 'from-cyan-500 to-cyan-600 border-cyan-400', trigger: () => soundEngine.playAgogo(false) },

    // Row 3: Beats & Shakers
    { id: 'kick', label: 'Afro Kick', sub: 'Club Thump', key: 'A', color: 'from-rose-600 to-rose-700 border-rose-500', trigger: () => soundEngine.playKick() },
    { id: 'snare', label: 'Crisp Rimshot', sub: 'Wooden Click', key: 'S', color: 'from-rose-500 to-rose-600 border-rose-400', trigger: () => soundEngine.playRimshot() },
    { id: 'shaker', label: 'Shekere Shaker', sub: 'Beaded Gourd', key: 'D', color: 'from-purple-600 to-purple-700 border-purple-500', trigger: () => soundEngine.playShekere() },
    { id: 'chord1', label: 'Afro Chord 1', sub: 'Cmaj7 Velvet', key: 'F', color: 'from-indigo-600 to-indigo-700 border-indigo-500', trigger: () => soundEngine.playChord([261.63, 329.63, 392.0, 493.88], 0.6) },

    // Row 4: Hype Ad-libs & Melodies
    { id: 'adlib1', label: '"Ehn-Ehn!"', sub: 'Vocal Hook', key: 'Z', color: 'from-yellow-500 to-amber-600 border-yellow-400', trigger: () => soundEngine.playVocalAdlib('ehn') },
    { id: 'adlib2', label: '"Oshey!"', sub: 'Celebration Stanza', key: 'X', color: 'from-pink-600 to-rose-600 border-pink-400', trigger: () => soundEngine.playVocalAdlib('oshey') },
    { id: 'adlib3', label: '"Mad o!"', sub: 'Sub Drop Hype', key: 'C', color: 'from-red-600 to-rose-700 border-red-500', trigger: () => soundEngine.playVocalAdlib('mad') },
    { id: 'chord2', label: 'Afro Chord 2', sub: 'Am9 Soul', key: 'V', color: 'from-violet-600 to-purple-700 border-violet-400', trigger: () => soundEngine.playChord([220.0, 261.63, 329.63, 392.0, 493.88], 0.6) },
  ];

  const triggerPad = (pad: PadConfig) => {
    soundEngine.init();
    pad.trigger();
    setActivePad(pad.id);
    setTimeout(() => {
      setActivePad((curr) => (curr === pad.id ? null : curr));
    }, 150);
  };

  // Keyboard shortcut listener for pads
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toUpperCase();
      const matched = pads.find((p) => p.key === key);
      if (matched) {
        triggerPad(matched);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sequencer step runner
  useEffect(() => {
    if (!isPlayingSeq) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalMs = (60 / bpm / 4) * 1000; // 16th notes
    let step = 0;

    timerRef.current = window.setInterval(() => {
      // Trigger active cells at current step
      if (grid[0][step]) soundEngine.playKick();
      if (grid[1][step]) soundEngine.playLogDrum(step % 6 === 2 ? 3 : 0);
      if (grid[2][step]) soundEngine.playTalkingDrum(step % 4 === 1);
      if (grid[3][step]) soundEngine.playShekere();

      setCurrentStep(step);
      step = (step + 1) % 16;
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlayingSeq, bpm, grid]);

  const toggleCell = (trackIdx: number, stepIdx: number) => {
    soundEngine.init();
    setGrid((prev) => {
      const copy = prev.map((row) => [...row]);
      copy[trackIdx][stepIdx] = !copy[trackIdx][stepIdx];
      return copy;
    });
  };

  const loadPreset = (presetName: string) => {
    soundEngine.playAgogo(true);
    if (presetName === 'amapiano') {
      setBpm(114);
      setGrid([
        [true, false, false, false, false, false, true, false, true, false, false, false, false, true, false, false],
        [false, false, true, false, false, true, false, false, true, false, false, true, false, false, true, false],
        [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
        [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
      ]);
    } else if (presetName === 'fela') {
      setBpm(105);
      setGrid([
        [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
        [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        [false, true, false, false, true, false, true, false, false, true, false, false, true, false, true, false],
        [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
      ]);
    } else if (presetName === 'street') {
      setBpm(125);
      setGrid([
        [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
        [false, false, true, false, false, false, true, false, false, false, true, false, false, true, false, false],
        [false, false, false, true, false, false, false, true, false, false, false, true, false, false, false, true],
        [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
      ]);
    }
  };

  const clearGrid = () => {
    setGrid([
      Array(16).fill(false),
      Array(16).fill(false),
      Array(16).fill(false),
      Array(16).fill(false),
    ]);
  };

  const trackLabels = [
    { label: 'Afro Kick', emoji: '🥁', color: 'text-rose-400' },
    { label: 'Log Drum 808', emoji: '💥', color: 'text-amber-400' },
    { label: 'Talking Drum', emoji: '🪘', color: 'text-emerald-400' },
    { label: 'Shekere Shaker', emoji: '⚡', color: 'text-purple-400' },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-4 space-y-6">
      {/* Header and Controller */}
      <div className="bg-[#121826] rounded-3xl p-5 border border-white/10 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 via-amber-500 to-emerald-500 p-[2px] shadow-lg shadow-rose-500/20">
            <div className="w-full h-full bg-[#0b0f17] rounded-[14px] flex items-center justify-center text-2xl">
              🎛️
            </div>
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black font-display text-white">
              Cook The Gbedu (Studio & MPC)
            </h2>
            <p className="text-xs text-gray-400 font-medium">
              Tap authentic African percussion & log drums, or run the 16-step rhythm sequencer!
            </p>
          </div>
        </div>

        {/* Sequencer Transport & BPM Controls */}
        <div className="flex items-center flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
            <span className="text-xs text-gray-400 font-mono font-bold">BPM:</span>
            <input
              type="range"
              min="85"
              max="145"
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="w-20 md:w-28 accent-amber-500 cursor-pointer"
            />
            <span className="text-sm font-black font-mono text-amber-400 w-8">{bpm}</span>
          </div>

          <button
            onClick={() => {
              soundEngine.init();
              setIsPlayingSeq(!isPlayingSeq);
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-sm transition-all cursor-pointer shadow-md ${
              isPlayingSeq
                ? 'bg-rose-500 text-white shadow-rose-500/30'
                : 'bg-emerald-500 text-black shadow-emerald-500/30 hover:bg-emerald-400'
            }`}
          >
            {isPlayingSeq ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{isPlayingSeq ? 'STOP' : 'PLAY LOOP'}</span>
          </button>
        </div>
      </div>

      {/* 16-Pad MPC Soundboard Grid */}
      <div className="bg-[#0e1524] rounded-3xl p-5 border border-white/10 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Disc3 className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-extrabold text-white">
              Live Soundboard (Touch or Keys 1-4, Q-R, A-F, Z-V)
            </h3>
          </div>
          <span className="text-xs text-gray-400 font-mono">Zero Latency Audio</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {pads.map((pad) => {
            const isHot = activePad === pad.id;
            return (
              <button
                key={pad.id}
                onMouseDown={() => triggerPad(pad)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  triggerPad(pad);
                }}
                className={`relative p-4 rounded-2xl bg-gradient-to-b ${pad.color} border-2 text-left transition-all active:scale-95 cursor-pointer shadow-md ${
                  isHot ? 'scale-95 brightness-150 ring-4 ring-white shadow-xl shadow-white/30' : 'hover:brightness-110'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono font-black px-1.5 py-0.5 rounded bg-black/40 text-white border border-white/20">
                    {pad.key}
                  </span>
                  <span className="text-xs opacity-80 text-white">{pad.sub}</span>
                </div>
                <p className="text-sm font-black text-white truncate drop-shadow">{pad.label}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 16-Step Sequencer Grid */}
      <div className="bg-[#0e1524] rounded-3xl p-5 border border-white/10 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-400" />
              <span>16-Step African Drum Sequencer</span>
            </h3>
            <p className="text-xs text-gray-400">Click steps to program custom Afrobeats and Amapiano drum loops</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400 uppercase font-bold mr-1">Presets:</span>
            <button
              onClick={() => loadPreset('amapiano')}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 text-xs font-bold transition-colors cursor-pointer"
            >
              Amapiano
            </button>
            <button
              onClick={() => loadPreset('fela')}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 text-xs font-bold transition-colors cursor-pointer"
            >
              Fela Afrobeat
            </button>
            <button
              onClick={() => loadPreset('street')}
              className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 text-xs font-bold transition-colors cursor-pointer"
            >
              Street Hop
            </button>
            <button
              onClick={clearGrid}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Step Matrix */}
        <div className="space-y-2.5 overflow-x-auto pb-2">
          {grid.map((track, trackIdx) => {
            const info = trackLabels[trackIdx];
            return (
              <div key={trackIdx} className="flex items-center gap-2 min-w-[620px]">
                {/* Track Name */}
                <div className="w-32 flex items-center gap-1.5 shrink-0">
                  <span className="text-base">{info.emoji}</span>
                  <span className={`text-xs font-black truncate ${info.color}`}>{info.label}</span>
                </div>

                {/* 16 Step Buttons */}
                <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-1 flex-1">
                  {track.map((isActive, stepIdx) => {
                    const isCurrent = isPlayingSeq && currentStep === stepIdx;
                    const isQuarter = stepIdx % 4 === 0;

                    return (
                      <button
                        key={stepIdx}
                        onClick={() => toggleCell(trackIdx, stepIdx)}
                        className={`h-9 rounded-lg border transition-all cursor-pointer ${
                          isActive
                            ? 'bg-amber-500 border-amber-300 shadow-sm shadow-amber-500/50'
                            : isQuarter
                            ? 'bg-white/10 border-white/15 hover:bg-white/15'
                            : 'bg-white/5 border-white/5 hover:bg-white/10'
                        } ${isCurrent ? 'ring-2 ring-white scale-105' : ''}`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
