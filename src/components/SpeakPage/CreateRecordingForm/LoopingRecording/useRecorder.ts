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
  const preInitializedStream = useRef<MediaStream | null>(null);
  const preInitializedRecorder = useRef<MediaRecorder | null>(null);

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
    // Permission is already checked when user clicks "Continue" in JoinChoir component
    // No need to check again here - it only causes audio disruption
    
    if (typeof duration !== "number") return;

    console.debug(
      "Scheduling recording",
      loop.nextLoopPointAt.current,
      Date.now()
    );

    const startingInSeconds =
      ((loop.nextLoopPointAt.current ?? 0) - Date.now()) / 1000;
    
    // Calculate musical beats countdown
    const beatsPerLoop = config.speak.beatsPerLoop;
    const beatInterval = duration / beatsPerLoop; // duration of one beat in seconds
    const startingInBeats = Math.ceil(startingInSeconds / beatInterval);
    
    console.debug("Starting recording in", startingInSeconds + "s", `(${startingInBeats} beats)`);
    console.debug("Beat interval:", beatInterval + "s");

    // Defer UI updates to avoid audio interference during critical button press moment
    requestAnimationFrame(() => {
      loop.setMode("waiting-to-record");
      setRecordedAudioBlob(null);
      setStartingRecordingInSeconds(startingInSeconds);
      setStartingRecordingInBeats(startingInBeats);
      
      // Store when countdown should end
      countdownEndTime.current = Date.now() + (startingInSeconds * 1000);
    });

    // Pre-initialize MediaRecorder during countdown to eliminate delay at recording time
    const preInitializeRecorder = async () => {
      try {
        console.debug("🎯 TIMING: Starting pre-initialization at", Date.now());
        
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
          },
        });
        console.debug("🎯 TIMING: Pre-initialization getUserMedia completed at", Date.now());
        
        const recorder = new MediaRecorder(stream);
        console.debug("🎯 TIMING: Pre-initialization MediaRecorder created at", Date.now());
        
        preInitializedStream.current = stream;
        preInitializedRecorder.current = recorder;
        
      } catch (error) {
        console.error("Error pre-initializing recorder:", error);
        setIsPermissionDenied(true);
      }
    };
    
    // Start pre-initialization immediately (don't wait for requestAnimationFrame)
    preInitializeRecorder();

    setTimeout(() => {
      console.debug("🎯 TIMING: startRecording timeout fired at", Date.now());
      startRecording();
    }, startingInSeconds * 1000);
    
    // Set a single timeout to clear the countdown when recording starts
    countdownCleanupTimeout.current = setTimeout(() => {
      console.debug("🎯 TIMING: Countdown cleanup timeout fired at", Date.now());
      setStartingRecordingInBeats(0);
      setStartingRecordingInSeconds(0);
      countdownEndTime.current = null;
    }, startingInSeconds * 1000);
  };

  const isStopped = useRef(false);
  const startRecording = async () => {
    const startTime = Date.now();
    console.debug("🎯 TIMING: startRecording() called at", startTime);
    
    try {
      setRecordedAudioBlob(null);
      audioChunk.current = undefined;

      // Use pre-initialized recorder if available, otherwise fall back to old method
      if (preInitializedRecorder.current && preInitializedStream.current) {
        console.debug("🎯 TIMING: Using pre-initialized recorder at", Date.now());
        mediaRecorder.current = preInitializedRecorder.current;
        setRecorderStream(preInitializedStream.current);
        
        // Clear the pre-initialized refs so they can't be reused
        preInitializedRecorder.current = null;
        preInitializedStream.current = null;
      } else {
        console.debug("🎯 TIMING: Pre-initialized recorder not available, falling back to old method at", Date.now());
        console.debug("🎯 TIMING: About to request getUserMedia at", Date.now());
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
          },
        });
        console.debug("🎯 TIMING: getUserMedia completed at", Date.now());

        setRecorderStream(stream);

        console.debug("🎯 TIMING: Creating MediaRecorder at", Date.now());
        mediaRecorder.current = new MediaRecorder(stream);
      }

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
        if (mediaRecorder.current?.stream) {
          mediaRecorder.current.stream.getTracks().forEach((track: MediaStreamTrack) => {
            track.stop();
          });
        }
      };

      mediaRecorder.current.onstart = () => {
        console.debug("🎯 TIMING: MediaRecorder onstart fired at", Date.now());
        console.debug("Recording started");

        console.debug("🎯 TIMING: About to call loop.start('recording') at", Date.now());
        loop.start("recording");
        console.debug("🎯 TIMING: loop.start('recording') completed at", Date.now());

        if (!duration) return;
      };

      console.debug("🎯 TIMING: About to call loop.stop() at", Date.now());
      loop.stop();
      console.debug("🎯 TIMING: loop.stop() completed at", Date.now());

      // extra 500ms for any other processing!
      const totalDuration = duration ? duration * 1000 + 500 : undefined;
      isStopped.current = false;
      console.debug("🎯 TIMING: About to call mediaRecorder.start() at", Date.now());
      mediaRecorder.current.start(totalDuration);
      console.debug("🎯 TIMING: mediaRecorder.start() call completed at", Date.now());
    } catch (error) {
      console.error("Error starting recording:", error);
      setIsPermissionDenied(true);
      
      // Clean up pre-initialized resources on error
      if (preInitializedStream.current) {
        preInitializedStream.current.getTracks().forEach((track) => {
          track.stop();
        });
        preInitializedStream.current = null;
      }
      if (preInitializedRecorder.current) {
        preInitializedRecorder.current = null;
      }
      
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
    
    // Clean up pre-initialized resources if they weren't used
    if (preInitializedStream.current) {
      preInitializedStream.current.getTracks().forEach((track) => {
        track.stop();
      });
      preInitializedStream.current = null;
    }
    if (preInitializedRecorder.current) {
      preInitializedRecorder.current = null;
    }
    
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
