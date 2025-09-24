import config from "@/config";
import { GeoListenMode } from "roundware-web-framework/dist/index";

export const wait = <PromiseType>(
  delay: number,
  value?: any
): Promise<PromiseType> =>
  new Promise((resolve) => setTimeout(resolve, delay, value));

/** gets google map paths from geojson polygon
 * (from roundware-react-admin) */
export const polygonToGoogleMapPaths = (polygon: {
  type: string;
  coordinates: number[][][] | number[][][][];
}) => {
  try {
    let coordinates: number[][] = [];
    
    // @ts-ignore
    if (polygon.type == "MultiPolygon") {
      coordinates = polygon.coordinates[0][0] as number[][];
    }
    // @ts-ignore
    else if (polygon.type == "Polygon") {
      coordinates = polygon.coordinates[0] as number[][];
    } else {
      console.warn('Unsupported polygon type:', polygon.type);
      return [];
    }

    return coordinates?.map((p) => new window.google.maps.LatLng(p[1], p[0])) || [];
  } catch (error) {
    console.warn('Invalid polygon geometry, skipping map rendering:', error);
    return [];
  }
};

function getWidth() {
  return Math.max(
    document.body.scrollWidth,
    document.documentElement.scrollWidth,
    document.body.offsetWidth,
    document.documentElement.offsetWidth,
    document.documentElement.clientWidth
  );
}

export const getDefaultListenMode = () => {
  const isMobile = getWidth() < 600;

  if (config.listen.geoListenMode == "device") {
    return isMobile ? GeoListenMode.AUTOMATIC : GeoListenMode.MANUAL;
  }
  const listenMode = (config.listen.geoListenMode || ["map", "walking"])[0];
  if (listenMode == "map") return GeoListenMode.MANUAL;
  return GeoListenMode.AUTOMATIC;
};

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random#getting_a_random_number_between_two_values
export function getRandomArbitrary(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function trimAudioBuffer(
  buffer: AudioBuffer,
  startTime: number,
  endTime: number,
  audioContext: AudioContext = new AudioContext()
) {
  console.debug("🎯 UTIL TIMING: trimAudioBuffer started at", Date.now());
  
  const sampleRate = buffer.sampleRate;
  const startFrame = Math.max(0, Math.floor(startTime * sampleRate));
  const endFrame = Math.min(buffer.length, Math.ceil(endTime * sampleRate));

  const channels = buffer.numberOfChannels;

  console.debug("🎯 UTIL TIMING: About to create trimmed buffer at", Date.now());
  // Create a new AudioBuffer for the trimmed audio
  const trimmedBuffer = audioContext.createBuffer(
    channels,
    endFrame - startFrame,
    sampleRate
  );
  console.debug("🎯 UTIL TIMING: Trimmed buffer created at", Date.now());
  
  console.log(
    "Start Frame:",
    startFrame,
    "End Frame:",
    endFrame,
    "Duration:",
    "Total Frames:",
    buffer.length,
    "Trimmed Frames:",
    endFrame - startFrame
  );

  console.debug("🎯 UTIL TIMING: About to copy channel data at", Date.now());
  for (let channel = 0; channel < channels; channel++) {
    const sourceData = buffer
      .getChannelData(channel)
      .subarray(startFrame, endFrame);
    trimmedBuffer.getChannelData(channel).set(sourceData);
  }
  console.debug("🎯 UTIL TIMING: Channel data copied at", Date.now());

  console.debug("🎯 UTIL TIMING: trimAudioBuffer completed at", Date.now());
  return trimmedBuffer;
}

export function createBlobFromAudioBuffer(audioBuffer: AudioBuffer) {
  console.debug("🎯 UTIL TIMING: createBlobFromAudioBuffer started at", Date.now());
  
  // Float32Array samples
  console.debug("🎯 UTIL TIMING: About to get channel data at", Date.now());
  const interleaved = audioBuffer.getChannelData(0);
  console.debug("🎯 UTIL TIMING: Channel data retrieved at", Date.now());

  // get WAV file bytes and audio params of your audio source
  console.debug("🎯 UTIL TIMING: About to generate WAV bytes at", Date.now());
  const wavBytes = getWavBytes(interleaved.buffer, {
    isFloat: true, // floating point or 16-bit integer
    numChannels: 1,
    sampleRate: audioBuffer.sampleRate,
  });
  console.debug("🎯 UTIL TIMING: WAV bytes generated at", Date.now());
  
  console.debug("🎯 UTIL TIMING: About to create blob at", Date.now());
  const wav = new Blob([wavBytes], { type: "audio/wav" });
  console.debug("🎯 UTIL TIMING: Blob created at", Date.now());
  
  console.debug("🎯 UTIL TIMING: createBlobFromAudioBuffer completed at", Date.now());
  return wav;
}

// Returns Uint8Array of WAV bytes
function getWavBytes(
  buffer: ArrayBufferLike,
  options: {
    isFloat: boolean;
    numChannels: number;
    sampleRate: number;
    numFrames?: number;
  }
) {
  console.debug("🎯 UTIL TIMING: getWavBytes started at", Date.now());
  
  const type = options.isFloat ? Float32Array : Uint16Array;
  const numFrames = buffer.byteLength / type.BYTES_PER_ELEMENT;

  console.debug("🎯 UTIL TIMING: About to get WAV header at", Date.now());
  const headerBytes = getWavHeader(Object.assign({}, options, { numFrames }));
  console.debug("🎯 UTIL TIMING: WAV header created at", Date.now());
  
  console.debug("🎯 UTIL TIMING: About to create WAV bytes array at", Date.now());
  const wavBytes = new Uint8Array(headerBytes.length + buffer.byteLength);
  console.debug("🎯 UTIL TIMING: WAV bytes array created at", Date.now());

  // prepend header, then add pcmBytes
  console.debug("🎯 UTIL TIMING: About to set header bytes at", Date.now());
  wavBytes.set(headerBytes, 0);
  console.debug("🎯 UTIL TIMING: About to set audio data bytes at", Date.now());
  wavBytes.set(new Uint8Array(buffer), headerBytes.length);
  console.debug("🎯 UTIL TIMING: Audio data bytes set at", Date.now());

  console.debug("🎯 UTIL TIMING: getWavBytes completed at", Date.now());
  return wavBytes;
}

// adapted from https://gist.github.com/also/900023
// returns Uint8Array of WAV header bytes
function getWavHeader(options: {
  isFloat: boolean;
  numChannels: number;
  sampleRate: number;
  numFrames: number;
}) {
  const numFrames = options.numFrames;
  const numChannels = options.numChannels || 2;
  const sampleRate = options.sampleRate || 44100;
  const bytesPerSample = options.isFloat ? 4 : 2;
  const format = options.isFloat ? 3 : 1;

  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * blockAlign;

  const buffer = new ArrayBuffer(44);
  const dv = new DataView(buffer);

  let p = 0;

  function writeString(s: string) {
    for (let i = 0; i < s.length; i++) {
      dv.setUint8(p + i, s.charCodeAt(i));
    }
    p += s.length;
  }

  function writeUint32(d: number) {
    dv.setUint32(p, d, true);
    p += 4;
  }

  function writeUint16(d: number) {
    dv.setUint16(p, d, true);
    p += 2;
  }

  writeString("RIFF"); // ChunkID
  writeUint32(dataSize + 36); // ChunkSize
  writeString("WAVE"); // Format
  writeString("fmt "); // Subchunk1ID
  writeUint32(16); // Subchunk1Size
  writeUint16(format); // AudioFormat https://i.sstatic.net/BuSmb.png
  writeUint16(numChannels); // NumChannels
  writeUint32(sampleRate); // SampleRate
  writeUint32(byteRate); // ByteRate
  writeUint16(blockAlign); // BlockAlign
  writeUint16(bytesPerSample * 8); // BitsPerSample
  writeString("data"); // Subchunk2ID
  writeUint32(dataSize); // Subchunk2Size

  return new Uint8Array(buffer);
}

/**
 * Comprehensive audio constraints that disable all browser audio processing
 * to prevent volume jumps, dips, and unwanted effects
 * Optimized to minimize on-board processing in headphones and external mics
 */
export const getCleanAudioConstraints = (config?: any) => {
  // Get audio processing minimization settings from config
  const audioConfig = config?.speak?.audioProcessingMinimization;
  
  return {
    audio: {
      // === CORE AUDIO QUALITY SETTINGS ===
      sampleRate: audioConfig?.sampleRate || 48000,        // Higher sample rate preserves more info
      sampleSize: audioConfig?.sampleSize || 24,           // Higher bit depth if supported
      channelCount: audioConfig?.channelCount || 1,        // Mono recording to avoid stereo processing
      latencyHint: audioConfig?.latencyHint || 'interactive', // Smaller buffers = less processing
      latency: 0,              // Minimal buffering
    
    // === DISABLE ALL BROWSER AUDIO PROCESSING ===
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,   // Critical for preventing volume jumps
    
    // === GOOGLE/CHROME-SPECIFIC PROCESSING ===
    googEchoCancellation: false,
    googAutoGainControl: false,
    googNoiseSuppression: false,
    googHighpassFilter: false,
    googTypingNoiseDetection: false,
    googBeamforming: false,
    googArrayGeometry: false,
    googAudioMirroring: false,
    googDAEchoCancellation: false,
    googNoiseReduction: false,
    
    // === MOZILLA/FIREFOX-SPECIFIC PROCESSING ===
    mozEchoCancellation: false,
    mozAutoGainControl: false,
    mozNoiseSuppression: false,
    
    // === MICROSOFT/EDGE-SPECIFIC PROCESSING ===
    msEchoCancellation: false,
    msAutoGainControl: false,
    msNoiseSuppression: false,
    
    // === SAFARI/APPLE-SPECIFIC PROCESSING ===
    // Note: Safari doesn't expose these directly, but we include them for future compatibility
    webkitEchoCancellation: false,
    webkitAutoGainControl: false,
    webkitNoiseSuppression: false,
    
    // === ADDITIONAL PROCESSING DISABLERS ===
    // These help prevent any vendor-specific processing
    // Note: Some of these are already defined above, but included here for completeness
    
    // === ADVANCED CONSTRAINTS FOR MINIMAL PROCESSING ===
    // Request specific audio formats that are less likely to trigger processing
    mimeType: 'audio/webm;codecs=opus', // Prefer Opus codec for minimal processing
    
    // === DEVICE-SPECIFIC OPTIMIZATIONS ===
    // These help minimize on-board processing in headphones/external mics
    deviceId: 'default', // Use default device to avoid device-specific processing
    groupId: 'default',  // Use default group to avoid group-specific processing
  }
  };
};

/**
 * Audio context configuration for minimal processing
 * Creates an AudioContext with settings optimized to avoid processing
 */
export const createMinimalAudioContext = (options?: {
  sampleRate?: number;
  latencyHint?: AudioContextLatencyCategory;
}) => {
  const audioContext = new AudioContext({
    sampleRate: options?.sampleRate || 48000,
    latencyHint: options?.latencyHint || 'interactive',
  });
  
  // Set additional properties to minimize processing
  if (audioContext.baseLatency !== undefined) {
    // Some browsers support baseLatency setting
    console.log('AudioContext baseLatency:', audioContext.baseLatency);
  }
  
  return audioContext;
};

/**
 * Creates a gain node with conservative settings to avoid triggering AGC
 * in headphones or external mics
 */
export const createConservativeGainNode = (audioContext: AudioContext, initialGain = 0.3) => {
  const gainNode = audioContext.createGain();
  gainNode.gain.value = initialGain; // Start with 30% to avoid hot levels
  return gainNode;
};

/**
 * Creates a hard compressor to counteract AGC issues from external devices
 * Uses settings matching server-side compression parameters
 */
export const createHardCompressor = (audioContext: AudioContext) => {
  const compressor = audioContext.createDynamicsCompressor();
  
  // Balanced aggressive settings to smooth AGC jumps
  compressor.threshold.value = -40.0; // -40 dB threshold (more sensitive than original)
  compressor.knee.value = 0; // Hard knee for aggressive compression
  compressor.ratio.value = 12.0; // 12:1 ratio (more aggressive than original 8:1)
  compressor.attack.value = 0.001; // 1ms attack time (reasonable and fast)
  compressor.release.value = 0.1; // 100ms release time (good for smoothing)
  
  // Add makeup gain to compensate for volume reduction
  const makeupGain = audioContext.createGain();
  makeupGain.gain.value = 6.0; // 6 dB makeup gain (back to original)
  
  // Connect compressor to makeup gain
  compressor.connect(makeupGain);
  
  // Log compressor settings for verification
  console.log('🎛️ Balanced aggressive compressor created with settings:', {
    threshold: compressor.threshold.value,
    knee: compressor.knee.value,
    ratio: compressor.ratio.value,
    attack: compressor.attack.value,
    release: compressor.release.value,
    makeupGain: makeupGain.gain.value
  });
  
  return {
    compressor,
    makeupGain,
    // Return the makeup gain as the output node for easy chaining
    output: makeupGain
  };
};

/**
 * Enhanced audio level monitoring system with professional metering
 * Provides RMS levels, decibel conversion, and smooth level changes
 * This version works with an existing audio node (for compressed signal monitoring)
 */
export const createAudioLevelMonitorFromNode = (
  audioContext: AudioContext,
  audioNode: AudioNode,
  onLevelChange?: (immediateLevel: number, averageLevel: number, rmsLevel: number, dbLevel: number) => void
) => {
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048; // Larger FFT for better frequency resolution
  analyser.smoothingTimeConstant = 0.8; // More smoothing for VU meter behavior
  
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  const timeDataArray = new Float32Array(analyser.frequencyBinCount);
  
  // Connect the existing audio node to the analyser
  audioNode.connect(analyser);
  
  let monitoringInterval: number | null = null;
  let smoothedLevel = 0;
  let peakLevel = 0;
  let rmsLevel = 0;
  
  // Boxcar filter for smoothing (moving average)
  const smoothingBuffer: number[] = [];
  const smoothingBufferSize = 20; // Increased for more smoothing
  
  // Convert linear amplitude to decibels
  const linearToDb = (linear: number): number => {
    if (linear <= 0) return -60; // Minimum dB level
    return 20 * Math.log10(linear);
  };
  
  // Convert decibels to linear amplitude (0-1 scale)
  const dbToLinear = (db: number): number => {
    return Math.pow(10, db / 20);
  };
  
  // Calculate RMS (Root Mean Square) for more accurate level measurement
  const calculateRMS = (data: Float32Array): number => {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
  };
  
  const startMonitoring = () => {
    if (monitoringInterval) return;
    
    monitoringInterval = window.setInterval(() => {
      // Get time domain data for accurate level measurement (like the original)
      analyser.getFloatTimeDomainData(timeDataArray);
      const rms = calculateRMS(timeDataArray);
      
      // Convert RMS to a more appropriate scale for level metering
      // RMS values are typically very small (0.001-0.1), so we need to scale them up
      const scaledLevel = Math.min(1.0, rms * 18); // Scale up RMS by 18x for better sensitivity
      
      // Also get frequency data as backup (but use it differently)
      analyser.getByteFrequencyData(dataArray);
      const frequencyAverage = dataArray.reduce((a, b) => a + b) / dataArray.length;
      const frequencyLevel = frequencyAverage / 255;
      
      // Use the higher of the two levels for more responsive metering
      const combinedLevel = Math.max(scaledLevel, frequencyLevel * 0.5);
      
      // Apply boxcar filtering for smooth movement
      smoothingBuffer.push(combinedLevel);
      if (smoothingBuffer.length > smoothingBufferSize) {
        smoothingBuffer.shift();
      }
      
      const smoothedAverage = smoothingBuffer.reduce((a, b) => a + b) / smoothingBuffer.length;
      
      // Apply VU meter behavior (slower attack, faster release)
      const attackTime = 0.05; // 50ms attack (faster response)
      const releaseTime = 0.5; // 500ms release (slower decay)
      
      if (smoothedAverage > smoothedLevel) {
        // Attack phase - move up quickly
        smoothedLevel += (smoothedAverage - smoothedLevel) * attackTime;
      } else {
        // Release phase - move down more slowly
        smoothedLevel += (smoothedAverage - smoothedLevel) * releaseTime;
      }
      
      // Update peak level
      if (smoothedLevel > peakLevel) {
        peakLevel = smoothedLevel;
      } else {
        // Peak decay
        peakLevel *= 0.95;
      }
      
      // Convert to decibels
      const dbLevel = linearToDb(smoothedLevel);
      const rmsDbLevel = linearToDb(rms);
      
      if (onLevelChange) {
        // Provide both immediate (raw) and average (smoothed) levels
        const immediateLevel = combinedLevel; // Raw level without smoothing
        onLevelChange(immediateLevel, smoothedLevel, rms, dbLevel);
      }
    }, 16); // 60fps for smooth animation (like the original)
  };
  
  const stopMonitoring = () => {
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      monitoringInterval = null;
    }
  };
  
  return {
    analyser,
    startMonitoring,
    stopMonitoring,
    getCurrentLevel: () => smoothedLevel,
    source: audioNode as any, // Cast to match the expected type
    getSmoothedLevel: () => smoothedLevel,
    getPeakLevel: () => peakLevel,
    getRMSLevel: () => rmsLevel
  };
};

/**
 * Enhanced audio level monitoring system with professional metering
 * Provides RMS levels, decibel conversion, and smooth level changes
 */
export const createAudioLevelMonitor = (
  audioContext: AudioContext,
  stream: MediaStream,
  onLevelChange?: (immediateLevel: number, averageLevel: number, rmsLevel: number, dbLevel: number) => void
) => {
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048; // Larger FFT for better frequency resolution
  analyser.smoothingTimeConstant = 0.8; // More smoothing for VU meter behavior
  
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  const timeDataArray = new Float32Array(analyser.frequencyBinCount);
  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);
  
  let monitoringInterval: number | null = null;
  let smoothedLevel = 0;
  let peakLevel = 0;
  let rmsLevel = 0;
  
  // Boxcar filter for smoothing (moving average)
  const smoothingBuffer: number[] = [];
  const smoothingBufferSize = 20; // Increased for more smoothing
  
  // Convert linear amplitude to decibels
  const linearToDb = (linear: number): number => {
    if (linear <= 0) return -60; // Minimum dB level
    return 20 * Math.log10(linear);
  };
  
  // Convert decibels to linear amplitude (0-1 scale)
  const dbToLinear = (db: number): number => {
    return Math.pow(10, db / 20);
  };
  
  // Calculate RMS (Root Mean Square) for more accurate level measurement
  const calculateRMS = (data: Float32Array): number => {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
  };
  
  const startMonitoring = () => {
    if (monitoringInterval) return;
    
    monitoringInterval = window.setInterval(() => {
      // Get time domain data for accurate level measurement
      analyser.getFloatTimeDomainData(timeDataArray);
      const rms = calculateRMS(timeDataArray);
      
      // Convert RMS to a more appropriate scale for level metering
      // RMS values are typically very small (0.001-0.1), so we need to scale them up
      const scaledLevel = Math.min(1.0, rms * 18); // Scale up RMS by 50x for better sensitivity
      
      // Also get frequency data as backup (but use it differently)
      analyser.getByteFrequencyData(dataArray);
      const frequencyAverage = dataArray.reduce((a, b) => a + b) / dataArray.length;
      const frequencyLevel = frequencyAverage / 255;
      
      // Use the higher of the two levels for more responsive metering
      const combinedLevel = Math.max(scaledLevel, frequencyLevel * 0.5);
      
      // Apply boxcar filtering for smooth movement
      smoothingBuffer.push(combinedLevel);
      if (smoothingBuffer.length > smoothingBufferSize) {
        smoothingBuffer.shift();
      }
      
      const smoothedAverage = smoothingBuffer.reduce((a, b) => a + b) / smoothingBuffer.length;
      
      // Apply VU meter behavior (slower attack, faster release)
      const attackTime = 0.05; // 50ms attack (faster response)
      const releaseTime = 0.5; // 500ms release (slower decay)
      
      if (smoothedAverage > smoothedLevel) {
        // Attack phase - move up quickly
        smoothedLevel += (smoothedAverage - smoothedLevel) * attackTime;
      } else {
        // Release phase - move down more slowly
        smoothedLevel += (smoothedAverage - smoothedLevel) * releaseTime;
      }
      
      // Update peak level
      if (smoothedLevel > peakLevel) {
        peakLevel = smoothedLevel;
      } else {
        // Peak decay
        peakLevel *= 0.95;
      }
      
      // Convert to decibels
      const dbLevel = linearToDb(smoothedLevel);
      const rmsDbLevel = linearToDb(rms);
      
      if (onLevelChange) {
        // Provide both immediate (raw) and average (smoothed) levels
        const immediateLevel = combinedLevel; // Raw level without smoothing
        onLevelChange(immediateLevel, smoothedLevel, rms, dbLevel);
      }
      
      // Log levels for debugging (only when there's meaningful audio activity)
      if (smoothedLevel > 0.01) { // Only log if there's some audio activity
        console.log('Audio level debug:', {
          rms: rms.toFixed(4),
          scaledLevel: (scaledLevel * 100).toFixed(1) + '%',
          frequencyLevel: (frequencyLevel * 100).toFixed(1) + '%',
          combinedLevel: (combinedLevel * 100).toFixed(1) + '%',
          smoothedLevel: (smoothedLevel * 100).toFixed(1) + '%',
          dbLevel: dbLevel.toFixed(1) + 'dB'
        });
        
        if (smoothedLevel > 0.8) {
          console.warn('Audio levels high:', (smoothedLevel * 100).toFixed(1) + '%', `(${dbLevel.toFixed(1)}dB) - may trigger external AGC`);
        } else if (smoothedLevel < 0.1) {
          console.warn('Audio levels low:', (smoothedLevel * 100).toFixed(1) + '%', `(${dbLevel.toFixed(1)}dB) - may trigger external AGC`);
        }
      }
    }, 16); // 60fps for smooth animation
  };
  
  const stopMonitoring = () => {
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      monitoringInterval = null;
    }
  };
  
  const getCurrentLevel = () => {
    analyser.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    return average / 255; // Return normalized 0-1 value
  };
  
  return {
    analyser,
    startMonitoring,
    stopMonitoring,
    getCurrentLevel,
    source,
    getSmoothedLevel: () => smoothedLevel,
    getPeakLevel: () => peakLevel,
    getRMSLevel: () => rmsLevel,
  };
};

/**
 * Adaptive gain control that adjusts levels to stay in the "safe zone"
 * to avoid triggering external device processing
 * Updated to work with normalized 0-1 levels
 */
export const createAdaptiveGainControl = (
  audioContext: AudioContext,
  targetLevel = 0.4, // Target level (0-1 scale, default 0.4 = 40%)
  tolerance = 0.1    // Acceptable range around target (0.1 = 10%)
) => {
  const gainNode = audioContext.createGain();
  gainNode.gain.value = 0.3; // Start conservative
  
  let isAdjusting = false;
  
  const adjustGain = (currentLevel: number) => {
    if (isAdjusting) return;
    
    isAdjusting = true;
    
    try {
      const difference = targetLevel - currentLevel;
      
      if (Math.abs(difference) > tolerance) {
        let adjustmentFactor = 1.0;
        
        if (difference > 0) {
          // Level too low, increase gain
          adjustmentFactor = 1.1;
        } else {
          // Level too high, decrease gain
          adjustmentFactor = 0.9;
        }
        
        // Apply adjustment with ramping to avoid clicks
        const newGain = Math.max(0.1, Math.min(1.0, gainNode.gain.value * adjustmentFactor));
        gainNode.gain.setTargetAtTime(newGain, audioContext.currentTime, 0.1);
        
        // Only log if there's actual change and meaningful audio activity
        if (Math.abs(newGain - gainNode.gain.value) > 0.01 && currentLevel > 0.01) {
          console.log(`Adjusting gain: ${gainNode.gain.value.toFixed(2)} -> ${newGain.toFixed(2)} (level: ${(currentLevel * 100).toFixed(1)}%)`);
        }
      }
    } finally {
      isAdjusting = false;
    }
  };
  
  return {
    gainNode,
    adjustGain,
  };
};

/**
 * Comprehensive audio setup that minimizes all processing
 * Returns a complete audio processing chain optimized for minimal interference
 */
export const createMinimalAudioProcessingChain = async (options?: {
  enableLevelMonitoring?: boolean;
  enableAdaptiveGain?: boolean;
  targetLevel?: number;
  onLevelChange?: (immediateLevel: number, averageLevel: number, rmsLevel: number, dbLevel: number) => void;
}) => {
  try {
    // Get clean audio stream
    const stream = await navigator.mediaDevices.getUserMedia(getCleanAudioConstraints());
    
    // Create minimal audio context
    const audioContext = createMinimalAudioContext();
    
    // Create hard compressor to counteract AGC issues
    const compressor = createHardCompressor(audioContext);
    console.log('🔗 Audio chain created with balanced aggressive compressor for AGC smoothing');
    
    // Create conservative gain node
    const gainNode = createConservativeGainNode(audioContext);
    
    // Create source from stream
    const source = audioContext.createMediaStreamSource(stream);
    
    // Connect the chain: source -> compressor -> gainNode
    source.connect(compressor.output);
    compressor.output.connect(gainNode);
    // DO NOT connect to audioContext.destination to prevent microphone routing to output
    
    let levelMonitor: ReturnType<typeof createAudioLevelMonitor> | null = null;
    let adaptiveGain: ReturnType<typeof createAdaptiveGainControl> | null = null;
    
    if (options?.enableLevelMonitoring) {
      // Create level monitor that monitors the limited + compressed signal
      // This gives us the final signal level that will be recorded
      levelMonitor = createAudioLevelMonitorFromNode(audioContext, compressor.output, (immediateLevel, averageLevel, rmsLevel, dbLevel) => {
        if (options?.enableAdaptiveGain && adaptiveGain) {
          adaptiveGain.adjustGain(immediateLevel);
        }
        // Call external callback if provided
        if (options?.onLevelChange) {
          options.onLevelChange(immediateLevel, averageLevel, rmsLevel, dbLevel);
        }
      });
      
      // Connect the chain: source -> compressor -> level monitor -> gainNode
      source.disconnect();
      source.connect(compressor.output);
      if (levelMonitor) {
        compressor.output.connect(levelMonitor.analyser);
        levelMonitor.analyser.connect(gainNode);
        levelMonitor.startMonitoring();
      }
    }
    
    if (options?.enableAdaptiveGain) {
      adaptiveGain = createAdaptiveGainControl(audioContext, options.targetLevel || 100);
      
      // Insert adaptive gain into the chain after compressor
      if (levelMonitor) {
        levelMonitor.analyser.disconnect();
        levelMonitor.analyser.connect(adaptiveGain.gainNode);
        adaptiveGain.gainNode.connect(gainNode);
      } else {
        source.disconnect();
        source.connect(compressor.output);
        compressor.output.connect(adaptiveGain.gainNode);
        adaptiveGain.gainNode.connect(gainNode);
      }
    }
    
    return {
      stream,
      audioContext,
      source,
      compressor,
      gainNode,
      levelMonitor,
      adaptiveGain,
      cleanup: () => {
        levelMonitor?.stopMonitoring();
        stream.getTracks().forEach(track => track.stop());
        audioContext.close();
      }
    };
  } catch (error) {
    console.error('Failed to create minimal audio processing chain:', error);
    throw error;
  }
};

/**
 * Utility to check if current audio constraints are being respected
 * Helps debug when external processing might be interfering
 */
export const validateAudioConstraints = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(getCleanAudioConstraints());
    const track = stream.getAudioTracks()[0];
    const settings = track.getSettings();
    const capabilities = track.getCapabilities();
    
    console.log('Audio track settings:', settings);
    console.log('Audio track capabilities:', capabilities);
    
    // Check if our constraints were applied
    const constraintsApplied = {
      echoCancellation: settings.echoCancellation === false,
      noiseSuppression: settings.noiseSuppression === false,
      autoGainControl: settings.autoGainControl === false,
    };
    
    console.log('Constraints applied:', constraintsApplied);
    
    // Stop the stream
    stream.getTracks().forEach(track => track.stop());
    
    return {
      settings,
      capabilities,
      constraintsApplied,
    };
  } catch (error) {
    console.error('Failed to validate audio constraints:', error);
    throw error;
  }
};

// Export color utilities
export * from './colors';
