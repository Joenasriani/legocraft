import { BrickData } from "../Store";

type SoundType = 'place' | 'remove' | 'select' | 'error' | 'menu-open' | 'menu-close';

class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private initialized = false;

  public init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.08; // Significantly lower default volume
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      if ((import.meta as any).env.DEV) {
        console.warn("AudioContext initialization failed", e);
      }
    }
  }

  public resume() {
    if (!this.initialized) this.init();
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private getRandomized(baseValue: number, variance: number) {
    return baseValue * (1 + (Math.random() * 2 - 1) * variance);
  }

  private createEnvelope(gain: GainNode, attack: number, decay: number, sustain: number, release: number) {
    const now = this.ctx!.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + attack);
    gain.gain.exponentialRampToValueAtTime(sustain || 0.001, now + attack + decay);
    gain.gain.exponentialRampToValueAtTime(0.001, now + attack + decay + release);
  }

  public play(type: SoundType) {
    this.init();
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const pitchVar = 0.02; // 2%
    const volVar = 0.05;   // 5%
    
    switch (type) {
      case 'place':
        this.playPlace(pitchVar, volVar);
        break;
      case 'remove':
        this.playRemove(pitchVar, volVar);
        break;
      case 'select':
        this.playSelect(pitchVar, volVar);
        break;
      case 'error':
        this.playError();
        break;
      case 'menu-open':
        this.playMenu(true);
        break;
      case 'menu-close':
        this.playMenu(false);
        break;
    }
  }

  private playPlace(pVar: number, vVar: number) {
    const now = this.ctx!.currentTime;
    
    // Impact Thud (Low Freq)
    const bodyOsc = this.ctx!.createOscillator();
    const bodyGain = this.ctx!.createGain();
    bodyOsc.type = 'sine';
    bodyOsc.frequency.setValueAtTime(this.getRandomized(160, pVar), now);
    bodyOsc.frequency.exponentialRampToValueAtTime(this.getRandomized(110, pVar), now + 0.04);
    bodyGain.gain.setValueAtTime(0, now);
    bodyGain.gain.linearRampToValueAtTime(0.2, now + 0.002);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    bodyOsc.connect(bodyGain);
    bodyGain.connect(this.masterGain!);
    bodyOsc.start(now);
    bodyOsc.stop(now + 0.1);

    // Snap Click (Mid-High Freq)
    const clickOsc = this.ctx!.createOscillator();
    const clickGain = this.ctx!.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(this.getRandomized(800, pVar), now);
    clickOsc.frequency.exponentialRampToValueAtTime(this.getRandomized(600, pVar), now + 0.02);
    clickGain.gain.setValueAtTime(0, now);
    clickGain.gain.linearRampToValueAtTime(0.1, now + 0.001);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
    clickOsc.connect(clickGain);
    clickGain.connect(this.masterGain!);
    clickOsc.start(now);
    clickOsc.stop(now + 0.03);

    // Friction Noise
    const noise = this.ctx!.createBufferSource();
    const noiseGain = this.ctx!.createGain();
    const noiseFilter = this.ctx!.createBiquadFilter();
    const bufferSize = this.ctx!.sampleRate * 0.02;
    const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buffer;
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 2500;
    noiseFilter.Q.value = 1;
    noiseGain.gain.setValueAtTime(0.02, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain!);
    noise.start(now);
  }

  private playRemove(pVar: number, vVar: number) {
    const now = this.ctx!.currentTime;

    // Pulling separation (Pitch Slide Up)
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(this.getRandomized(220, pVar), now);
    osc.frequency.exponentialRampToValueAtTime(this.getRandomized(260, pVar), now + 0.05);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.1);

    // Separation click
    const noise = this.ctx!.createBufferSource();
    const noiseGain = this.ctx!.createGain();
    const noiseFilter = this.ctx!.createBiquadFilter();
    const bufferSize = this.ctx!.sampleRate * 0.01;
    const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buffer;
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 4000;
    noiseGain.gain.setValueAtTime(0.015, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.01);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain!);
    noise.start(now);
  }

  private playSelect(pVar: number, vVar: number) {
    const now = this.ctx!.currentTime;
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(this.getRandomized(1800, pVar), now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.02);
  }

  private playError() {
    const now = this.ctx!.currentTime;
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.linearRampToValueAtTime(70, now + 0.1);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.2);

    // Muted noise
    const noise = this.ctx!.createBufferSource();
    const noiseGain = this.ctx!.createGain();
    const noiseFilter = this.ctx!.createBiquadFilter();
    const noiseBuffer = this.ctx!.createBuffer(1, this.ctx!.sampleRate * 0.1, this.ctx!.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) noiseData[i] = Math.random() * 2 - 1;
    noise.buffer = noiseBuffer;
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 300;
    noiseGain.gain.setValueAtTime(0.02, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain!);
    noise.start(now);
  }

  private playMenu(isOpen: boolean) {
    const now = this.ctx!.currentTime;
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    osc.type = 'sine';
    const freq = isOpen ? 450 : 380;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq + (isOpen ? 50 : -50), now + 0.06);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.03, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.1);
  }
}

export const audioService = new AudioService();

