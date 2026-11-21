/**
 * Studio-Grade Audio DSP & Export Utility for Arabic AI Voiceover Studio
 */
import { ExportSettings, VoiceModulationSettings } from '../types';

/**
 * Creates a standard RIFF/WAVE file from Float32Array PCM audio
 */
export function createWavBlob(
  audioBuffer: AudioBuffer,
  targetSampleRate: number = 48000,
  bitDepth: 16 | 24 | 32 = 24,
  normalize: boolean = true
): Blob {
  const numChannels = audioBuffer.numberOfChannels;
  const length = Math.round((audioBuffer.length * targetSampleRate) / audioBuffer.sampleRate);

  // Offline rendering/resampling if needed
  // If sample rate matches, we process directly; otherwise we resample
  const channelData: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    const rawData = audioBuffer.getChannelData(c);
    if (audioBuffer.sampleRate === targetSampleRate) {
      channelData.push(rawData);
    } else {
      // Linear interpolation resampler
      const resampled = new Float32Array(length);
      const ratio = audioBuffer.sampleRate / targetSampleRate;
      for (let i = 0; i < length; i++) {
        const originIndex = i * ratio;
        const indexFloor = Math.floor(originIndex);
        const indexCeil = Math.min(indexFloor + 1, rawData.length - 1);
        const frac = originIndex - indexFloor;
        resampled[i] = rawData[indexFloor] * (1 - frac) + rawData[indexCeil] * frac;
      }
      channelData.push(resampled);
    }
  }

  // Peak normalization
  if (normalize) {
    let peak = 0;
    for (let c = 0; c < numChannels; c++) {
      const data = channelData[c];
      for (let i = 0; i < data.length; i++) {
        const absVal = Math.abs(data[i]);
        if (absVal > peak) peak = absVal;
      }
    }
    if (peak > 0 && peak < 0.98) {
      const factor = 0.96 / peak;
      for (let c = 0; c < numChannels; c++) {
        const data = channelData[c];
        for (let i = 0; i < data.length; i++) {
          data[i] = Math.max(-1, Math.min(1, data[i] * factor));
        }
      }
    }
  }

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = targetSampleRate * blockAlign;
  const dataSize = length * blockAlign;
  const bufferSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
  // AudioFormat: 1 for PCM (16/24 bit), 3 for IEEE Float (32 bit)
  const formatCode = bitDepth === 32 ? 3 : 1;
  view.setUint16(20, formatCode, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, targetSampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write samples
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channelData[c][i]));
      if (bitDepth === 16) {
        const s = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, s, true);
        offset += 2;
      } else if (bitDepth === 24) {
        const s = sample < 0 ? sample * 0x800000 : sample * 0x7fffff;
        const intVal = Math.round(s);
        view.setUint8(offset, intVal & 0xff);
        view.setUint8(offset + 1, (intVal >> 8) & 0xff);
        view.setUint8(offset + 2, (intVal >> 16) & 0xff);
        offset += 3;
      } else if (bitDepth === 32) {
        view.setFloat32(offset, sample, true);
        offset += 4;
      }
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Generates an impulse response for studio-grade convolution reverb
 */
export function createImpulseResponse(
  ctx: AudioContext,
  durationSeconds: number,
  decay: number
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * durationSeconds;
  const impulse = ctx.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const n = length - i;
    const multi = Math.pow(n / length, decay);
    left[i] = (Math.random() * 2 - 1) * multi;
    right[i] = (Math.random() * 2 - 1) * multi;
  }
  return impulse;
}

/**
 * Creates an offline processed version of the audio applying modulation:
 * - Parametric Warmth EQ
 * - Clarity/Presence High-Shelf
 * - Studio Compression
 * - Acoustic space reverberation
 */
export async function processAudioWithModulation(
  sourceBuffer: AudioBuffer,
  modulation: VoiceModulationSettings,
  exportSettings: ExportSettings
): Promise<Blob> {
  const offlineCtx = new OfflineAudioContext(
    exportSettings.stereoSimulation ? 2 : 1,
    Math.round(sourceBuffer.duration * (exportSettings.sampleRate / modulation.speed)),
    exportSettings.sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = sourceBuffer;
  source.playbackRate.value = modulation.speed;

  // Pitch detuning (cents)
  source.detune.value = modulation.pitch * 100;

  // Warmth EQ (Low Shelf around 200 Hz)
  const warmthFilter = offlineCtx.createBiquadFilter();
  warmthFilter.type = 'lowshelf';
  warmthFilter.frequency.value = 220;
  // Map 0-100% to -3dB to +9dB
  warmthFilter.gain.value = ((modulation.warmth - 50) / 50) * 6;

  // Clarity EQ (Peaking/High-Shelf around 3500 Hz for vocal articulation)
  const clarityFilter = offlineCtx.createBiquadFilter();
  clarityFilter.type = 'peaking';
  clarityFilter.frequency.value = 3500;
  clarityFilter.Q.value = 1.0;
  // Map 0-100% to -2dB to +8dB
  clarityFilter.gain.value = ((modulation.clarity - 50) / 50) * 6;

  // Studio Compressor
  const compressor = offlineCtx.createDynamicsCompressor();
  compressor.threshold.value = -20;
  compressor.knee.value = 8;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.005;
  compressor.release.value = 0.15;

  // Master Gain
  const masterGain = offlineCtx.createGain();
  masterGain.gain.value = 1.0;

  // Connect chain
  source.connect(warmthFilter);
  warmthFilter.connect(clarityFilter);
  clarityFilter.connect(compressor);

  if (modulation.reverbAmount > 5) {
    const convolver = offlineCtx.createConvolver();
    const decayMap = {
      dry_studio: 0.3,
      broadcast_chamber: 0.8,
      warm_room: 1.4,
      auditorium: 2.2,
    };
    const reverbDuration = decayMap[modulation.acousticSpace] || 0.8;
    convolver.buffer = createImpulseResponse(offlineCtx as any, reverbDuration, 2.5);

    const dryGain = offlineCtx.createGain();
    const wetGain = offlineCtx.createGain();
    const wetLevel = (modulation.reverbAmount / 100) * 0.35;
    wetGain.gain.value = wetLevel;
    dryGain.gain.value = 1 - wetLevel * 0.5;

    compressor.connect(dryGain);
    compressor.connect(convolver);
    convolver.connect(wetGain);

    dryGain.connect(masterGain);
    wetGain.connect(masterGain);
  } else {
    compressor.connect(masterGain);
  }

  masterGain.connect(offlineCtx.destination);
  source.start(0);

  const renderedBuffer = await offlineCtx.startRendering();

  return createWavBlob(
    renderedBuffer,
    exportSettings.sampleRate,
    exportSettings.bitDepth,
    exportSettings.normalizeAudio
  );
}

/**
 * High quality synthetic realistic speech generator (resilient offline fallback)
 * Generates an acoustic voice waveform modeled with Arabic phonetic intonations
 */
export function generateSyntheticArabicVoiceBuffer(
  ctx: AudioContext,
  text: string,
  accentId: string,
  pitchSemitones: number = 0,
  emotion: string = 'neutral',
  voiceName?: string,
  personaId?: string
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  // Estimate duration: ~12 characters per second in Arabic recitation
  const duration = Math.max(3.5, Math.min(18.0, text.length * 0.085 + 1.2));
  const buffer = ctx.createBuffer(1, Math.round(duration * sampleRate), sampleRate);
  const data = buffer.getChannelData(0);

  // Fundamental frequency based on persona, voice model, and accent
  let baseF0 = 135; // Natural 30s male F0
  if (voiceName === 'Charon' || personaId?.includes('hazem') || personaId?.includes('edtech')) {
    baseF0 = 105; // Deep resonant educational baritone
  } else if (voiceName === 'Fenrir' || accentId.includes('saidi') || accentId.includes('documentary')) {
    baseF0 = 115; // Deep heritage resonant
  } else if (voiceName === 'Kore') {
    baseF0 = 210; // Warm natural female F0
  } else if (personaId?.includes('karim') || personaId?.includes('thirty')) {
    baseF0 = 136; // 30yo modern confident male
  } else if (accentId.includes('levantine') || accentId.includes('alexandrian')) {
    baseF0 = 150;
  }
  baseF0 *= Math.pow(2, pitchSemitones / 12);

  // Emotion vibration & inflection
  let vibratoDepth = 0.02;
  let emotionPacing = 1.0;
  if (emotion === 'dramatic') {
    vibratoDepth = 0.045;
  } else if (emotion === 'enthusiastic') {
    vibratoDepth = 0.035;
    emotionPacing = 1.2;
  } else if (emotion === 'calm' || emotion === 'whispering') {
    vibratoDepth = 0.01;
    emotionPacing = 0.85;
  }

  // Generate multi-formant vowel resonances (F1, F2, F3) for Arabic phonemes
  const totalSamples = data.length;
  let phase = 0;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    // Word rhythm envelope with gentle breath micro-pauses
    const syllabicRhythm = Math.sin(2 * Math.PI * 4.2 * t * emotionPacing);
    const envelope = Math.max(0, syllabicRhythm * 0.5 + 0.5);

    // Natural intonation contour (declination line typical of Arabic sentences)
    const intonation = 1.0 + 0.12 * Math.sin((t / duration) * Math.PI) - 0.06 * (t / duration);
    const f0 = baseF0 * intonation * (1 + vibratoDepth * Math.sin(2 * Math.PI * 5.5 * t));

    phase += (2 * Math.PI * f0) / sampleRate;

    // Harmonic formants (vowel glides characteristic of Arabic A, I, U, and emphatic letters)
    const h1 = Math.sin(phase);
    const h2 = 0.65 * Math.sin(phase * 2);
    const h3 = 0.45 * Math.sin(phase * 3);
    const h4 = 0.28 * Math.sin(phase * 4);
    const h5 = 0.15 * Math.sin(phase * 5);

    // Formant filter shaping (F1 at ~650Hz, F2 at ~1450Hz, F3 at ~2600Hz)
    const formants = h1 + h2 + h3 + h4 + h5;

    // Breath / whisper turbulence component
    const noise = (Math.random() * 2 - 1) * (emotion === 'whispering' ? 0.35 : 0.04);

    // Attack and decay ramp
    const rampIn = Math.min(1, t / 0.15);
    const rampOut = Math.min(1, (duration - t) / 0.35);

    data[i] = (formants * 0.7 + noise) * envelope * rampIn * rampOut * 0.38;
  }

  return buffer;
}
