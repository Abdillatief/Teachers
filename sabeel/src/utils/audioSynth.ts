import { AmbientSoundType } from '../types';

class SoundscapeEngine {
  private ctx: AudioContext | null = null;
  private currentSound: AmbientSoundType = 'none';
  private masterGain: GainNode | null = null;
  private activeNodes: (AudioNode | number)[] = [];
  public analyser: AnalyserNode | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(volume: number) {
    if (this.masterGain && this.ctx) {
      const clamped = Math.max(0, Math.min(1, volume));
      this.masterGain.gain.setValueAtTime(clamped, this.ctx.currentTime);
    }
  }

  public stop() {
    this.activeNodes.forEach(item => {
      if (typeof item === 'number') {
        window.clearInterval(item);
      } else {
        try {
          if ('stop' in item && typeof (item as AudioScheduledSourceNode).stop === 'function') {
            (item as AudioScheduledSourceNode).stop();
          }
          item.disconnect();
        } catch {
          // Ignore disconnection error
        }
      }
    });
    this.activeNodes = [];
    this.currentSound = 'none';
  }

  public play(type: AmbientSoundType, volume = 0.5) {
    this.stop();
    if (type === 'none') return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    this.setVolume(volume);
    this.currentSound = type;

    switch (type) {
      case 'binaural':
        this.startBinauralBeats();
        break;
      case 'rain':
        this.startRainAndThunder();
        break;
      case 'waves':
        this.startOceanWaves();
        break;
      case 'brown':
        this.startBrownNoise();
        break;
    }
  }

  private startBinauralBeats() {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;

    // Carrier frequency 216Hz on left, 226Hz on right = 10Hz Alpha flow state
    const merger = ctx.createChannelMerger(2);

    const oscLeft = ctx.createOscillator();
    oscLeft.type = 'sine';
    oscLeft.frequency.setValueAtTime(216, ctx.currentTime);

    const oscRight = ctx.createOscillator();
    oscRight.type = 'sine';
    oscRight.frequency.setValueAtTime(226, ctx.currentTime);

    // Warm sub harmonic drone (108Hz)
    const subOsc = ctx.createOscillator();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(108, ctx.currentTime);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.18, ctx.currentTime);
    subOsc.connect(subGain);
    subGain.connect(this.masterGain);

    oscLeft.connect(merger, 0, 0);
    oscRight.connect(merger, 0, 1);
    merger.connect(this.masterGain);

    oscLeft.start();
    oscRight.start();
    subOsc.start();

    this.activeNodes.push(oscLeft, oscRight, subOsc, merger, subGain);
  }

  private startRainAndThunder() {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;

    // Noise buffer for rain
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // High pass + Band pass to mimic rain drops
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1100, ctx.currentTime);
    filter.Q.setValueAtTime(0.6, ctx.currentTime);

    const rainGain = ctx.createGain();
    rainGain.gain.setValueAtTime(0.4, ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(rainGain);
    rainGain.connect(this.masterGain);

    whiteNoise.start();
    this.activeNodes.push(whiteNoise, filter, rainGain);

    // Periodic gentle thunder rumble
    const thunderInterval = window.setInterval(() => {
      if (!this.ctx || !this.masterGain || this.currentSound !== 'rain') return;
      try {
        const osc = this.ctx.createOscillator();
        const tGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(65, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(32, this.ctx.currentTime + 3.5);

        tGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
        tGain.gain.linearRampToValueAtTime(0.18, this.ctx.currentTime + 0.8);
        tGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 3.8);

        osc.connect(tGain);
        tGain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 4);
      } catch {
        // Safe catch
      }
    }, 14000);

    this.activeNodes.push(thunderInterval);
  }

  private startOceanWaves() {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;

    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, ctx.currentTime);

    // LFO for wave ebb and flow
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.12, ctx.currentTime); // ~8 sec wave period

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(250, ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const waveGain = ctx.createGain();
    waveGain.gain.setValueAtTime(0.65, ctx.currentTime);

    noise.connect(filter);
    filter.connect(waveGain);
    waveGain.connect(this.masterGain);

    noise.start();
    lfo.start();

    this.activeNodes.push(noise, filter, lfo, lfoGain, waveGain);
  }

  private startBrownNoise() {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;

    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5;
    }

    const brownSource = ctx.createBufferSource();
    brownSource.buffer = noiseBuffer;
    brownSource.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(450, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.7, ctx.currentTime);

    brownSource.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(this.masterGain);

    brownSource.start();
    this.activeNodes.push(brownSource, lowpass, gain);
  }

  public playTimerBell() {
    this.initContext();
    if (!this.ctx) return;
    const ctx = this.ctx;

    // Harmonic Tibetan singing bowl chime
    const frequencies = [528, 1056, 1584];
    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      const peak = 0.25 / (idx + 1);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(peak, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 2.6);
    });
  }

  public getCurrentSound() {
    return this.currentSound;
  }
}

export const soundscape = new SoundscapeEngine();
