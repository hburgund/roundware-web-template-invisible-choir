import { useEffect, useRef, useState } from "react";

export const useLoop = () => {
  const audioContext = useRef(new AudioContext());

  const [isLoading, setIsLoading] = useState(true);
  const [isStarted, setIsStarted] = useState(false);

  const speakerAudioBuffer = useRef<AudioBuffer | null>(null);
  const speakerSource = useRef<AudioBufferSourceNode | null>(null);
  const recordedAudioSource = useRef<AudioBufferSourceNode | null>(null);

  const startedAtTime = useRef<number | null>(null);

  const [mode, setMode] = useState<
    | "idle"
    | "playing-speaker"
    | "waiting-to-record"
    | "recording"
    | "recording-playback"
    | "loading"
  >("idle");

  const interval = useRef<NodeJS.Timer | null>(null);

  const nextLoopPointAt = useRef<number | null>(null);

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
    const startTime = Date.now();
    console.debug("🎯 TIMING: loop.start() called at", startTime, "with mode:", newMode);
    console.debug("start", newMode, recordedAudioBlob);
    
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

    console.debug("🎯 TIMING: About to resume AudioContext at", Date.now());
    await audioContext.current.resume();
    console.debug("🎯 TIMING: AudioContext resumed at", Date.now());

    console.debug("Starting loop");
    setIsStarted(true);

    console.debug("🎯 TIMING: Creating new audio sources at", Date.now());
    speakerSource.current = audioContext.current.createBufferSource();
    speakerSource.current.buffer = speakerAudioBuffer.current;
    const speakerGain = audioContext.current.createGain();

    // speaker gain to 0.5 if there is a recorded audio blob
    speakerGain.gain.value = 0;

    const SPEAKER_VOLUMES: Record<typeof mode, number> = {
      "playing-speaker": 1,
      "waiting-to-record": 1,
      "recording-playback": 0.5,
      recording: 0.5,
      idle: 1,
      loading: 0,
    };

    const finalSpeakerVolume = SPEAKER_VOLUMES[newMode || mode];
    console.debug("finalSpeakerVolume", finalSpeakerVolume, newMode);
    const fadeDuration = 0.3;

    speakerSource.current.connect(speakerGain);
    speakerGain.connect(audioContext.current.destination);

    speakerSource.current.loop = true;

    if (recordedAudioBlob) {
      console.debug("Starting loop with recordedAudioBlob");
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
          finalSpeakerVolume,
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
      console.debug("🎯 TIMING: About to calculate next point at", Date.now());
      calculateNextPoint();
      console.debug("🎯 TIMING: About to start speaker source at", Date.now());
      speakerSource.current.start();
      startedAtTime.current = Date.now();
      console.debug("🎯 TIMING: Speaker source started at", Date.now());
      console.debug("speakerSource.current.start()");
    }

    speakerGain.gain.linearRampToValueAtTime(
      finalSpeakerVolume,
      audioContext.current.currentTime + fadeDuration
    );
    
    console.debug("🎯 TIMING: loop.start() completed at", Date.now());
  }

  function stop() {
    const stopTime = Date.now();
    console.debug("🎯 TIMING: loop.stop() called at", stopTime);
    
    if (interval.current) {
      // @ts-ignore
      clearInterval(interval.current);
      console.debug("🎯 TIMING: Cleared loop interval at", Date.now());
    }
    if (speakerSource.current) {
      console.debug("🎯 TIMING: About to stop speaker source at", Date.now());
      speakerSource.current.stop();
      speakerSource.current.disconnect();
      console.debug("🎯 TIMING: Speaker source stopped at", Date.now());
    }
    if (recordedAudioSource.current) {
      console.debug("🎯 TIMING: About to stop recorded source at", Date.now());
      recordedAudioSource.current.stop();
      recordedAudioSource.current.disconnect();
      recordedAudioSource.current = null;
      console.debug("🎯 TIMING: Recorded source stopped at", Date.now());
    }
    console.debug("🎯 TIMING: loop.stop() completed at", Date.now());
  }

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
    nextLoopPointAt,
    speakerAudioBuffer,
    audioContext,
    startedAtTime,
  };
};
