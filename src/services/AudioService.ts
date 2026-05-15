class AudioService {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  private playTone(
    freq: number,
    type: OscillatorType,
    duration: number,
    volume: number,
  ) {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.01,
      this.ctx.currentTime + duration,
    );

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  resume() {
    this.init();
  }

  playPlace() {
    this.playTone(880, "sine", 0.1, 0.2);
  }

  playDelete() {
    this.playTone(220, "sawtooth", 0.15, 0.1);
  }

  playInvalid() {
    this.playTone(110, "square", 0.2, 0.1);
  }

  playSelect() {
    this.playTone(440, "sine", 0.05, 0.1);
  }

  playRotate() {
    this.playTone(660, "sine", 0.05, 0.1);
  }

  playMenu() {
    this.playTone(550, "sine", 0.1, 0.1);
  }
}

export const audioService = new AudioService();
