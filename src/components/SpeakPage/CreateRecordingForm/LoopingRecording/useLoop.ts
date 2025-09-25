import { useEffect, useRef, useState } from "react";
import config from "@/config";

export const useLoop = () => {
  const audioContext = useRef(new AudioContext());

  const [isLoading, setIsLoading] = useState(true);
  const [isStarted, setIsStarted] = useState(false);

  const speakerAudioBuffer = useRef<AudioBuffer | null>(null);
  const speakerAudioBufferWithClick = useRef<AudioBuffer | null>(null);
  const speakerAudioBufferWithoutClick = useRef<AudioBuffer | null>(null);
  const speakerSource = useRef<AudioBufferSourceNode | null>(null);
  const recordedAudioSource = useRef<AudioBufferSourceNode | null>(null);

  // Effects nodes for playback
  const playbackEffects = useRef<{
    compressor: DynamicsCompressorNode | null;
    delay: DelayNode | null;
    feedbackGain: GainNode | null;
    convolver: ConvolverNode | null;
    reverbGain: GainNode | null;
    masterGain: GainNode | null;
    dryGain: GainNode | null;
    wetGain: GainNode | null;
    outputGain: GainNode | null;
    effectsSend: GainNode | null;
  }>({
    compressor: null,
    delay: null,
    feedbackGain: null,
    convolver: null,
    reverbGain: null,
    masterGain: null,
    dryGain: null,
    wetGain: null,
    outputGain: null,
    effectsSend: null,
  });

  const startedAtTime = useRef<number | null>(null);

  const [mode, setMode] = useState<
    | "idle"
    | "playing-speaker"
    | "preparing-to-record"
    | "countdown-to-record"
    | "recording"
    | "processing-recording"
    | "recording-playback"
    | "loading"
  >("idle");

  const interval = useRef<NodeJS.Timer | null>(null);

  const nextLoopPointAt = useRef<number | null>(null);

  const setSpeakerBuffers = (withClick: AudioBuffer, withoutClick: AudioBuffer) => {
    console.log('[setSpeakerBuffers] Setting buffers - withClick duration:', withClick.duration, 'withoutClick duration:', withoutClick.duration);
    speakerAudioBufferWithClick.current = withClick;
    speakerAudioBufferWithoutClick.current = withoutClick;
    // Default to the version with click for backward compatibility
    speakerAudioBuffer.current = withClick;
    console.log('[setSpeakerBuffers] Buffers set successfully');
  };

  const setupPlaybackEffects = () => {
    console.log('[setupPlaybackEffects] Checking if effects are enabled:', config.speak.loopingRecordingPlaybackEffects?.enabled);
    
    if (!config.speak.loopingRecordingPlaybackEffects?.enabled) {
      console.log('[setupPlaybackEffects] Effects disabled, returning null');
      return null;
    }

    console.log('[setupPlaybackEffects] Setting up effects chain...');
    
    // Use the loopingRecordingPlaybackEffects configuration (adjustable for click track)
    const playbackEffectsConfig = config.speak.loopingRecordingPlaybackEffects;
    
    console.log('[setupPlaybackEffects] Playback effects config:', playbackEffectsConfig);
    
    // Create master mixer nodes (like Roundware framework)
    const masterGainNode = audioContext.current.createGain();
    const masterDryGainNode = audioContext.current.createGain();
    const masterWetGainNode = audioContext.current.createGain();
    const masterEffectsSendNode = audioContext.current.createGain();
    
    // Create effects nodes
    const compressor = audioContext.current.createDynamicsCompressor();
    const delay = audioContext.current.createDelay(1.0); // Max 1 second delay like framework
    const feedbackGain = audioContext.current.createGain();
    const convolver = audioContext.current.createConvolver();

    // Set compression parameters (from loopingRecordingPlaybackEffects)
    compressor.threshold.value = playbackEffectsConfig.compression.threshold;
    compressor.knee.value = playbackEffectsConfig.compression.knee;
    compressor.ratio.value = playbackEffectsConfig.compression.ratio;
    compressor.attack.value = playbackEffectsConfig.compression.attack;
    compressor.release.value = playbackEffectsConfig.compression.release;

    // Set delay parameters (from loopingRecordingPlaybackEffects - adjustable for click track)
    delay.delayTime.value = playbackEffectsConfig.delay.time;
    feedbackGain.gain.value = playbackEffectsConfig.delay.feedback;

    // Get wet/dry ratio from loopingRecordingPlaybackEffects (use reverb's wetDryRatio)
    const wetDryRatio = playbackEffectsConfig.reverb.wetDryRatio || 0.3; // Default to 0.3 if not set
    
    // Apply room size and damping to impulse response (from loopingRecordingPlaybackEffects)
    const roomSize = playbackEffectsConfig.reverb.roomSize || 0.6; // Default to 0.6 if not set
    const damping = playbackEffectsConfig.reverb.damping || 0.3; // Default to 0.3 if not set
    
    console.log('[setupPlaybackEffects] Delay time:', delay.delayTime.value, 'seconds');
    console.log('[setupPlaybackEffects] Feedback:', feedbackGain.gain.value);
    console.log('[setupPlaybackEffects] Room size:', roomSize);
    console.log('[setupPlaybackEffects] Damping:', damping);
    console.log('[setupPlaybackEffects] Wet/Dry ratio:', wetDryRatio);

    // Create algorithmic reverb impulse response (like Roundware framework)
    const sampleRate = audioContext.current.sampleRate;
    const length = Math.floor(sampleRate * roomSize * 3); // 3 seconds max like framework
    const impulseBuffer = audioContext.current.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulseBuffer.getChannelData(channel);
      
      for (let i = 0; i < length; i++) {
        // Generate white noise with higher amplitude for more obvious effect
        const noise = (Math.random() * 2 - 1) * 0.8;
        
        // Apply exponential decay with more dramatic curve
        const decay = Math.pow(1 - damping, i / length);
        
        // Apply room size scaling with more dramatic effect
        const roomScale = Math.pow(roomSize, 0.3);
        
        channelData[i] = noise * decay * roomScale;
      }
    }
    convolver.buffer = impulseBuffer;

    // Connect the effects chain (like Roundware framework)
    // 1. Connect dry signal path
    masterDryGainNode.connect(masterGainNode);
    
    // 2. Connect wet signal path
    masterWetGainNode.connect(masterGainNode);
    
    // 3. Connect master gain to destination
    masterGainNode.connect(audioContext.current.destination);
    
    // 4. Connect effects send to both delay and reverb (parallel processing)
    masterEffectsSendNode.connect(delay);
    masterEffectsSendNode.connect(convolver);
    
    // 5. Connect delay chain with feedback loop
    delay.connect(feedbackGain);
    feedbackGain.connect(delay); // Feedback loop
    delay.connect(masterWetGainNode);
    
    // 6. Connect reverb chain
    convolver.connect(masterWetGainNode);
    
    // 7. Set initial wet/dry ratio (like Roundware framework)
    masterWetGainNode.gain.value = wetDryRatio;
    masterDryGainNode.gain.value = 1 - wetDryRatio;
    
    console.log('[setupPlaybackEffects] Effects chain connected with adjustable parameters for click track');
    console.log('[setupPlaybackEffects] Wet level:', wetDryRatio, 'Dry level:', 1 - wetDryRatio);
    console.log('[setupPlaybackEffects] Master gain node:', masterGainNode);
    console.log('[setupPlaybackEffects] Dry gain node:', masterDryGainNode);
    console.log('[setupPlaybackEffects] Wet gain node:', masterWetGainNode);
    console.log('[setupPlaybackEffects] Effects send node:', masterEffectsSendNode);

    // Store references for cleanup
    playbackEffects.current = {
      compressor,
      delay,
      feedbackGain,
      convolver,
      reverbGain: null, // Not used in this approach
      masterGain: masterGainNode,
      dryGain: masterDryGainNode,
      wetGain: masterWetGainNode,
      outputGain: masterGainNode,
      effectsSend: masterEffectsSendNode,
    };
    
    console.log('[setupPlaybackEffects] Final stored effects:', playbackEffects.current);
    
    console.log('[setupPlaybackEffects] Stored playback effects:', playbackEffects.current);
    console.log('[setupPlaybackEffects] Dry gain after storage:', playbackEffects.current.dryGain);
    console.log('[setupPlaybackEffects] Effects send after storage:', playbackEffects.current.effectsSend);

    return masterGainNode; // Return the master gain as the main output node
  };

  const cleanupPlaybackEffects = () => {
    console.log('[cleanupPlaybackEffects] Cleaning up effects...');
    const effects = playbackEffects.current;
    if (effects.compressor) effects.compressor.disconnect();
    if (effects.delay) effects.delay.disconnect();
    if (effects.feedbackGain) effects.feedbackGain.disconnect();
    if (effects.convolver) effects.convolver.disconnect();
    if (effects.reverbGain) effects.reverbGain.disconnect();
    if (effects.masterGain) effects.masterGain.disconnect();
    if (effects.dryGain) effects.dryGain.disconnect();
    if (effects.wetGain) effects.wetGain.disconnect();
    if (effects.effectsSend) effects.effectsSend.disconnect();
    if (effects.outputGain) effects.outputGain.disconnect();
    
    playbackEffects.current = {
      compressor: null,
      delay: null,
      feedbackGain: null,
      convolver: null,
      reverbGain: null,
      masterGain: null,
      dryGain: null,
      wetGain: null,
      outputGain: null,
      effectsSend: null,
    };
  };

  const getSpeakerBufferForMode = (currentMode: typeof mode) => {
    console.log('[getSpeakerBufferForMode] Mode:', currentMode);
    console.log('[getSpeakerBufferForMode] Has buffer with click:', !!speakerAudioBufferWithClick.current);
    console.log('[getSpeakerBufferForMode] Has buffer without click:', !!speakerAudioBufferWithoutClick.current);
    
    // Use version without click for playback modes
    if (currentMode === "recording-playback") {
      const buffer = speakerAudioBufferWithoutClick.current;
      if (!buffer) {
        console.error('[getSpeakerBufferForMode] No buffer without click available for recording-playback mode!');
        return speakerAudioBuffer.current; // Fallback
      }
      console.log('[getSpeakerBufferForMode] Using buffer without click for recording-playback mode');
      return buffer;
    }
    // Use version with click for recording modes
    const buffer = speakerAudioBufferWithClick.current;
    if (!buffer) {
      console.error('[getSpeakerBufferForMode] No buffer with click available for mode:', currentMode);
      return speakerAudioBuffer.current; // Fallback
    }
    console.log('[getSpeakerBufferForMode] Using buffer with click for mode:', currentMode);
    return buffer;
  };

  const calculateNextPoint = () => {
    if (!speakerAudioBuffer.current) return;
    nextLoopPointAt.current =
      Date.now() + speakerAudioBuffer.current.duration * 1000;
    interval.current = setInterval(() => {
      if (!speakerAudioBuffer.current) return;
      nextLoopPointAt.current =
        Date.now() + speakerAudioBuffer.current.duration * 1000;
    }, speakerAudioBuffer.current.duration * 1000);
  };

  async function start(newMode?: typeof mode, recordedAudioBlob?: Blob) {
    console.log('[start] Starting loop with mode:', newMode || mode);
    
    if (newMode) {
      if (newMode === "recording-playback") {
        setMode("loading");
      } else {
        setMode("idle");

        setTimeout(() => {
          setMode(newMode);
        }, 10);
      }
    }
    if (isLoading || !speakerAudioBuffer.current) return;

    await audioContext.current.resume();
    setIsStarted(true);
    speakerSource.current = audioContext.current.createBufferSource();
    
    // Choose the appropriate buffer based on the mode
    const targetMode = newMode || mode;
    const appropriateBuffer = getSpeakerBufferForMode(targetMode);
    
    if (!appropriateBuffer) {
      console.error("No appropriate speaker buffer available for mode:", targetMode);
      return;
    }
    
    speakerSource.current.buffer = appropriateBuffer;
    const speakerGain = audioContext.current.createGain();

    // speaker gain to 0.5 if there is a recorded audio blob
    speakerGain.gain.value = 0;

    const SPEAKER_VOLUMES: Record<typeof mode, number> = {
      "playing-speaker": 1,
      "preparing-to-record": 0,
      "countdown-to-record": 1,
      "recording-playback": config.speak.loopingRecordingVolumes?.baseLoopVolume ?? 0.1, // Lower base loop volume for review
      recording: 0.5,
      idle: 1,
      loading: 0,
      "processing-recording": 0,
    };

    const RECORDED_VOLUMES: Record<typeof mode, number> = {
      "playing-speaker": 0,
      "preparing-to-record": 0,
      "countdown-to-record": 0,
      "recording-playback": config.speak.loopingRecordingVolumes?.userRecordingVolume ?? 1.8, // Higher user recording volume for review
      recording: 0,
      idle: 0,
      loading: 0,
      "processing-recording": 0,
    };

    const finalSpeakerVolume = SPEAKER_VOLUMES[newMode || mode];
    const finalRecordedVolume = RECORDED_VOLUMES[newMode || mode];
    const fadeDuration = 0.3;

    // Set up effects chain for both playing-speaker and recording-playback modes
    console.log('[start] Setting up effects for mode:', newMode || mode);
    const effectsChain = setupPlaybackEffects();
    console.log('[start] Effects chain created:', !!effectsChain);
    console.log('[start] Playback effects current:', playbackEffects.current);
    console.log('[start] Dry gain exists:', !!playbackEffects.current?.dryGain);
    console.log('[start] Effects send exists:', !!playbackEffects.current?.effectsSend);
    console.log('[start] Dry gain node:', playbackEffects.current?.dryGain);
    console.log('[start] Effects send node:', playbackEffects.current?.effectsSend);
    
    // Create a mixer for combining sing-along loop and recorded audio
    const mixerGain = audioContext.current.createGain();
    
    // Connect sing-along loop to mixer
    speakerSource.current.connect(speakerGain);
    speakerGain.connect(mixerGain);
    
    // Connect mixer to effects chain or directly to destination
    if (effectsChain) {
      console.log('[start] Connecting mixer to effects chain');
      console.log('[start] Dry gain node:', playbackEffects.current.dryGain);
      console.log('[start] Effects send node:', playbackEffects.current.effectsSend);
      
      // Check if nodes are still valid (not cleaned up)
      if (playbackEffects.current.dryGain && playbackEffects.current.effectsSend) {
        // Connect to both dry and wet paths (like Roundware framework)
        mixerGain.connect(playbackEffects.current.dryGain);
        mixerGain.connect(playbackEffects.current.effectsSend);
        console.log('[start] Connected to both dry and wet paths');
      } else {
        console.error('[start] Effects nodes are null! This suggests cleanup was called. Connecting directly to destination');
        mixerGain.connect(audioContext.current.destination);
      }
    } else {
      console.log('[start] Connecting mixer directly to destination (no effects)');
      mixerGain.connect(audioContext.current.destination);
    }

    speakerSource.current.loop = true;

    if (recordedAudioBlob) {
      recordedAudioSource.current = audioContext.current.createBufferSource();
      const blob = await recordedAudioBlob.arrayBuffer();

      try {
        const buffer = await audioContext.current.decodeAudioData(blob);
        
        if (!recordedAudioSource.current) return;
        if (!speakerAudioBuffer.current) return;

        console.table({
          "speakerAudioBuffer.current.duration":
            speakerAudioBuffer.current.duration,
          "adjustedBuffer.duration": buffer.duration,
        });

        recordedAudioSource.current.buffer = buffer;
        recordedAudioSource.current.loop = true;

        // gain
        const recorderGain = audioContext.current.createGain();
        recorderGain.gain.value = 0;
        recordedAudioSource.current.connect(recorderGain);
        recorderGain.connect(mixerGain); // Connect to the same mixer

        calculateNextPoint();
        recordedAudioSource.current.start();

        recorderGain.gain.linearRampToValueAtTime(
          finalRecordedVolume,
          audioContext.current.currentTime + fadeDuration
        );

        if (!speakerSource.current) {
          throw new Error("speakerSource.current is null");
        }
        speakerSource.current.start();
        console.log({
          speakerDuration: speakerAudioBuffer.current.duration,
          recordedDuration: buffer.duration,
        });
        startedAtTime.current = Date.now();
        setMode("recording-playback");
      } catch (error) {
        console.error("Error decoding recorded audio data:", error);
        // Fall back to just playing the speaker audio without the recording
        recordedAudioSource.current = null;
        calculateNextPoint();
        speakerSource.current.start();
        startedAtTime.current = Date.now();
      }
          } else {
        recordedAudioSource.current = null;
        calculateNextPoint();
        speakerSource.current.start();
        startedAtTime.current = Date.now();
      }

    speakerGain.gain.linearRampToValueAtTime(
      finalSpeakerVolume,
      audioContext.current.currentTime + fadeDuration
    );
  }

  function stop() {
    console.log('[stop] Stopping loop...');
    if (interval.current) {
      // @ts-ignore
      clearInterval(interval.current);
    }
    if (speakerSource.current) {
      speakerSource.current.stop();
      speakerSource.current.disconnect();
    }
    if (recordedAudioSource.current) {
      recordedAudioSource.current.stop();
      recordedAudioSource.current.disconnect();
      recordedAudioSource.current = null;
    }
    cleanupPlaybackEffects();
  }

  // Comprehensive cleanup function for when leaving the recording session
  const cleanupAllAudioResources = () => {
    console.log("🧹 Cleaning up all audio resources");
    
    // Stop all audio playback
    stop();
    
    // Clear any pending timers
    if (interval.current) {
      // @ts-ignore
      clearInterval(interval.current);
      interval.current = null;
    }
    
    // Reset state
    setMode("idle");
    setIsStarted(false);
    setIsLoading(false);
    startedAtTime.current = null;
    nextLoopPointAt.current = null;
    
    // Clear audio buffers (optional - they might be needed if user returns)
    // speakerAudioBuffer.current = null;
    // speakerAudioBufferWithClick.current = null;
    // speakerAudioBufferWithoutClick.current = null;
    
    console.log("✅ All audio resources cleaned up");
  };

  useEffect(() => {
    return () => {
      stop();
    };
  }, []);

  return {
    isLoading,
    setIsLoading,
    isStarted,
    mode,
    setMode,
    start,
    stop,
    cleanupAllAudioResources,
    setSpeakerBuffers,
    nextLoopPointAt,
    speakerAudioBuffer,
    audioContext,
    startedAtTime,
  };
};
