import { useEffect, useRef, useState } from "react";

export const useLoop = () => {
  const audioContext = useRef(new AudioContext());

  const [isLoading, setIsLoading] = useState(true);
  const [isStarted, setIsStarted] = useState(false);

  const speakerAudioBuffer = useRef<AudioBuffer | null>(null);
  const speakerAudioBufferWithClick = useRef<AudioBuffer | null>(null);
  const speakerAudioBufferWithoutClick = useRef<AudioBuffer | null>(null);
  const speakerSource = useRef<AudioBufferSourceNode | null>(null);
  const recordedAudioSource = useRef<AudioBufferSourceNode | null>(null);

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
    speakerAudioBufferWithClick.current = withClick;
    speakerAudioBufferWithoutClick.current = withoutClick;
    // Default to the version with click for backward compatibility
    speakerAudioBuffer.current = withClick;
  };

  const getSpeakerBufferForMode = (currentMode: typeof mode) => {
    // Use version without click for playback modes
    if (currentMode === "recording-playback") {
      return speakerAudioBufferWithoutClick.current || speakerAudioBuffer.current;
    }
    // Use version with click for recording modes
    return speakerAudioBufferWithClick.current || speakerAudioBuffer.current;
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
      "recording-playback": 0.1, // Lower base loop volume for review
      recording: 0.5,
      idle: 1,
      loading: 0,
      "processing-recording": 0,
    };

    const RECORDED_VOLUMES: Record<typeof mode, number> = {
      "playing-speaker": 0,
      "preparing-to-record": 0,
      "countdown-to-record": 0,
      "recording-playback": 1.8, // Higher user recording volume for review
      recording: 0,
      idle: 0,
      loading: 0,
      "processing-recording": 0,
    };

    const finalSpeakerVolume = SPEAKER_VOLUMES[newMode || mode];
    const finalRecordedVolume = RECORDED_VOLUMES[newMode || mode];
    const fadeDuration = 0.3;

    speakerSource.current.connect(speakerGain);
    speakerGain.connect(audioContext.current.destination);

    speakerSource.current.loop = true;

    if (recordedAudioBlob) {
      recordedAudioSource.current = audioContext.current.createBufferSource();
      const blob = await recordedAudioBlob.arrayBuffer();

      audioContext.current.decodeAudioData(blob, (buffer) => {
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
        recorderGain.connect(audioContext.current.destination);

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
      });
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
