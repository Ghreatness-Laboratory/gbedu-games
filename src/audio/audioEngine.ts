// Web Audio API procedural synthesis engine for Gbedu Games
// Zero external asset dependencies - runs completely in-browser with zero latency.

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private isLoopRunning: boolean = false;
  private loopTimerId: number | null = null;
  private currentTrackBpm: number = 120;
  private currentTrackIndex: number = 0;
  private trackStartTime: number = 0;

  constructor() {
    // Lazily init AudioContext on first interaction
  }

  public init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public getAudioContext(): AudioContext | null {
    this.init();
    return this.ctx;
  }

  public getCurrentTime(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.85, this.ctx.currentTime);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // 1. Amapiano Log Drum 808 (Pitched sub bass with rapid dive and soft clipping)
  public playLogDrum(pitchOffset: number = 0, time?: number) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = time ?? this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const distortion = this.ctx.createWaveShaper();

    // Create subtle warm saturation curve
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = ((Math.PI + 4) * x) / (Math.PI + 4 * Math.abs(x));
    }
    distortion.curve = curve;

    osc.type = 'sine';
    const baseFreq = 125 * Math.pow(2, pitchOffset / 12);
    const dropFreq = 48 * Math.pow(2, pitchOffset / 12);

    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(dropFreq, t + 0.12);

    gain.gain.setValueAtTime(0.9, t);
    gain.gain.linearRampToValueAtTime(0.8, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(distortion);
    distortion.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.46);
  }

  // 2. Nigerian Talking Drum (Gangan tone slide)
  public playTalkingDrum(slideUp: boolean = true, time?: number) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = time ?? this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    if (slideUp) {
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(290, t + 0.18);
    } else {
      osc.frequency.setValueAtTime(280, t);
      osc.frequency.exponentialRampToValueAtTime(130, t + 0.2);
    }

    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.28);
  }

  // 3. Afrobeat Agogo Bells (Metallic high/low tone)
  public playAgogo(high: boolean = false, time?: number) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = time ?? this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const freq = high ? 780 : 540;
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, t);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(freq * 1.52, t);

    const osc2Gain = this.ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.2, t);
    osc2.connect(osc2Gain);

    gain.gain.setValueAtTime(0.65, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc1.connect(gain);
    osc2Gain.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.36);
    osc2.stop(t + 0.36);
  }

  // 4. Shekere / Shaker (Filtered white noise burst)
  public playShekere(time?: number) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = time ?? this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.12);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(5400, t);
    filter.Q.setValueAtTime(2.5, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + 0.12);
  }

  // 5. Punchy Afrobeats Kick
  public playKick(time?: number) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = time ?? this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.08);

    gain.gain.setValueAtTime(0.95, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.26);
  }

  // 6. Crisp Rimshot / Snare
  public playRimshot(time?: number) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = time ?? this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(360, t);

    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  // 7. Warm Brass/Piano Chord
  public playChord(frequencies: number[], duration: number = 0.4, time?: number) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = time ?? this.ctx.currentTime;
    frequencies.forEach((freq) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, t);
      filter.frequency.exponentialRampToValueAtTime(600, t + duration);

      gain.gain.setValueAtTime(0.25 / frequencies.length, t);
      gain.gain.linearRampToValueAtTime(0.2 / frequencies.length, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + duration);
    });
  }

  // 8. Melody Tone for Guessing
  public playSynthNote(freq: number, duration: number = 0.3, time?: number) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = time ?? this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  // 9. Sound FX & Crowds
  public playHitSound(accuracy: 'perfect' | 'great' | 'miss') {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    if (accuracy === 'perfect') {
      this.playSynthNote(880, 0.12, t);
      this.playSynthNote(1320, 0.15, t + 0.05);
    } else if (accuracy === 'great') {
      this.playSynthNote(660, 0.12, t);
    } else {
      // Miss / Buzz
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, t);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.linearRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.22);
    }
  }

  public playCorrectSound() {
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.playSynthNote(523.25, 0.15, t); // C5
    this.playSynthNote(659.25, 0.15, t + 0.1); // E5
    this.playSynthNote(783.99, 0.25, t + 0.2); // G5
    this.playSynthNote(1046.5, 0.4, t + 0.3); // C6
  }

  public playWrongSound() {
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.playSynthNote(280, 0.2, t);
    this.playSynthNote(220, 0.35, t + 0.15);
  }

  public playCheerSound() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    // Synthesize warm stadium applause noise
    const t = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 1.5);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 1.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + 1.5);
  }

  // 10. Vocal / Adlib Chops Synthesizer
  public playVocalAdlib(type: string) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    switch (type) {
      case 'ehn':
        // Pitch jump "Ehn-Ehn!"
        this.playSynthNote(440, 0.08, t);
        this.playSynthNote(660, 0.14, t + 0.09);
        break;
      case 'oshey':
        // High harmonic sweep "Oshey!"
        this.playChord([523.25, 659.25, 1046.5], 0.25, t);
        break;
      case 'mad':
        // Sub drop + staccato hit
        this.playLogDrum(4, t);
        this.playRimshot(t + 0.1);
        break;
      default:
        this.playAgogo(true, t);
    }
  }

  // Procedural Backing Track Scheduler for Rhythm Game & Party Mode
  public startBackingTrack(trackIndex: number, bpm: number, onTick?: (step: number) => void) {
    this.stopBackingTrack();
    this.init();
    if (!this.ctx) return;

    this.currentTrackIndex = trackIndex;
    this.currentTrackBpm = bpm;
    this.isLoopRunning = true;
    this.trackStartTime = this.ctx.currentTime;

    const secondsPerBeat = 60 / bpm;
    const secondsPerStep = secondsPerBeat / 4; // 16th notes
    let currentStep = 0;

    const scheduleAheadTime = 0.1;
    let nextStepTime = this.ctx.currentTime + 0.05;

    const scheduler = () => {
      if (!this.isLoopRunning || !this.ctx) return;

      while (nextStepTime < this.ctx.currentTime + scheduleAheadTime) {
        this.playTrackPatternStep(this.currentTrackIndex, currentStep, nextStepTime);
        if (onTick) {
          const stepCapture = currentStep;
          setTimeout(() => onTick(stepCapture), Math.max(0, (nextStepTime - this.ctx!.currentTime) * 1000));
        }
        nextStepTime += secondsPerStep;
        currentStep = (currentStep + 1) % 32; // 2-bar cycle
      }

      this.loopTimerId = window.setTimeout(scheduler, 25);
    };

    scheduler();
  }

  private playTrackPatternStep(trackIndex: number, step: number, time: number) {
    const isBarStart = step % 16 === 0;
    const isQuarter = step % 4 === 0;

    switch (trackIndex) {
      case 0: // Afro Rave 128 BPM
        if (isQuarter) this.playKick(time);
        if (step % 8 === 4) this.playRimshot(time);
        if (step % 2 === 0) this.playShekere(time);
        if (step === 3 || step === 10 || step === 14) this.playAgogo(step === 10, time);
        if (step === 6 || step === 12 || step === 22) this.playLogDrum(step === 12 ? 3 : 0, time);
        break;

      case 1: // Amapiano Sunset 115 BPM
        if (step % 8 === 0 || step === 6 || step === 14) this.playKick(time);
        if (step % 2 === 1) this.playShekere(time);
        // Signature Amapiano Log Drum bouncing bassline
        if (step === 2 || step === 5 || step === 8 || step === 11 || step === 14 || step === 20 || step === 27) {
          this.playLogDrum((step % 7) - 2, time);
        }
        if (isBarStart) {
          this.playChord([261.63, 329.63, 392.0, 493.88], 0.8, time); // Cmaj7
        } else if (step === 16) {
          this.playChord([220.0, 261.63, 329.63, 392.0], 0.8, time); // Am7
        }
        break;

      case 2: // Shrine Afrobeat 105 BPM (Fela style)
        if (isQuarter) this.playKick(time);
        // Classic Afrobeat Agogo bell syncopation: 1, 4, 7, 10, 12, 14
        if ([0, 3, 6, 9, 11, 13, 16, 19, 22, 25, 27, 29].includes(step)) {
          this.playAgogo(step % 6 === 0, time);
        }
        if (step % 4 === 2) this.playTalkingDrum(step % 8 === 2, time);
        if (step % 2 === 0) this.playShekere(time);
        break;

      case 3: // Street Bounce 120 BPM
      default:
        if (isQuarter) this.playKick(time);
        if (step % 4 === 2) this.playRimshot(time);
        if (step % 2 === 0) this.playShekere(time);
        if (step === 4 || step === 7 || step === 12 || step === 15) {
          this.playTalkingDrum(step > 10, time);
        }
        if (step === 3 || step === 11 || step === 19 || step === 27) {
          this.playLogDrum(2, time);
        }
        break;
    }
  }

  public stopBackingTrack() {
    this.isLoopRunning = false;
    if (this.loopTimerId !== null) {
      clearTimeout(this.loopTimerId);
      this.loopTimerId = null;
    }
  }
}

export const soundEngine = new SoundEngine();
