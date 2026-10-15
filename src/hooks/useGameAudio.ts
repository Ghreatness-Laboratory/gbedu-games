import { useState, useEffect, useCallback } from 'react';
import { soundEngine } from '../audio/audioEngine';

export const useGameAudio = () => {
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return localStorage.getItem('gbedu_muted') === 'true';
  });
  const [isPlayingMusic, setIsPlayingMusic] = useState<boolean>(false);
  const [currentTrack, setCurrentTrack] = useState<number>(1); // Default: Amapiano Sunset

  useEffect(() => {
    soundEngine.setMuted(isMuted);
    localStorage.setItem('gbedu_muted', String(isMuted));
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    soundEngine.init();
    setIsMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      localStorage.setItem('gbedu_muted', String(next));
      return next;
    });
  }, []);

  const startMusic = useCallback((trackIdx: number = 1, bpm: number = 115) => {
    soundEngine.init();
    setCurrentTrack(trackIdx);
    soundEngine.startBackingTrack(trackIdx, bpm);
    setIsPlayingMusic(true);
  }, []);

  const stopMusic = useCallback(() => {
    soundEngine.stopBackingTrack();
    setIsPlayingMusic(false);
  }, []);

  const playClick = useCallback(() => soundEngine.playClick(), []);
  const playMove = useCallback((p?: number) => soundEngine.playMove(p), []);
  const playDice = useCallback(() => soundEngine.playDiceRoll(), []);
  const playWin = useCallback(() => soundEngine.playWin(), []);
  const playLose = useCallback(() => soundEngine.playLose(), []);
  const playSeed = useCallback((v?: number) => soundEngine.playSeedDrop(v), []);
  const playBall = useCallback(() => soundEngine.playBallKick(), []);
  const playTile = useCallback(() => soundEngine.playTilePlace(), []);

  return {
    isMuted,
    isPlayingMusic,
    currentTrack,
    toggleMute,
    startMusic,
    stopMusic,
    playClick,
    playMove,
    playDice,
    playWin,
    playLose,
    playSeed,
    playBall,
    playTile,
  };
};
