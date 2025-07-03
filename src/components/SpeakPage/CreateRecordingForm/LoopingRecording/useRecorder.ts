import { useRef, useState } from "react";
import { useLoop } from "./useLoop";
import { createBlobFromAudioBuffer, trimAudioBuffer } from "@/utils/index";
import config from "@/config";

export const useRecorder = ({
  duration,
  loop,
}: {
  duration?: number;
  loop: ReturnType<typeof useLoop>;
}) => {
  const mediaRecorder = useRef<MediaRecorder | null>(null);

  const audioChunk = useRef<Blob>();

  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);

  const [isPermissionDenied, setIsPermissionDenied] = useState(false);

  const [recorderStream, setRecorderStream] = useState<MediaStream>();

  const [startingRecordingInSeconds, setStartingRecordingInSeconds] =
    useState<number>(0);
  const [startingRecordingInBeats, setStartingRecordingInBeats] =
    useState<number>(0);
  const countdownEndTime = useRef<number | null>(null);
  const countdownCleanupTimeout = useRef<NodeJS.Timeout>();

  // just for checking permission start a small recording and stop it
  const checkMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      stream.getTracks().forEach((track) => {
        track.stop();
        console.debug(track.readyState);
      });

      return true;
    } catch (error) {
      console.error("Microphone permission denied:", error);
      setIsPermissionDenied(true);
      return false;
    }
  };

  // schedule recording to start from next loop point in timer
  const scheduleRecording = async () => {
    const hasPermission = await checkMicrophonePermission();
    if (!hasPermission) return;
    if (typeof duration !== "number") return;

    loop.setMode("waiting-to-record");
    setRecordedAudioBlob(null);

    console.debug(
      "Scheduling recording",
      loop.nextLoopPointAt.current,
      Date.now()
    );

    const startingInSeconds =
      ((loop.nextLoopPointAt.current ?? 0) - Date.now()) / 1000;
    setStartingRecordingInSeconds(startingInSeconds);
    
    // Calculate musical beats countdown
    const beatsPerLoop = config.speak.beatsPerLoop;
    const beatInterval = duration / beatsPerLoop; // duration of one beat in seconds
    const startingInBeats = Math.ceil(startingInSeconds / beatInterval);
    setStartingRecordingInBeats(startingInBeats);
    
    console.debug("Starting recording in", startingInSeconds + "s", `(${startingInBeats} beats)`);
    console.debug("Beat interval:", beatInterval + "s");

        setTimeout(() => {
      startRecording();
    }, startingInSeconds * 1000);

    // Store when countdown should end, but don't use frequent intervals
    countdownEndTime.current = Date.now() + (startingInSeconds * 1000);
    
    // Set a single timeout to clear the countdown when recording starts
    countdownCleanupTimeout.current = setTimeout(() => {
      setStartingRecordingInBeats(0);
      setStartingRecordingInSeconds(0);
      countdownEndTime.current = null;
    }, startingInSeconds * 1000);
  };

  const isStopped = useRef(false);
  const startRecording = async () => {
    try {
      setRecordedAudioBlob(null);
      audioChunk.current = undefined;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
        },
      });

      setRecorderStream(stream);

      mediaRecorder.current = new MediaRecorder(stream);

      mediaRecorder.current.ondataavailable = async (event) => {
        if (audioChunk.current) return;
        if (isStopped.current) return;
        stopRecording();

        audioChunk.current = event.data;

        const audioBuffer = await loop.audioContext.current.decodeAudioData(
          await new Blob([event.data], { type: "audio/wav" }).arrayBuffer()
        );

        if (!audioBuffer || !duration)
          throw new Error("Something went wrong while decoding audio data");

        console.log("Speaker Duration:", duration);
        console.log("Recorded Duration:", audioBuffer.duration);

        let adjustedBuffer = audioBuffer;

        if (adjustedBuffer.duration > duration) {
          const difference = adjustedBuffer.duration - duration;
          // 5% from start, rest from end
          adjustedBuffer = trimAudioBuffer(
            audioBuffer,
            difference * (10 / 100),
            audioBuffer.duration - difference * (90 / 100),
            loop.audioContext.current
          );
          console.log("Trimmed audio buffer:", adjustedBuffer);
          isStopped.current = true;
        } else {
          console.debug(
            "Audio buffer is too short than original speaker duration. PC might be too fast!",
            audioBuffer.duration
          );

          return;
        }

        const audioBlob = createBlobFromAudioBuffer(adjustedBuffer);

        setRecordedAudioBlob(audioBlob);
        loop.stop();
        loop.start("recording-playback", audioBlob);
      };

      mediaRecorder.current.onstop = () => {
        // stop
        stream.getTracks().forEach((track) => {
          track.stop();
        });
      };

      mediaRecorder.current.onstart = () => {
        console.debug("Recording started");

        loop.start("recording");

        if (!duration) return;
      };

      loop.stop();

      // extra 500ms for any other processing!
      const totalDuration = duration ? duration * 1000 + 500 : undefined;
      isStopped.current = false;
      mediaRecorder.current.start(totalDuration);
    } catch (error) {
      console.error("Error starting recording:", error);
      setIsPermissionDenied(true);
      loop.stop();
    }
  };

  const stopRecording = () => {
    // Clear countdown timeout if it's still running
    if (countdownCleanupTimeout.current) {
      clearTimeout(countdownCleanupTimeout.current);
      countdownCleanupTimeout.current = undefined;
    }
    countdownEndTime.current = null;
    
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
      console.debug("Recording stopped");
    }
  };

  return {
    recordedAudioBlob,
    isPermissionDenied,
    setIsPermissionDenied,
    scheduleRecording,
    stopRecording,
    checkMicrophonePermission,
    startingRecordingInSeconds,
    startingRecordingInBeats,
    countdownEndTime,
    recorderStream,
  };
};
