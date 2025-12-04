/**
 * Audio Service for "Magical Fairy Dust" procedural sound generation.
 * Uses FM Synthesis for bells and Filtered White Noise for sparkle texture.
 */

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let dynamicsCompressor: DynamicsCompressorNode | null = null;

// White noise buffer cache
let noiseBuffer: AudioBuffer | null = null;

const createNoiseBuffer = (ctx: AudioContext) => {
  const bufferSize = ctx.sampleRate * 2; // 2 seconds of noise
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
};

export const initAudio = (): void => {
  if (audioCtx) return;

  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  audioCtx = new AudioContextClass();
  
  // Master chain
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.6; // Safety headroom

  dynamicsCompressor = audioCtx.createDynamicsCompressor();
  dynamicsCompressor.threshold.value = -24;
  dynamicsCompressor.knee.value = 30;
  dynamicsCompressor.ratio.value = 12;
  dynamicsCompressor.attack.value = 0.003;
  dynamicsCompressor.release.value = 0.25;

  masterGain.connect(dynamicsCompressor);
  dynamicsCompressor.connect(audioCtx.destination);

  noiseBuffer = createNoiseBuffer(audioCtx);
};

export const resumeAudio = async (): Promise<void> => {
  if (!audioCtx) initAudio();
  if (audioCtx?.state === 'suspended') {
    await audioCtx.resume();
  }
};

export const playSparkle = (): void => {
  if (!audioCtx || !masterGain || !noiseBuffer) return;
  if (audioCtx.state === 'suspended') return;

  const now = audioCtx.currentTime;
  const grainCount = 30; // Number of micro-grains per beat
  const duration = 0.6; // Spread over time

  for (let i = 0; i < grainCount; i++) {
    const startTime = now + Math.random() * duration;
    const release = 0.05 + Math.random() * 0.15;
    
    // --- 1. Tonal Component (FM Synthesis) ---
    // Glassy/Bell sound: Carrier + Modulator at non-integer ratio
    const osc = audioCtx.createOscillator();
    const modulator = audioCtx.createOscillator();
    const modGain = audioCtx.createGain();
    const env = audioCtx.createGain();

    // Frequencies: High pitch for sparkle (2000Hz - 5000Hz)
    const fundamental = 2000 + Math.random() * 3000;
    osc.frequency.value = fundamental;
    osc.type = 'sine';

    // FM Ratio for inharmonic metallic sound (e.g., 1.5x)
    modulator.frequency.value = fundamental * 1.5; 
    modulator.type = 'sine';
    
    // FM Depth
    modGain.gain.value = 500 + Math.random() * 500;

    // Envelope
    env.gain.setValueAtTime(0, startTime);
    env.gain.linearRampToValueAtTime(0.1 + Math.random() * 0.1, startTime + 0.01);
    env.gain.exponentialRampToValueAtTime(0.001, startTime + release);

    // Graph: Mod -> ModGain -> OscFreq | Osc -> Env -> Master
    modulator.connect(modGain);
    modGain.connect(osc.frequency);
    osc.connect(env);
    env.connect(masterGain);

    osc.start(startTime);
    modulator.start(startTime);
    osc.stop(startTime + release + 0.1);
    modulator.stop(startTime + release + 0.1);

    // --- 2. Textural Component (Filtered Noise) ---
    const noiseSrc = audioCtx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    const noiseFilter = audioCtx.createBiquadFilter();
    const noiseEnv = audioCtx.createGain();

    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 4000 + Math.random() * 4000;
    noiseFilter.Q.value = 10; // Narrow band for "sand" sound

    noiseEnv.gain.setValueAtTime(0, startTime);
    noiseEnv.gain.linearRampToValueAtTime(0.05, startTime + 0.005);
    noiseEnv.gain.exponentialRampToValueAtTime(0.001, startTime + 0.05);

    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseEnv);
    noiseEnv.connect(masterGain);

    noiseSrc.start(startTime);
    noiseSrc.stop(startTime + 0.1);
  }
};
