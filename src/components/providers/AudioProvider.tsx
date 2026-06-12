/**
 * AudioProvider — manages all game audio.
 *
 * Three channels:
 * - Music: looping background tracks (menu, game, combat)
 * - SFX: short sound effects (clicks, attacks, notifications)
 * - Ambient: looping environment sounds (forest, water, wind)
 *
 * Volume controls per channel (synced with settings store).
 * Uses Web Audio API for low-latency playback.
 * All sounds are synthesized — no external audio files needed for MVP.
 *
 * Each sound is generated programmatically using OscillatorNode,
 * GainNode, and BiquadFilterNode with proper gain ramping to
 * avoid audio clicks.
 */

'use client';

import {
  createContext,
  useContext,
  useRef,
  useCallback,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from 'react';
import { useGameStore } from '@/store/useGameStore';

// ─── Context Interface ─────────────────────────────────────────────────────────

interface AudioContextType {
  // Volume controls (0-1)
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  ambientVolume: number;

  setMasterVolume: (v: number) => void;
  setMusicVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  setAmbientVolume: (v: number) => void;

  // Playback
  playMusic: (track: string) => void;
  stopMusic: () => void;
  playSfx: (sound: string) => void;
  playAmbient: (sound: string) => void;
  stopAmbient: () => void;

  // Mute
  isMuted: boolean;
  toggleMute: () => void;
}

// ─── Context ───────────────────────────────────────────────────────────────────

export const GameAudioContext = createContext<AudioContextType | null>(null);

// ─── Hook ──────────────────────────────────────────────────────────────────────

/** Access the audio context from any component inside AudioProvider. */
export function useAudio(): AudioContextType {
  const ctx = useContext(GameAudioContext);
  if (!ctx) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return ctx;
}

// ─── Sound Synthesis Helpers ───────────────────────────────────────────────────

/**
 * Create a short oscillator-based tone with smooth gain ramping.
 * Returns the oscillator node so callers can further configure it.
 */
function playTone(
  audioCtx: AudioContext,
  gainNode: GainNode,
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  startDelay: number = 0,
  volume: number = 0.3,
): OscillatorNode {
  const osc = audioCtx.createOscillator();
  osc.type = type;
  osc.frequency.value = frequency;

  const env = audioCtx.createGain();
  env.gain.setValueAtTime(0, audioCtx.currentTime + startDelay);
  env.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + startDelay + 0.01);
  env.gain.linearRampToValueAtTime(0, audioCtx.currentTime + startDelay + duration);

  osc.connect(env);
  env.connect(gainNode);

  osc.start(audioCtx.currentTime + startDelay);
  osc.stop(audioCtx.currentTime + startDelay + duration + 0.05);

  return osc;
}

/**
 * Create a noise burst using a buffer source.
 * Used for attack/damage sounds.
 */
function playNoise(
  audioCtx: AudioContext,
  gainNode: GainNode,
  duration: number,
  startDelay: number = 0,
  volume: number = 0.2,
  filterFreq: number = 2000,
): void {
  const sampleRate = audioCtx.sampleRate;
  const bufferSize = Math.ceil(sampleRate * duration);
  const buffer = audioCtx.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.5;
  }

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;

  const env = audioCtx.createGain();
  env.gain.setValueAtTime(0, audioCtx.currentTime + startDelay);
  env.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + startDelay + 0.005);
  env.gain.linearRampToValueAtTime(0, audioCtx.currentTime + startDelay + duration);

  source.connect(filter);
  filter.connect(env);
  env.connect(gainNode);

  source.start(audioCtx.currentTime + startDelay);
  source.stop(audioCtx.currentTime + startDelay + duration + 0.05);
}

// ─── SFX Definitions ───────────────────────────────────────────────────────────

/**
 * Play a synthesized SFX sound.
 *
 * Supported sounds:
 * - click: short high-pitched tone
 * - attack: noise burst
 * - damage: low thump
 * - city_founded: ascending tone sequence
 * - tech_completed: sparkle sequence
 * - turn_start: gentle chime
 * - notification: beep
 * - error: low buzz
 */
function playSfxSound(
  audioCtx: AudioContext,
  gainNode: GainNode,
  sound: string,
): void {
  switch (sound) {
    case 'click':
      playTone(audioCtx, gainNode, 800, 0.08, 'sine', 0, 0.15);
      break;

    case 'attack':
      playNoise(audioCtx, gainNode, 0.15, 0, 0.25, 3000);
      playTone(audioCtx, gainNode, 200, 0.1, 'sawtooth', 0, 0.15);
      break;

    case 'damage':
      playTone(audioCtx, gainNode, 80, 0.2, 'sine', 0, 0.3);
      playNoise(audioCtx, gainNode, 0.1, 0.02, 0.15, 800);
      break;

    case 'city_founded':
      playTone(audioCtx, gainNode, 440, 0.2, 'sine', 0, 0.2);
      playTone(audioCtx, gainNode, 554, 0.2, 'sine', 0.15, 0.2);
      playTone(audioCtx, gainNode, 659, 0.3, 'sine', 0.3, 0.2);
      break;

    case 'tech_completed':
      playTone(audioCtx, gainNode, 880, 0.1, 'sine', 0, 0.15);
      playTone(audioCtx, gainNode, 1108, 0.1, 'sine', 0.08, 0.12);
      playTone(audioCtx, gainNode, 1318, 0.1, 'sine', 0.16, 0.10);
      playTone(audioCtx, gainNode, 1760, 0.2, 'sine', 0.24, 0.08);
      break;

    case 'turn_start':
      playTone(audioCtx, gainNode, 523, 0.3, 'sine', 0, 0.15);
      playTone(audioCtx, gainNode, 659, 0.4, 'sine', 0.15, 0.12);
      break;

    case 'notification':
      playTone(audioCtx, gainNode, 600, 0.1, 'square', 0, 0.1);
      playTone(audioCtx, gainNode, 800, 0.15, 'square', 0.12, 0.08);
      break;

    case 'error':
      playTone(audioCtx, gainNode, 150, 0.3, 'sawtooth', 0, 0.15);
      playTone(audioCtx, gainNode, 120, 0.3, 'sawtooth', 0.15, 0.12);
      break;

    default:
      // Generic click for unknown sounds
      playTone(audioCtx, gainNode, 600, 0.06, 'sine', 0, 0.1);
      break;
  }
}

// ─── Music Synthesis ───────────────────────────────────────────────────────────

interface MusicState {
  oscillators: OscillatorNode[];
  gains: GainNode[];
  isPlaying: boolean;
  currentTrack: string | null;
}

/**
 * Create a looping ambient music track using oscillators.
 *
 * Tracks:
 * - menu: Low-frequency drone with slow modulation
 * - game: Slightly more active, two-voice harmony
 * - combat: Tension with dissonant intervals
 */
function startMusicTrack(
  audioCtx: AudioContext,
  masterGain: GainNode,
  track: string,
): MusicState {
  const oscillators: OscillatorNode[] = [];
  const gains: GainNode[] = [];

  switch (track) {
    case 'menu': {
      // Low ambient drone with slow LFO modulation
      const drone = audioCtx.createOscillator();
      drone.type = 'sine';
      drone.frequency.value = 55; // A1

      const droneGain = audioCtx.createGain();
      droneGain.gain.value = 0.08;

      // Slow LFO for subtle movement
      const lfo = audioCtx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.3;

      const lfoGain = audioCtx.createGain();
      lfoGain.gain.value = 5; // Modulation depth in Hz

      lfo.connect(lfoGain);
      lfoGain.connect(drone.frequency);

      drone.connect(droneGain);
      droneGain.connect(masterGain);

      // Add a soft pad layer
      const pad = audioCtx.createOscillator();
      pad.type = 'triangle';
      pad.frequency.value = 82.5; // E2

      const padGain = audioCtx.createGain();
      padGain.gain.value = 0.04;

      pad.connect(padGain);
      padGain.connect(masterGain);

      drone.start();
      lfo.start();
      pad.start();

      oscillators.push(drone, lfo, pad);
      gains.push(droneGain, lfoGain, padGain);
      break;
    }

    case 'game': {
      // Two-voice ambient harmony with subtle movement
      const voice1 = audioCtx.createOscillator();
      voice1.type = 'sine';
      voice1.frequency.value = 130.81; // C3

      const voice1Gain = audioCtx.createGain();
      voice1Gain.gain.value = 0.05;

      const voice2 = audioCtx.createOscillator();
      voice2.type = 'triangle';
      voice2.frequency.value = 196.0; // G3

      const voice2Gain = audioCtx.createGain();
      voice2Gain.gain.value = 0.03;

      // Slow modulation on voice2
      const lfo = audioCtx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.2;
      const lfoGain = audioCtx.createGain();
      lfoGain.gain.value = 3;
      lfo.connect(lfoGain);
      lfoGain.connect(voice2.frequency);

      // Filter for warmth
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;

      voice1.connect(voice1Gain);
      voice1Gain.connect(filter);
      voice2.connect(voice2Gain);
      voice2Gain.connect(filter);
      filter.connect(masterGain);

      voice1.start();
      voice2.start();
      lfo.start();

      oscillators.push(voice1, voice2, lfo);
      gains.push(voice1Gain, voice2Gain, lfoGain);
      break;
    }

    case 'combat': {
      // Tension: dissonant interval with filtered noise
      const root = audioCtx.createOscillator();
      root.type = 'sawtooth';
      root.frequency.value = 73.42; // D2

      const rootGain = audioCtx.createGain();
      rootGain.gain.value = 0.04;

      const dissonance = audioCtx.createOscillator();
      dissonance.type = 'sawtooth';
      dissonance.frequency.value = 77.78; // Eb2 (minor second)

      const dissonanceGain = audioCtx.createGain();
      dissonanceGain.gain.value = 0.03;

      // Low-pass filter for dark tone
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 300;
      filter.Q.value = 5;

      // Pulsing LFO on filter
      const lfo = audioCtx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.5;
      const lfoGain = audioCtx.createGain();
      lfoGain.gain.value = 100;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      root.connect(rootGain);
      rootGain.connect(filter);
      dissonance.connect(dissonanceGain);
      dissonanceGain.connect(filter);
      filter.connect(masterGain);

      root.start();
      dissonance.start();
      lfo.start();

      oscillators.push(root, dissonance, lfo);
      gains.push(rootGain, dissonanceGain, lfoGain);
      break;
    }

    default: {
      // Default to menu-style drone
      const drone = audioCtx.createOscillator();
      drone.type = 'sine';
      drone.frequency.value = 55;

      const droneGain = audioCtx.createGain();
      droneGain.gain.value = 0.06;

      drone.connect(droneGain);
      droneGain.connect(masterGain);
      drone.start();

      oscillators.push(drone);
      gains.push(droneGain);
      break;
    }
  }

  return { oscillators, gains, isPlaying: true, currentTrack: track };
}

// ─── Ambient Synthesis ─────────────────────────────────────────────────────────

interface AmbientState {
  sources: (AudioBufferSourceNode | OscillatorNode)[];
  gains: GainNode[];
  isPlaying: boolean;
  currentSound: string | null;
}

/**
 * Create a looping ambient sound.
 *
 * Sounds:
 * - wind: low-pass filtered noise with slow modulation
 * - water: higher-frequency filtered noise with variation
 * - forest: gentle rustling noise
 */
function startAmbientSound(
  audioCtx: AudioContext,
  masterGain: GainNode,
  sound: string,
): AmbientState {
  const sources: (AudioBufferSourceNode | OscillatorNode)[] = [];
  const gains: GainNode[] = [];

  switch (sound) {
    case 'wind': {
      // Long noise buffer looped with low-pass filter
      const sampleRate = audioCtx.sampleRate;
      const duration = 4; // 4 seconds, will loop
      const bufferSize = Math.ceil(sampleRate * duration);
      const buffer = audioCtx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);

      // Generate smooth noise for wind
      let lastVal = 0;
      for (let i = 0; i < bufferSize; i++) {
        lastVal = lastVal * 0.98 + (Math.random() * 2 - 1) * 0.02;
        data[i] = lastVal;
      }

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 600;
      filter.Q.value = 0.7;

      // Slow LFO on filter for wind gusts
      const lfo = audioCtx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.15;

      const lfoGain = audioCtx.createGain();
      lfoGain.gain.value = 200;

      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      const env = audioCtx.createGain();
      env.gain.value = 0.12;

      source.connect(filter);
      filter.connect(env);
      env.connect(masterGain);

      source.start();
      lfo.start();

      sources.push(source, lfo);
      gains.push(env, lfoGain);
      break;
    }

    case 'water': {
      // Higher-frequency noise with band-pass filter
      const sampleRate = audioCtx.sampleRate;
      const duration = 3;
      const bufferSize = Math.ceil(sampleRate * duration);
      const buffer = audioCtx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1200;
      filter.Q.value = 0.5;

      // Modulate for water variation
      const lfo = audioCtx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.4;

      const lfoGain = audioCtx.createGain();
      lfoGain.gain.value = 400;

      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      const env = audioCtx.createGain();
      env.gain.value = 0.08;

      source.connect(filter);
      filter.connect(env);
      env.connect(masterGain);

      source.start();
      lfo.start();

      sources.push(source, lfo);
      gains.push(env, lfoGain);
      break;
    }

    case 'forest': {
      // Gentle rustling with higher cutoff
      const sampleRate = audioCtx.sampleRate;
      const duration = 5;
      const bufferSize = Math.ceil(sampleRate * duration);
      const buffer = audioCtx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);

      let lastVal = 0;
      for (let i = 0; i < bufferSize; i++) {
        lastVal = lastVal * 0.95 + (Math.random() * 2 - 1) * 0.05;
        data[i] = lastVal;
      }

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2000;
      filter.Q.value = 0.5;

      const env = audioCtx.createGain();
      env.gain.value = 0.05;

      source.connect(filter);
      filter.connect(env);
      env.connect(masterGain);

      source.start();

      sources.push(source);
      gains.push(env);
      break;
    }

    default: {
      // Default: very subtle wind
      const sampleRate = audioCtx.sampleRate;
      const duration = 4;
      const bufferSize = Math.ceil(sampleRate * duration);
      const buffer = audioCtx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);

      let lastVal = 0;
      for (let i = 0; i < bufferSize; i++) {
        lastVal = lastVal * 0.99 + (Math.random() * 2 - 1) * 0.01;
        data[i] = lastVal;
      }

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 500;

      const env = audioCtx.createGain();
      env.gain.value = 0.06;

      source.connect(filter);
      filter.connect(env);
      env.connect(masterGain);

      source.start();

      sources.push(source);
      gains.push(env);
      break;
    }
  }

  return { sources, gains, isPlaying: true, currentSound: sound };
}

// ─── Provider Component ────────────────────────────────────────────────────────

export function AudioProvider({ children }: { children: ReactNode }) {
  // ── Store sync ──────────────────────────────────────────────────────────
  const storeMasterVolume = useGameStore((s) => s.masterVolume);
  const storeMusicVolume = useGameStore((s) => s.musicVolume);
  const storeSfxVolume = useGameStore((s) => s.sfxVolume);
  const storeAmbienceVolume = useGameStore((s) => s.ambienceVolume);
  const setVolume = useGameStore((s) => s.setVolume);

  // ── Local state ─────────────────────────────────────────────────────────
  const [isMuted, setIsMuted] = useState(false);

  // ── Audio refs ──────────────────────────────────────────────────────────
  const audioCtxRef = useRef<AudioContext | null>(null);
  const musicGainRef = useRef<GainNode | null>(null);
  const sfxGainRef = useRef<GainNode | null>(null);
  const ambientGainRef = useRef<GainNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const musicStateRef = useRef<MusicState | null>(null);
  const ambientStateRef = useRef<AmbientState | null>(null);

  // ── Initialize AudioContext on first interaction ────────────────────────
  const ensureAudioContext = useCallback(() => {
    if (audioCtxRef.current) return;

    const ctx = new AudioContext();
    audioCtxRef.current = ctx;

    // Master gain → destination
    const masterGain = ctx.createGain();
    masterGain.gain.value = storeMasterVolume;
    masterGain.connect(ctx.destination);
    masterGainRef.current = masterGain;

    // Channel gains
    const musicGain = ctx.createGain();
    musicGain.gain.value = storeMusicVolume;
    musicGain.connect(masterGain);
    musicGainRef.current = musicGain;

    const sfxGain = ctx.createGain();
    sfxGain.gain.value = storeSfxVolume;
    sfxGain.connect(masterGain);
    sfxGainRef.current = sfxGain;

    const ambientGain = ctx.createGain();
    ambientGain.gain.value = storeAmbienceVolume;
    ambientGain.connect(masterGain);
    ambientGainRef.current = ambientGain;
  }, [storeMasterVolume, storeMusicVolume, storeSfxVolume, storeAmbienceVolume]);

  // ── Sync volumes from store to audio nodes ──────────────────────────────
  useEffect(() => {
    if (!masterGainRef.current) return;
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    masterGainRef.current.gain.linearRampToValueAtTime(
      isMuted ? 0 : storeMasterVolume,
      ctx.currentTime + 0.05,
    );
  }, [storeMasterVolume, isMuted]);

  useEffect(() => {
    if (!musicGainRef.current || !audioCtxRef.current) return;
    musicGainRef.current.gain.linearRampToValueAtTime(
      storeMusicVolume,
      audioCtxRef.current.currentTime + 0.05,
    );
  }, [storeMusicVolume]);

  useEffect(() => {
    if (!sfxGainRef.current || !audioCtxRef.current) return;
    sfxGainRef.current.gain.linearRampToValueAtTime(
      storeSfxVolume,
      audioCtxRef.current.currentTime + 0.05,
    );
  }, [storeSfxVolume]);

  useEffect(() => {
    if (!ambientGainRef.current || !audioCtxRef.current) return;
    ambientGainRef.current.gain.linearRampToValueAtTime(
      storeAmbienceVolume,
      audioCtxRef.current.currentTime + 0.05,
    );
  }, [storeAmbienceVolume]);

  // ── Volume setters (delegate to store) ──────────────────────────────────
  const setMasterVolume = useCallback((v: number) => setVolume('master', v), [setVolume]);
  const setMusicVolume = useCallback((v: number) => setVolume('music', v), [setVolume]);
  const setSfxVolume = useCallback((v: number) => setVolume('sfx', v), [setVolume]);
  const setAmbientVolume = useCallback((v: number) => setVolume('ambience', v), [setVolume]);

  // ── Mute toggle ─────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  // ── Music playback ──────────────────────────────────────────────────────
  const stopMusic = useCallback(() => {
    const state = musicStateRef.current;
    if (!state || !state.isPlaying) return;

    for (const osc of state.oscillators) {
      try { osc.stop(); } catch { /* already stopped */ }
    }
    state.oscillators = [];
    state.gains = [];
    state.isPlaying = false;
    state.currentTrack = null;
  }, []);

  const playMusic = useCallback((track: string) => {
    ensureAudioContext();
    const ctx = audioCtxRef.current;
    const gain = musicGainRef.current;
    if (!ctx || !gain) return;

    // Stop current music if playing
    stopMusic();

    // Resume audio context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    musicStateRef.current = startMusicTrack(ctx, gain, track);
  }, [ensureAudioContext, stopMusic]);

  // ── SFX playback ────────────────────────────────────────────────────────
  const playSfx = useCallback((sound: string) => {
    ensureAudioContext();
    const ctx = audioCtxRef.current;
    const gain = sfxGainRef.current;
    if (!ctx || !gain) return;

    // Resume audio context if suspended
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    playSfxSound(ctx, gain, sound);
  }, [ensureAudioContext]);

  // ── Ambient playback ────────────────────────────────────────────────────
  const stopAmbient = useCallback(() => {
    const state = ambientStateRef.current;
    if (!state || !state.isPlaying) return;

    for (const src of state.sources) {
      try {
        if (src instanceof AudioBufferSourceNode) {
          src.stop();
        } else {
          src.stop();
        }
      } catch { /* already stopped */ }
    }
    state.sources = [];
    state.gains = [];
    state.isPlaying = false;
    state.currentSound = null;
  }, []);

  const playAmbient = useCallback((sound: string) => {
    ensureAudioContext();
    const ctx = audioCtxRef.current;
    const gain = ambientGainRef.current;
    if (!ctx || !gain) return;

    // Stop current ambient if playing
    stopAmbient();

    // Resume audio context if suspended
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    ambientStateRef.current = startAmbientSound(ctx, gain, sound);
  }, [ensureAudioContext, stopAmbient]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopMusic();
      stopAmbient();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, [stopMusic, stopAmbient]);

  // ── Context value (memoized to avoid unnecessary re-renders) ────────────
  const contextValue = useMemo<AudioContextType>(() => ({
    masterVolume: storeMasterVolume,
    musicVolume: storeMusicVolume,
    sfxVolume: storeSfxVolume,
    ambientVolume: storeAmbienceVolume,
    setMasterVolume,
    setMusicVolume,
    setSfxVolume,
    setAmbientVolume,
    playMusic,
    stopMusic,
    playSfx,
    playAmbient,
    stopAmbient,
    isMuted,
    toggleMute,
  }), [
    storeMasterVolume,
    storeMusicVolume,
    storeSfxVolume,
    storeAmbienceVolume,
    setMasterVolume,
    setMusicVolume,
    setSfxVolume,
    setAmbientVolume,
    playMusic,
    stopMusic,
    playSfx,
    playAmbient,
    stopAmbient,
    isMuted,
    toggleMute,
  ]);

  return (
    <GameAudioContext.Provider value={contextValue}>
      {children}
    </GameAudioContext.Provider>
  );
}
