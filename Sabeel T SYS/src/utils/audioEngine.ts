/**
 * Procedural Web Audio Engine for Klaro Workspace
 * Generates focus soundscapes and chimes without external audio assets.
 */

class FocusAudioEngine {
  private ctx: AudioContext | null = null;
  private rainGain: GainNode | null = null;
  private binauralGain: GainNode | null = null;
  private oceanGain: GainNode | null = null;
  private noiseGain: GainNode | null = null;
  private masterGain: GainNode | null = null;

  // Active sound state
  private isInitialized = false;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Create Pink Noise Buffer
  private createPinkNoiseBuffer(): AudioBuffer {
    if (!this.ctx) throw new Error('No audio context');
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  // Start Rain Sound
  public setRain(volume: number) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    if (volume <= 0) {
      if (this.rainGain) {
        this.rainGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      }
      return;
    }

    if (!this.rainGain) {
      const pinkBuffer = this.createPinkNoiseBuffer();
      const noise = this.ctx.createBufferSource();
      noise.buffer = pinkBuffer;
      noise.loop = true;

      // Filter for rain sound (bandpass/lowpass)
      const lowpass = this.ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(1400, this.ctx.currentTime);

      const highpass = this.ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.setValueAtTime(300, this.ctx.currentTime);

      this.rainGain = this.ctx.createGain();
      this.rainGain.gain.setValueAtTime(0, this.ctx.currentTime);

      noise.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(this.rainGain);
      this.rainGain.connect(this.masterGain);

      noise.start();
    }

    this.rainGain.gain.setTargetAtTime(volume * 0.8, this.ctx.currentTime, 0.1);
  }

  // Start Binaural Beats (Alpha 10Hz Focus: Left 200Hz, Right 210Hz)
  public setBinaural(volume: number) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    if (volume <= 0) {
      if (this.binauralGain) {
        this.binauralGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      }
      return;
    }

    if (!this.binauralGain) {
      this.binauralGain = this.ctx.createGain();
      this.binauralGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.binauralGain.connect(this.masterGain);

      // Left Channel: 200Hz
      const oscL = this.ctx.createOscillator();
      oscL.type = 'sine';
      oscL.frequency.setValueAtTime(200, this.ctx.currentTime);
      const panL = this.ctx.createStereoPanner();
      panL.pan.setValueAtTime(-1, this.ctx.currentTime);
      oscL.connect(panL);
      panL.connect(this.binauralGain);
      oscL.start();

      // Right Channel: 210Hz
      const oscR = this.ctx.createOscillator();
      oscR.type = 'sine';
      oscR.frequency.setValueAtTime(210, this.ctx.currentTime);
      const panR = this.ctx.createStereoPanner();
      panR.pan.setValueAtTime(1, this.ctx.currentTime);
      oscR.connect(panR);
      panR.connect(this.binauralGain);
      oscR.start();
    }

    this.binauralGain.gain.setTargetAtTime(volume * 0.35, this.ctx.currentTime, 0.1);
  }

  // Start Ocean Waves (Modulated Noise)
  public setOcean(volume: number) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    if (volume <= 0) {
      if (this.oceanGain) {
        this.oceanGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      }
      return;
    }

    if (!this.oceanGain) {
      const buffer = this.createPinkNoiseBuffer();
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, this.ctx.currentTime);

      // Low frequency oscillator for wave swells (0.12 Hz = ~8 second wave cycle)
      const lfo = this.ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime);
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(300, this.ctx.currentTime);

      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();

      this.oceanGain = this.ctx.createGain();
      this.oceanGain.gain.setValueAtTime(0, this.ctx.currentTime);

      noise.connect(filter);
      filter.connect(this.oceanGain);
      this.oceanGain.connect(this.masterGain);

      noise.start();
    }

    this.oceanGain.gain.setTargetAtTime(volume * 0.7, this.ctx.currentTime, 0.1);
  }

  // Soft Pink Noise
  public setNoise(volume: number) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    if (volume <= 0) {
      if (this.noiseGain) {
        this.noiseGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      }
      return;
    }

    if (!this.noiseGain) {
      const buffer = this.createPinkNoiseBuffer();
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, this.ctx.currentTime);

      this.noiseGain = this.ctx.createGain();
      this.noiseGain.gain.setValueAtTime(0, this.ctx.currentTime);

      noise.connect(filter);
      filter.connect(this.noiseGain);
      this.noiseGain.connect(this.masterGain);

      noise.start();
    }

    this.noiseGain.gain.setTargetAtTime(volume * 0.5, this.ctx.currentTime, 0.1);
  }

  // Play peaceful completion bell/chime
  public playChime() {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const freqs = [528, 792, 1056]; // Harmonics (C5, G5, C6)

    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      const peakVolume = (0.2 / (idx + 1));
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(peakVolume, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.4 + idx * 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(t);
      osc.stop(t + 3.0);
    });
  }

  public stopAll() {
    if (this.rainGain && this.ctx) this.rainGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    if (this.binauralGain && this.ctx) this.binauralGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    if (this.oceanGain && this.ctx) this.oceanGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    if (this.noiseGain && this.ctx) this.noiseGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
  }
}

export const soundEngine = new FocusAudioEngine();
