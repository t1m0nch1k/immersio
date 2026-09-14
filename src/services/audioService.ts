import { LanguageCode } from '../types';
import { LANGUAGES } from '../data/languages';

class AudioService {
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private voices: SpeechSynthesisVoice[] = [];
  private currentAudio: HTMLAudioElement | null = null;

  constructor() {
    this.initVoices();
  }

  private initVoices() {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        this.voices = window.speechSynthesis.getVoices();
      };
      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    if (!enabled) {
      this.currentAudio?.pause();
      this.currentAudio = null;
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    }
  }

  private getAudioContext(): AudioContext | null {
    if (!this.soundEnabled) return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  private getBrowserVoice(langCode: LanguageCode): SpeechSynthesisVoice | undefined {
    if (!('speechSynthesis' in window)) return undefined;
    if (this.voices.length === 0) this.voices = window.speechSynthesis.getVoices();

    const locale = LANGUAGES[langCode].speechLang.toLowerCase();
    const language = locale.split('-')[0];
    const candidates = this.voices.filter((voice) => {
      const voiceLocale = voice.lang.toLowerCase().replace('_', '-');
      return voiceLocale === locale || voiceLocale === language || voiceLocale.startsWith(`${language}-`);
    });

    // Keep the browser voice only as a fallback after the Edge-TTS server proxy.
    const preferred = candidates.find((voice) => /online|natural|neural|google/i.test(voice.name));

    return preferred || candidates.find((voice) => !voice.localService) || candidates[0];
  }

  private speakInBrowser(text: string, langCode: LanguageCode): boolean {
    if (!('speechSynthesis' in window)) return false;

    try {
      const voice = this.getBrowserVoice(langCode);
      const utterance = new SpeechSynthesisUtterance(text);
      if (voice) utterance.voice = voice;
      utterance.lang = voice?.lang || LANGUAGES[langCode].speechLang;
      utterance.rate = langCode === 'sk' ? 0.82 : 0.85;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (error) {
      console.warn('Browser TTS error:', error);
      return false;
    }
  }

  private speakFromServer(text: string, langCode: LanguageCode): boolean {
    const targetLang = langCode;
    try {
      const ttsUrl = `/api/tts?text=${encodeURIComponent(text)}&lang=${targetLang}`;
      const audio = new Audio(ttsUrl);
      this.currentAudio = audio;

      const fallbackToBrowser = () => {
        if (this.currentAudio !== audio) return;
        this.currentAudio = null;
        this.speakInBrowser(text, langCode);
      };

      audio.addEventListener('error', fallbackToBrowser, { once: true });
      audio.play().catch(fallbackToBrowser);
      return true;
    } catch (error) {
      console.warn('Audio playback error:', error);
      return false;
    }
  }

  /**
   * Speak a word in the requested language. All languages prefer the
   * Edge-TTS server proxy for consistent Microsoft Neural pronunciation.
   */
  public speak(text: string, langCode: LanguageCode) {
    if (!this.soundEnabled || !text.trim()) return;

    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    if (this.speakFromServer(text, langCode)) return;
    this.speakInBrowser(text, langCode);
  }

  // --- Web Audio Synth Effects ---
  public playPop() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {}
  }

  public playSuccess() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(0.12, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.25);
      });
    } catch (e) {}
  }

  public playError() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(130, now + 0.2);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {}
  }

  public playFanfare() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.value = freq;

        const startTime = now + idx * 0.09;
        const duration = idx === notes.length - 1 ? 0.6 : 0.2;

        gain.gain.setValueAtTime(0.15, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
      });
    } catch (e) {}
  }

  public playClick() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    } catch (e) {}
  }
}

export const audioService = new AudioService();
