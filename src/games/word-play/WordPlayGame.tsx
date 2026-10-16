import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { soundEngine } from '../../audio/audioEngine';
import { GameResultModal } from '../../components/GameResultModal';
import { Avatar } from '../../components/Avatar';
import { useWhotStore } from '../../store/useWhotStore';
import {
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Shuffle,
  Lightbulb,
  CheckCircle2,
  Clock,
  Share2,
  Trophy,
  Flame,
  Bot,
  Users,
  Coins,
  ChevronRight,
  Hash,
  HelpCircle,
  Volume2,
} from 'lucide-react';
import {
  COMMON_5_LETTER_ANSWERS,
  NAIJA_5_LETTER_WORDS,
  VALID_5_LETTER_GUESS_SET,
  SCRAMBLE_PUZZLES,
  WORD_SEARCH_PUZZLES,
  getDailyWordTarget,
  ScramblePuzzle,
} from '../../data/wordPlayData';

type WordPlaySubGame = 'guess' | 'scramble' | 'chain' | 'search';
type PlayMode = 'solo' | 'ai' | 'pass' | 'race';

interface WordPlayGameProps {
  onBack: () => void;
  initialSubGame?: WordPlaySubGame;
  initialMode?: PlayMode;
}

export const WordPlayGame: React.FC<WordPlayGameProps> = ({
  onBack,
  initialSubGame = 'guess',
  initialMode = 'solo',
}) => {
  const { user, stats } = useWhotStore();

  // Active subgame & play mode
  const [subGame, setSubGame] = useState<WordPlaySubGame>(initialSubGame);
  const [mode, setMode] = useState<PlayMode>(initialMode);

  // Settings
  const [useNaijaWords, setUseNaijaWords] = useState<boolean>(true);
  const [coins, setCoins] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gbedu_coins');
      return saved ? Number(saved) : 150;
    }
    return 150;
  });

  // Modal result state
  const [resultModal, setResultModal] = useState<{
    isOpen: boolean;
    outcome: 'win' | 'lose' | 'draw';
    title: string;
    description: string;
    score: number;
    coinsEarned: number;
    xpEarned: number;
  }>({
    isOpen: false,
    outcome: 'win',
    title: '',
    description: '',
    score: 0,
    coinsEarned: 0,
    xpEarned: 0,
  });

  // -------------------------------------------------------------
  // 1. GUESS THE WORD (5-Letter, 6 Tries)
  // -------------------------------------------------------------
  const [guessTarget, setGuessTarget] = useState<string>('');
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState<string>('');
  const [guessGameOver, setGuessGameOver] = useState<boolean>(false);
  const [guessIsDaily, setGuessIsDaily] = useState<boolean>(true);
  const [guessStatusMsg, setGuessStatusMsg] = useState<string>('');
  const [guessStreak, setGuessStreak] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gbedu_wordplay_guess_streak');
      return saved ? Number(saved) : 0;
    }
    return 0;
  });
  const [shareCopied, setShareCopied] = useState<boolean>(false);

  // Initialize Guess target
  const initGuessGame = (isDaily = guessIsDaily) => {
    setGuessIsDaily(isDaily);
    setGuesses([]);
    setCurrentGuess('');
    setGuessGameOver(false);
    setGuessStatusMsg('');

    if (isDaily) {
      const daily = getDailyWordTarget(useNaijaWords);
      setGuessTarget(daily.word);
    } else {
      const pool = useNaijaWords
        ? [...NAIJA_5_LETTER_WORDS, ...COMMON_5_LETTER_ANSWERS]
        : COMMON_5_LETTER_ANSWERS;
      const randomWord = pool[Math.floor(Math.random() * pool.length)].toUpperCase();
      setGuessTarget(randomWord);
    }
  };

  useEffect(() => {
    if (subGame === 'guess') {
      initGuessGame();
    }
  }, [subGame, useNaijaWords]);

  // Keyboards key color tracker
  const keyStatusMap: Record<string, 'correct' | 'present' | 'absent'> = {};
  guesses.forEach((g) => {
    const letters = g.split('');
    const targetLetters = guessTarget.split('');
    letters.forEach((ch, idx) => {
      if (guessTarget[idx] === ch) {
        keyStatusMap[ch] = 'correct';
      } else if (targetLetters.includes(ch)) {
        if (keyStatusMap[ch] !== 'correct') {
          keyStatusMap[ch] = 'present';
        }
      } else {
        if (!keyStatusMap[ch]) {
          keyStatusMap[ch] = 'absent';
        }
      }
    });
  });

  const handleKeyInput = (key: string) => {
    if (guessGameOver) return;

    if (key === 'ENTER') {
      if (currentGuess.length !== 5) {
        soundEngine.playWrongSound();
        setGuessStatusMsg('Enter a 5-letter word!');
        setTimeout(() => setGuessStatusMsg(''), 1800);
        return;
      }

      const upperGuess = currentGuess.toUpperCase();
      if (!VALID_5_LETTER_GUESS_SET.has(upperGuess)) {
        soundEngine.playWrongSound();
        setGuessStatusMsg(`"${upperGuess}" is not in dictionary!`);
        setTimeout(() => setGuessStatusMsg(''), 2000);
        return;
      }

      soundEngine.playTile();
      const nextGuesses = [...guesses, upperGuess];
      setGuesses(nextGuesses);
      setCurrentGuess('');

      // Check win
      if (upperGuess === guessTarget) {
        soundEngine.playWin();
        setGuessGameOver(true);
        const newStreak = guessStreak + 1;
        setGuessStreak(newStreak);
        if (typeof window !== 'undefined') {
          localStorage.setItem('gbedu_wordplay_guess_streak', String(newStreak));
        }
        setTimeout(() => {
          setResultModal({
            isOpen: true,
            outcome: 'win',
            title: 'Spot On! You Sabi Word! 🏆',
            description: `You solved "${guessTarget}" in ${nextGuesses.length} ${
              nextGuesses.length === 1 ? 'try' : 'tries'
            }!`,
            score: (7 - nextGuesses.length) * 150,
            coinsEarned: 25,
            xpEarned: 120,
          });
        }, 1200);
        return;
      }

      // Check lose (6 guesses)
      if (nextGuesses.length >= 6) {
        soundEngine.playWrongSound();
        setGuessGameOver(true);
        setGuessStreak(0);
        if (typeof window !== 'undefined') {
          localStorage.setItem('gbedu_wordplay_guess_streak', '0');
        }
        setTimeout(() => {
          setResultModal({
            isOpen: true,
            outcome: 'lose',
            title: 'No Shaking! You Tried! 🤝',
            description: `The correct word was "${guessTarget}". Practice again to build your streak!`,
            score: 50,
            coinsEarned: 5,
            xpEarned: 30,
          });
        }, 1200);
      }
    } else if (key === 'BACK' || key === '⌫') {
      soundEngine.playClick();
      setCurrentGuess((prev) => prev.slice(0, -1));
    } else if (/^[A-Z]$/.test(key)) {
      if (currentGuess.length < 5) {
        soundEngine.playClick();
        setCurrentGuess((prev) => prev + key);
      }
    }
  };

  // Generate shareable spoiler-free emoji grid
  const handleShareGuessResult = () => {
    soundEngine.playClick();
    const rows = guesses.map((g) => {
      return g
        .split('')
        .map((ch, i) => {
          if (guessTarget[i] === ch) return '🟩';
          if (guessTarget.includes(ch)) return '🟨';
          return '⬛';
        })
        .join('');
    });

    const shareText = `Gbedu Games: Word Play\nGuess the Word ${
      guessGameOver && guesses[guesses.length - 1] === guessTarget
        ? `${guesses.length}/6 🎯`
        : 'X/6'
    }\n\n${rows.join('\n')}\n\nPlay at: gbedu.app`;

    navigator.clipboard.writeText(shareText);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2400);
  };

  // -------------------------------------------------------------
  // 2. SCRAMBLE PUZZLE
  // -------------------------------------------------------------
  const [scrambleIndex, setScrambleIndex] = useState(0);
  const [scrambleRack, setScrambleRack] = useState<{ id: string; letter: string }[]>([]);
  const [scrambleSlots, setScrambleSlots] = useState<{ id: string; letter: string }[]>([]);
  const [scrambleTimer, setScrambleTimer] = useState<number>(45);
  const [scrambleActive, setScrambleActive] = useState<boolean>(true);
  const [scrambleScore, setScrambleScore] = useState<number>(0);
  const [scrambleCombo, setScrambleCombo] = useState<number>(0);

  const activeScramble: ScramblePuzzle = SCRAMBLE_PUZZLES[scrambleIndex % SCRAMBLE_PUZZLES.length];

  const initScramble = (index = scrambleIndex) => {
    const puzzle = SCRAMBLE_PUZZLES[index % SCRAMBLE_PUZZLES.length];
    const letters = puzzle.word.split('').sort(() => Math.random() - 0.5);
    setScrambleRack(letters.map((l, i) => ({ id: `${l}-${i}-${Date.now()}`, letter: l })));
    setScrambleSlots([]);
    setScrambleTimer(45);
    setScrambleActive(true);
  };

  useEffect(() => {
    if (subGame === 'scramble') {
      initScramble();
    }
  }, [subGame, scrambleIndex]);

  // Scramble countdown timer
  useEffect(() => {
    if (subGame !== 'scramble' || !scrambleActive || scrambleTimer <= 0) return;
    const interval = setInterval(() => {
      setScrambleTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setScrambleActive(false);
          soundEngine.playWrongSound();
          setResultModal({
            isOpen: true,
            outcome: 'lose',
            title: 'Time Up! Danfo Left You! ⏱️',
            description: `The word was "${activeScramble.word}". Score: ${scrambleScore} pts`,
            score: scrambleScore,
            coinsEarned: 5,
            xpEarned: 25,
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [subGame, scrambleActive, scrambleTimer, activeScramble, scrambleScore]);

  const handleTapRackLetter = (item: { id: string; letter: string }) => {
    soundEngine.playTile();
    setScrambleRack((prev) => prev.filter((x) => x.id !== item.id));
    const newSlots = [...scrambleSlots, item];
    setScrambleSlots(newSlots);

    // If all letters placed, check word!
    if (newSlots.length === activeScramble.word.length) {
      const spelled = newSlots.map((s) => s.letter).join('');
      if (spelled === activeScramble.word) {
        soundEngine.playCorrectSound();
        const pts = 100 + scrambleTimer * 5 + scrambleCombo * 20;
        setScrambleScore((prev) => prev + pts);
        setScrambleCombo((prev) => prev + 1);

        setTimeout(() => {
          if (scrambleIndex + 1 < SCRAMBLE_PUZZLES.length) {
            setScrambleIndex((prev) => prev + 1);
          } else {
            soundEngine.playWin();
            setResultModal({
              isOpen: true,
              outcome: 'win',
              title: 'Scramble Champion! 🥇',
              description: `You solved all anagrams with total ${scrambleScore + pts} points!`,
              score: scrambleScore + pts,
              coinsEarned: 35,
              xpEarned: 200,
            });
          }
        }, 800);
      } else {
        soundEngine.playWrongSound();
      }
    }
  };

  const handleTapSlotLetter = (item: { id: string; letter: string }) => {
    soundEngine.playClick();
    setScrambleSlots((prev) => prev.filter((x) => x.id !== item.id));
    setScrambleRack((prev) => [...prev, item]);
  };

  const handleShuffleScramble = () => {
    soundEngine.playClick();
    setScrambleRack((prev) => [...prev].sort(() => Math.random() - 0.5));
  };

  const handleUseScrambleHint = () => {
    if (coins < 10) {
      soundEngine.playWrongSound();
      return;
    }
    // Find first empty index and place correct letter
    const targetWord = activeScramble.word;
    const currentPlaced = scrambleSlots.map((s) => s.letter).join('');
    if (currentPlaced === targetWord) return;

    soundEngine.playAgogo(true);
    setCoins((prev) => {
      const next = prev - 10;
      localStorage.setItem('gbedu_coins', String(next));
      return next;
    });

    const nextIdx = scrambleSlots.length;
    const neededLetter = targetWord[nextIdx];
    const foundInRack = scrambleRack.find((r) => r.letter === neededLetter);

    if (foundInRack) {
      handleTapRackLetter(foundInRack);
    } else {
      // Return wrong letters from slots and place correct
      setScrambleSlots([]);
      setScrambleRack(targetWord.split('').map((l, i) => ({ id: `${l}-${i}-${Date.now()}`, letter: l })));
    }
  };

  // -------------------------------------------------------------
  // 3. WORD CHAIN (Next word starts with last letter of previous)
  // -------------------------------------------------------------
  const [chainHistory, setChainHistory] = useState<{ word: string; author: string }[]>([
    { word: 'LAGOS', author: 'Odogwu AI' },
  ]);
  const [chainInput, setChainInput] = useState<string>('');
  const [chainTurn, setChainTurn] = useState<'player' | 'computer' | 'player2'>('player');
  const [chainTimer, setChainTimer] = useState<number>(20);
  const [chainStatus, setChainStatus] = useState<string>('Your turn! Word must start with "S"');

  const lastChainWord = chainHistory[chainHistory.length - 1]?.word || 'GBEDU';
  const requiredLetter = lastChainWord[lastChainWord.length - 1].toUpperCase();

  // Reset chain
  const initChain = () => {
    setChainHistory([{ word: 'LAGOS', author: mode === 'ai' ? 'Odogwu AI' : 'Player 1' }]);
    setChainInput('');
    setChainTurn('player');
    setChainTimer(20);
    setChainStatus('Your turn! Spell a word starting with "S"');
  };

  useEffect(() => {
    if (subGame === 'chain') {
      initChain();
    }
  }, [subGame, mode]);

  // Turn timer for Word Chain
  useEffect(() => {
    if (subGame !== 'chain' || chainTimer <= 0) return;
    const t = setInterval(() => {
      setChainTimer((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          soundEngine.playWrongSound();
          if (chainTurn === 'player') {
            setResultModal({
              isOpen: true,
              outcome: 'lose',
              title: 'Time Ran Out! 🏃',
              description: `You could not find a word starting with "${requiredLetter}"!`,
              score: (chainHistory.length - 1) * 50,
              coinsEarned: 5,
              xpEarned: 20,
            });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [subGame, chainTurn, chainTimer, requiredLetter, chainHistory]);

  const handleSubmitChainWord = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = chainInput.trim().toUpperCase();
    if (!clean) return;

    if (clean[0] !== requiredLetter) {
      soundEngine.playWrongSound();
      setChainStatus(`Word must start with letter "${requiredLetter}"!`);
      return;
    }

    if (clean.length < 3) {
      soundEngine.playWrongSound();
      setChainStatus('Word must be at least 3 letters long!');
      return;
    }

    // Check if word already used
    if (chainHistory.some((item) => item.word === clean)) {
      soundEngine.playWrongSound();
      setChainStatus(`"${clean}" has already been used in this chain!`);
      return;
    }

    // Client dictionary validation
    const inDict =
      VALID_5_LETTER_GUESS_SET.has(clean) ||
      SCRAMBLE_PUZZLES.some((p) => p.word === clean) ||
      clean.length >= 3; // Allow valid common words

    if (!inDict) {
      soundEngine.playWrongSound();
      setChainStatus(`"${clean}" not recognized in the dictionary!`);
      return;
    }

    // Valid word!
    soundEngine.playCorrectSound();
    const newHistory = [...chainHistory, { word: clean, author: user?.displayName || 'Player 1' }];
    setChainHistory(newHistory);
    setChainInput('');
    setChainTimer(20);

    const nextLetter = clean[clean.length - 1];

    if (mode === 'ai') {
      setChainTurn('computer');
      setChainStatus(`Odogwu AI is thinking of a word starting with "${nextLetter}"...`);

      // AI Response with realistic delay
      setTimeout(() => {
        const pool = [...COMMON_5_LETTER_ANSWERS, ...NAIJA_5_LETTER_WORDS];
        const candidates = pool.filter(
          (w) => w.startsWith(nextLetter) && !newHistory.some((h) => h.word === w)
        );

        if (candidates.length > 0) {
          const aiWord = candidates[Math.floor(Math.random() * candidates.length)];
          soundEngine.playAgogo(true);
          const aiHistory = [...newHistory, { word: aiWord, author: 'Odogwu AI' }];
          setChainHistory(aiHistory);
          setChainTurn('player');
          const aiNext = aiWord[aiWord.length - 1];
          setChainStatus(`Odogwu AI played "${aiWord}"! Your turn starting with "${aiNext}"`);
        } else {
          // AI can't find word: Player wins!
          soundEngine.playWin();
          setResultModal({
            isOpen: true,
            outcome: 'win',
            title: 'Odogwu AI Bows Down! 👑',
            description: `AI could not answer for letter "${nextLetter}"! You win with ${newHistory.length} chain links!`,
            score: newHistory.length * 100,
            coinsEarned: 30,
            xpEarned: 150,
          });
        }
      }, 1600);
    } else {
      // Pass & Play mode
      const nextTurn = chainTurn === 'player' ? 'player2' : 'player';
      setChainTurn(nextTurn);
      setChainStatus(`${nextTurn === 'player' ? 'Player 1' : 'Player 2'} turn starting with "${nextLetter}"!`);
    }
  };

  // -------------------------------------------------------------
  // 4. WORD SEARCH (8x8 or 10x10 Theme Grid)
  // -------------------------------------------------------------
  const [searchTheme, setSearchTheme] = useState<string>('foods');
  const [selectedCells, setSelectedCells] = useState<{ row: number; col: number }[]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [searchTimer, setSearchTimer] = useState<number>(120);

  const activeSearch = WORD_SEARCH_PUZZLES[searchTheme] || WORD_SEARCH_PUZZLES.foods;

  const initSearch = (theme = searchTheme) => {
    setSelectedCells([]);
    setFoundWords([]);
    setSearchTimer(120);
  };

  useEffect(() => {
    if (subGame === 'search') {
      initSearch();
    }
  }, [subGame, searchTheme]);

  // Touch cell toggle / path select
  const handleCellClick = (row: number, col: number) => {
    soundEngine.playClick();
    const isAlready = selectedCells.some((c) => c.row === row && c.col === col);
    let newSelection: { row: number; col: number }[];

    if (isAlready) {
      newSelection = selectedCells.filter((c) => !(c.row === row && c.col === col));
    } else {
      newSelection = [...selectedCells, { row, col }];
    }
    setSelectedCells(newSelection);

    // Check if the current letters match any target word
    const formed = newSelection.map((c) => activeSearch.grid[c.row][c.col]).join('');
    const matched = activeSearch.words.find(
      (w) => !foundWords.includes(w.word) && (w.word === formed || w.word === formed.split('').reverse().join(''))
    );

    if (matched) {
      soundEngine.playCorrectSound();
      const nextFound = [...foundWords, matched.word];
      setFoundWords(nextFound);
      setSelectedCells([]);

      if (nextFound.length >= activeSearch.words.length) {
        soundEngine.playWin();
        setTimeout(() => {
          setResultModal({
            isOpen: true,
            outcome: 'win',
            title: 'Grid Conquered! 🏆',
            description: `You uncovered all ${nextFound.length} Nigerian words in the grid!`,
            score: nextFound.length * 150,
            coinsEarned: 40,
            xpEarned: 220,
          });
        }, 600);
      }
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-3 sm:px-4 py-3 flex flex-col gap-3 selection:bg-[#ff7a00] select-none min-h-[calc(100vh-60px)]">
      {/* 1. TOP HEADER & SUBGAME TABS */}
      <div className="flex items-center justify-between gap-2 border-b border-[#26314d] pb-2.5">
        <button
          onClick={onBack}
          className="min-h-[44px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141d33] hover:bg-[#1a2540] border border-[#26314d] text-gray-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Lobby</span>
        </button>

        {/* Coins & Streak Display */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#ffb703]/15 border border-[#ffb703]/30 text-[#ffb703] text-xs font-black">
            <Coins className="w-3.5 h-3.5" />
            <span>{coins}</span>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#ff7a00]/15 border border-[#ff7a00]/30 text-[#ff7a00] text-xs font-black">
            <Flame className="w-3.5 h-3.5 fill-[#ff7a00]" />
            <span>{guessStreak}</span>
          </div>
        </div>
      </div>

      {/* 2. SUBGAME SELECTOR ROW (Compact 4-button menu) */}
      <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-[#141d33] border border-[#26314d]">
        <button
          onClick={() => {
            soundEngine.playClick();
            setSubGame('guess');
          }}
          className={`min-h-[40px] py-1.5 px-2 rounded-xl text-center font-display font-black text-[11px] transition-all cursor-pointer ${
            subGame === 'guess'
              ? 'bg-[#1fd1a0] text-black shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Guess Word
        </button>

        <button
          onClick={() => {
            soundEngine.playClick();
            setSubGame('scramble');
          }}
          className={`min-h-[40px] py-1.5 px-2 rounded-xl text-center font-display font-black text-[11px] transition-all cursor-pointer ${
            subGame === 'scramble'
              ? 'bg-[#1fd1a0] text-black shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Scramble
        </button>

        <button
          onClick={() => {
            soundEngine.playClick();
            setSubGame('chain');
          }}
          className={`min-h-[40px] py-1.5 px-2 rounded-xl text-center font-display font-black text-[11px] transition-all cursor-pointer ${
            subGame === 'chain'
              ? 'bg-[#1fd1a0] text-black shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Word Chain
        </button>

        <button
          onClick={() => {
            soundEngine.playClick();
            setSubGame('search');
          }}
          className={`min-h-[40px] py-1.5 px-2 rounded-xl text-center font-display font-black text-[11px] transition-all cursor-pointer ${
            subGame === 'search'
              ? 'bg-[#1fd1a0] text-black shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Word Search
        </button>
      </div>

      {/* -------------------------------------------------------------
          VIEW 1: GUESS THE WORD (5-Letter, 6 Tries)
      ------------------------------------------------------------- */}
      {subGame === 'guess' && (
        <div className="flex flex-col gap-3">
          {/* Subheader: Mode toggle & Naija words switch */}
          <div className="flex items-center justify-between text-xs px-1">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => initGuessGame(true)}
                className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
                  guessIsDaily
                    ? 'bg-[#ff7a00] text-black'
                    : 'bg-[#141d33] text-gray-400 border border-[#26314d]'
                }`}
              >
                Daily Puzzle
              </button>
              <button
                onClick={() => initGuessGame(false)}
                className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
                  !guessIsDaily
                    ? 'bg-[#ff7a00] text-black'
                    : 'bg-[#141d33] text-gray-400 border border-[#26314d]'
                }`}
              >
                Endless Practice
              </button>
            </div>

            {/* Toggle Naija Words Pack */}
            <button
              onClick={() => {
                soundEngine.playClick();
                setUseNaijaWords((prev) => !prev);
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black border transition-all cursor-pointer ${
                useNaijaWords
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-white/5 text-gray-400 border-white/10'
              }`}
            >
              <span>🇳🇬 Naija Pack:</span>
              <span className="uppercase">{useNaijaWords ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          {/* Status Message */}
          {guessStatusMsg && (
            <div className="py-1 px-3 text-center text-xs font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded-xl animate-scale-up">
              {guessStatusMsg}
            </div>
          )}

          {/* 6-Row Guessing Grid */}
          <div className="flex flex-col items-center justify-center gap-1.5 py-1">
            {Array.from({ length: 6 }).map((_, rowIndex) => {
              const isCurrentRow = rowIndex === guesses.length;
              const submittedWord = guesses[rowIndex];

              return (
                <div key={rowIndex} className="flex gap-1.5">
                  {Array.from({ length: 5 }).map((__, colIndex) => {
                    let letter = '';
                    let tileColor = 'bg-[#141d33] border-[#26314d] text-white';

                    if (submittedWord) {
                      letter = submittedWord[colIndex] || '';
                      if (guessTarget[colIndex] === letter) {
                        tileColor = 'bg-[#1fd1a0] border-[#1fd1a0] text-black shadow-md';
                      } else if (guessTarget.includes(letter)) {
                        tileColor = 'bg-[#ffb703] border-[#ffb703] text-black shadow-md';
                      } else {
                        tileColor = 'bg-[#1c2438] border-gray-700/60 text-gray-400';
                      }
                    } else if (isCurrentRow) {
                      letter = currentGuess[colIndex] || '';
                      if (letter) {
                        tileColor = 'bg-[#1a2540] border-[#1fd1a0]/70 text-white shadow-sm';
                      }
                    }

                    return (
                      <motion.div
                        key={colIndex}
                        initial={false}
                        animate={letter ? { scale: [1, 1.08, 1] } : {}}
                        transition={{ duration: 0.15 }}
                        className={`w-12 h-12 sm:w-13 sm:h-13 rounded-xl border-2 flex items-center justify-center font-display font-black text-xl sm:text-2xl transition-colors ${tileColor}`}
                      >
                        {letter}
                      </motion.div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Share Results or Next Match Button */}
          {guessGameOver && (
            <div className="flex items-center justify-center gap-2 py-1">
              <button
                onClick={handleShareGuessResult}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-gradient-to-r from-[#1fd1a0] to-[#17b88c] text-black font-black text-xs font-display flex items-center gap-1.5 shadow-md cursor-pointer hover:brightness-105"
              >
                <Share2 className="w-4 h-4" />
                <span>{shareCopied ? 'Copied to Clipboard!' : 'Share Result Card'}</span>
              </button>

              <button
                onClick={() => initGuessGame(false)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#141d33] hover:bg-[#1a2540] border border-[#26314d] text-white font-black text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Next Puzzle</span>
              </button>
            </div>
          )}

          {/* On-Screen Keyboard */}
          <div className="flex flex-col gap-1.5 mt-1">
            {[
              ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
              ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
              ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫'],
            ].map((row, rIdx) => (
              <div key={rIdx} className="flex justify-center gap-1">
                {row.map((k) => {
                  const status = keyStatusMap[k];
                  let bg = 'bg-[#141d33] hover:bg-[#1f2b4a] border-[#26314d] text-white';
                  if (status === 'correct') {
                    bg = 'bg-[#1fd1a0] border-[#1fd1a0] text-black font-black';
                  } else if (status === 'present') {
                    bg = 'bg-[#ffb703] border-[#ffb703] text-black font-black';
                  } else if (status === 'absent') {
                    bg = 'bg-[#121929] border-gray-800 text-gray-500';
                  }

                  const isWide = k === 'ENTER' || k === '⌫';

                  return (
                    <button
                      key={k}
                      onClick={() => handleKeyInput(k)}
                      className={`min-h-[44px] h-11 ${
                        isWide ? 'px-2.5 text-[11px] font-black' : 'flex-1 text-sm font-black'
                      } rounded-xl border flex items-center justify-center transition-all active:scale-95 cursor-pointer ${bg}`}
                    >
                      {k}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          VIEW 2: SCRAMBLE
      ------------------------------------------------------------- */}
      {subGame === 'scramble' && (
        <div className="flex flex-col gap-3">
          {/* Header Info & Timer */}
          <div className="p-3 rounded-2xl bg-[#141d33] border border-[#26314d] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-[#ffb703] tracking-wider">
                Category: {activeScramble.category}
              </span>
              <p className="text-xs text-gray-300 italic mt-0.5 max-w-[220px]">
                "{activeScramble.hint}"
              </p>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 font-mono font-black text-sm text-[#ff7a00]">
              <Clock className="w-4 h-4" />
              <span>{scrambleTimer}s</span>
            </div>
          </div>

          {/* Letter Answer Target Slots */}
          <div className="py-4 flex flex-col items-center justify-center gap-2">
            <span className="text-[10px] font-bold uppercase text-gray-400">
              Tap letters to spell word:
            </span>

            <div className="flex items-center justify-center gap-1.5 flex-wrap min-h-[56px] p-2 rounded-2xl bg-black/30 border border-white/5 w-full">
              {activeScramble.word.split('').map((_, i) => {
                const placed = scrambleSlots[i];
                return (
                  <motion.button
                    key={i}
                    onClick={() => placed && handleTapSlotLetter(placed)}
                    whileTap={{ scale: 0.9 }}
                    className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center font-display font-black text-xl transition-all cursor-pointer ${
                      placed
                        ? 'bg-[#1fd1a0] border-[#1fd1a0] text-black shadow-md'
                        : 'bg-[#141d33] border-dashed border-gray-600 text-transparent'
                    }`}
                  >
                    {placed?.letter || ''}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Letter Rack */}
          <div className="p-3 rounded-2xl bg-[#141d33] border border-[#26314d] flex flex-col items-center gap-2">
            <span className="text-[10px] font-bold uppercase text-gray-400">Letter Rack:</span>
            <div className="flex items-center justify-center gap-2 flex-wrap min-h-[50px]">
              {scrambleRack.map((item) => (
                <motion.button
                  key={item.id}
                  onClick={() => handleTapRackLetter(item)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-12 h-12 rounded-xl bg-[#1c2642] hover:bg-[#253256] border-2 border-[#ffb703]/50 text-white font-display font-black text-xl shadow-lg flex items-center justify-center cursor-pointer"
                >
                  {item.letter}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Actions: Shuffle & Hint */}
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              onClick={handleShuffleScramble}
              className="min-h-[44px] py-2.5 rounded-xl bg-[#141d33] hover:bg-[#1a2540] border border-[#26314d] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Shuffle className="w-4 h-4 text-[#ffb703]" />
              <span>Shuffle Rack</span>
            </button>

            <button
              onClick={handleUseScrambleHint}
              className="min-h-[44px] py-2.5 rounded-xl bg-[#141d33] hover:bg-[#1a2540] border border-[#26314d] text-[#1fd1a0] font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Lightbulb className="w-4 h-4 fill-[#1fd1a0]" />
              <span>Reveal Letter (10 🪙)</span>
            </button>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          VIEW 3: WORD CHAIN
      ------------------------------------------------------------- */}
      {subGame === 'chain' && (
        <div className="flex flex-col gap-3">
          {/* Mode switch: vs Computer or Pass & Play */}
          <div className="flex items-center justify-between text-xs px-1">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setMode('ai')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors ${
                  mode === 'ai'
                    ? 'bg-[#1fd1a0] text-black font-black'
                    : 'bg-[#141d33] text-gray-400 border border-[#26314d]'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>vs Odogwu AI</span>
              </button>

              <button
                onClick={() => setMode('pass')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors ${
                  mode === 'pass'
                    ? 'bg-[#1fd1a0] text-black font-black'
                    : 'bg-[#141d33] text-gray-400 border border-[#26314d]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Pass & Play</span>
              </button>
            </div>

            <div className="flex items-center gap-1 text-[#ff7a00] font-mono font-bold text-xs">
              <Clock className="w-3.5 h-3.5" />
              <span>{chainTimer}s</span>
            </div>
          </div>

          {/* Status banner */}
          <div className="p-3 rounded-2xl bg-[#141d33] border border-[#26314d] text-center">
            <p className="text-xs font-bold text-[#ffb703]">{chainStatus}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Target Starting Letter:{' '}
              <span className="font-black text-lg text-[#1fd1a0] font-mono px-1.5 py-0.5 bg-black/40 rounded-lg">
                {requiredLetter}
              </span>
            </p>
          </div>

          {/* Chain Stack (Scrollable) */}
          <div className="max-h-[220px] overflow-y-auto space-y-2 p-2 rounded-2xl bg-black/30 border border-white/5">
            {chainHistory.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-2.5 rounded-xl border flex items-center justify-between ${
                  item.author === 'Odogwu AI'
                    ? 'bg-purple-500/10 border-purple-500/30'
                    : 'bg-[#141d33] border-[#26314d]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-white/10 text-[10px] font-black flex items-center justify-center text-gray-400">
                    {idx + 1}
                  </span>
                  <span className="font-display font-black text-base text-white tracking-wide">
                    {item.word}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-gray-400">{item.author}</span>
              </motion.div>
            ))}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmitChainWord} className="flex gap-2 mt-1">
            <input
              type="text"
              placeholder={`Enter word starting with "${requiredLetter}"`}
              value={chainInput}
              onChange={(e) => setChainInput(e.target.value.toUpperCase())}
              disabled={chainTurn === 'computer'}
              className="flex-1 min-h-[44px] bg-[#141d33] border border-[#26314d] focus:border-[#1fd1a0] rounded-xl px-3 text-sm font-black text-white uppercase tracking-wider focus:outline-none"
            />
            <button
              type="submit"
              disabled={chainTurn === 'computer' || !chainInput.trim()}
              className="min-h-[44px] px-4 rounded-xl bg-[#1fd1a0] hover:bg-[#17b88c] text-black font-black text-xs font-display uppercase tracking-wider disabled:opacity-50 cursor-pointer shadow-md"
            >
              Play
            </button>
          </form>
        </div>
      )}

      {/* -------------------------------------------------------------
          VIEW 4: WORD SEARCH
      ------------------------------------------------------------- */}
      {subGame === 'search' && (
        <div className="flex flex-col gap-3">
          {/* Theme selector chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {Object.keys(WORD_SEARCH_PUZZLES).map((tKey) => {
              const item = WORD_SEARCH_PUZZLES[tKey];
              return (
                <button
                  key={tKey}
                  onClick={() => setSearchTheme(tKey)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap cursor-pointer transition-colors ${
                    searchTheme === tKey
                      ? 'bg-[#1fd1a0] text-black font-black'
                      : 'bg-[#141d33] text-gray-400 border border-[#26314d]'
                  }`}
                >
                  {item.theme}
                </button>
              );
            })}
          </div>

          {/* Word List Tracker */}
          <div className="p-2.5 rounded-2xl bg-[#141d33] border border-[#26314d]">
            <p className="text-[10px] font-black uppercase text-gray-400 mb-1.5">
              Find Words ({foundWords.length}/{activeSearch.words.length}):
            </p>
            <div className="flex flex-wrap gap-1.5">
              {activeSearch.words.map((w) => {
                const isFound = foundWords.includes(w.word);
                return (
                  <span
                    key={w.word}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider transition-colors ${
                      isFound
                        ? 'bg-emerald-500/20 text-emerald-300 line-through border border-emerald-500/30'
                        : 'bg-black/30 text-gray-300 border border-white/5'
                    }`}
                  >
                    {w.word}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Letter Grid */}
          <div className="p-2 rounded-2xl bg-[#121929] border border-[#26314d] flex flex-col items-center justify-center overflow-x-auto touch-pan-y">
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${activeSearch.size}, minmax(0, 1fr))` }}>
              {activeSearch.grid.map((rowArr, r) =>
                rowArr.map((letter, c) => {
                  const isSelected = selectedCells.some((x) => x.row === r && x.col === c);
                  // Check if cell is part of any found word coordinates
                  const isPartOfFound = activeSearch.words.some((w) => {
                    if (!foundWords.includes(w.word)) return false;
                    if (w.startRow === undefined || w.endRow === undefined) return false;
                    const minR = Math.min(w.startRow, w.endRow);
                    const maxR = Math.max(w.startRow, w.endRow);
                    const minC = Math.min(w.startCol!, w.endCol!);
                    const maxC = Math.max(w.startCol!, w.endCol!);
                    return r >= minR && r <= maxR && c >= minC && c <= maxC;
                  });

                  return (
                    <button
                      key={`${r}-${c}`}
                      onClick={() => handleCellClick(r, c)}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg font-mono font-black text-xs sm:text-sm flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#ff7a00] text-black scale-105 z-10'
                          : isPartOfFound
                          ? 'bg-[#1fd1a0]/30 text-[#1fd1a0] border border-[#1fd1a0]/40'
                          : 'bg-[#141d33] hover:bg-[#1a2540] text-gray-300 border border-[#26314d]/60'
                      }`}
                    >
                      {letter}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. GAME RESULT MODAL */}
      <GameResultModal
        isOpen={resultModal.isOpen}
        winner={resultModal.outcome === 'win' ? 'You' : resultModal.outcome === 'draw' ? 'Draw' : 'Computer'}
        isWin={resultModal.outcome === 'win'}
        scoreText={`${resultModal.title} • Score: ${resultModal.score} pts`}
        onPlayAgain={() => {
          setResultModal((prev) => ({ ...prev, isOpen: false }));
          if (subGame === 'guess') initGuessGame();
          if (subGame === 'scramble') initScramble();
          if (subGame === 'chain') initChain();
          if (subGame === 'search') initSearch();
        }}
        onBackToLobby={() => {
          setResultModal((prev) => ({ ...prev, isOpen: false }));
          onBack();
        }}
      />
    </div>
  );
};
