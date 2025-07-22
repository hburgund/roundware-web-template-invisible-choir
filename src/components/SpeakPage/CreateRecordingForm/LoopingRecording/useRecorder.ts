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

  // Check microphone permission status using the proper API
  const checkMicrophonePermission = async () => {
    try {
      // First check if we already have permission
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
      
      if (permissionStatus.state === 'granted') {
        // Permission already granted - no need to request again
        console.log('Microphone permission already granted');
        return true;
      } else if (permissionStatus.state === 'denied') {
        // Permission denied - show error
        console.error("Microphone permission denied");
        setIsPermissionDenied(true);
        return false;
      } else {
        // Permission not determined yet - request it
        console.log('Microphone permission not determined, requesting access');
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
      }
    } catch (error) {
      // Fallback for browsers that don't support permissions API or other errors
      console.log('Permissions API not supported or error occurred, falling back to getUserMedia');
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
      } catch (getUserMediaError) {
        console.error("Microphone permission denied:", getUserMediaError);
        setIsPermissionDenied(true);
        return false;
      }
    }
  };

  // Start the discrete recording process
  const startRecordingProcess = async () => {
    if (typeof duration !== "number") return;

    console.debug("Starting discrete recording process");

    // Step 1: Stop current playback and show "Preparing to record..."
    loop.stop();
    loop.setMode("preparing-to-record");
    setRecordedAudioBlob(null);

    // Step 2: Pre-initialize MediaRecorder during preparation
    const preInitializeRecorder = async () => {
      try {
        console.debug("🎯 TIMING: Starting pre-initialization at", Date.now());
        
        // Check if we already have microphone permission
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
        
        if (permissionStatus.state === 'granted') {
          // Permission already granted - proceed with getUserMedia
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
        } else if (permissionStatus.state === 'denied') {
          // Permission denied - don't try to get user media
          console.error("Microphone permission denied during pre-initialization");
          setIsPermissionDenied(true);
        } else {
          // Permission not determined - this shouldn't happen if checkMicrophonePermission was called first
          console.warn("Microphone permission not determined during pre-initialization");
          setIsPermissionDenied(true);
        }
        
      } catch (error) {
        // Fallback for browsers that don't support permissions API
        console.log('Permissions API not supported during pre-initialization, falling back to getUserMedia');
        try {
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
        } catch (getUserMediaError) {
          console.error("Error pre-initializing recorder:", getUserMediaError);
          setIsPermissionDenied(true);
        }
      }
    };
    
    // Start pre-initialization immediately
    preInitializeRecorder();

    // Step 3: After a short delay, start the 4-beat countdown (no audio)
    setTimeout(() => {
      loop.setMode("countdown-to-record");
      // Don't start audio playback during countdown - just show the visual countdown
    }, 2000); // 2 seconds of "Preparing to record..."
  };

  // Start recording after countdown completes
  const startRecordingAfterCountdown = async () => {
    console.debug("Countdown completed, starting recording");
    
    // Stop the countdown playback
    loop.stop();
    
    // Start the actual recording
    await startRecording();
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
        
        // Check permission before requesting getUserMedia
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
          
          if (permissionStatus.state === 'granted') {
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
          } else {
            console.error("Microphone permission denied during startRecording fallback");
            setIsPermissionDenied(true);
            return;
          }
        } catch (error) {
          // Fallback for browsers that don't support permissions API
          console.log('Permissions API not supported during startRecording fallback, using getUserMedia directly');
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
      }

      mediaRecorder.current.ondataavailable = async (event) => {
        console.debug("🎯 END TIMING: ondataavailable event fired at", Date.now());
        
        if (audioChunk.current) return;
        if (isStopped.current) return;
        
        console.debug("🎯 END TIMING: About to call stopRecording() at", Date.now());
        stopRecording();
        console.debug("🎯 END TIMING: stopRecording() completed at", Date.now());

        audioChunk.current = event.data;

        console.debug("🎯 END TIMING: About to create blob for decoding at", Date.now());
        const blobForDecoding = new Blob([event.data], { type: "audio/wav" });
        const arrayBuffer = await blobForDecoding.arrayBuffer();
        console.debug("🎯 END TIMING: Blob and arrayBuffer created at", Date.now());

        console.debug("🎯 END TIMING: About to start audio decoding at", Date.now());
        const audioBuffer = await loop.audioContext.current.decodeAudioData(arrayBuffer);
        console.debug("🎯 END TIMING: Audio decoding completed at", Date.now());

        if (!audioBuffer || !duration)
          throw new Error("Something went wrong while decoding audio data");

        console.log("Speaker Duration:", duration);
        console.log("Recorded Duration:", audioBuffer.duration);

        let adjustedBuffer = audioBuffer;

        if (adjustedBuffer.duration > duration) {
          console.debug("🎯 END TIMING: About to start audio trimming at", Date.now());
          const difference = adjustedBuffer.duration - duration;
          // 5% from start, rest from end
          adjustedBuffer = trimAudioBuffer(
            audioBuffer,
            difference * (10 / 100),
            audioBuffer.duration - difference * (90 / 100),
            loop.audioContext.current
          );
          console.debug("🎯 END TIMING: Audio trimming completed at", Date.now());
          console.log("Trimmed audio buffer:", adjustedBuffer);
          isStopped.current = true;
        } else {
          console.debug(
            "Audio buffer is too short than original speaker duration. PC might be too fast!",
            audioBuffer.duration
          );

          return;
        }

        console.debug("🎯 END TIMING: About to create final audio blob at", Date.now());
        const audioBlob = createBlobFromAudioBuffer(adjustedBuffer);
        console.debug("🎯 END TIMING: Final audio blob created at", Date.now());

        // Show processing state (loop is already stopped at exact loop point)
        console.debug("🎯 END TIMING: Setting processing mode at", Date.now());
        loop.setMode("processing-recording");
        
        // Process the recording with a delay to show the processing state
        setTimeout(() => {
          console.debug("🎯 END TIMING: About to start playback loop at", Date.now());
          loop.start("recording-playback", audioBlob);
          console.debug("🎯 END TIMING: Playback loop started at", Date.now());
          
          // Defer expensive React state update until after audio starts playing
          console.debug("🎯 END TIMING: About to set recorded audio blob (deferred) at", Date.now());
          setTimeout(() => {
            setRecordedAudioBlob(audioBlob);
            console.debug("🎯 END TIMING: setRecordedAudioBlob() completed (deferred) at", Date.now());
          }, 0);
        }, 1500); // Show processing for 1.5 seconds
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
      
      // Schedule the base loop to stop exactly when recording should end (not when MediaRecorder stops)
      if (duration) {
        setTimeout(() => {
          console.debug("🎯 TIMING: Stopping base loop at exact loop point at", Date.now());
          loop.stop();
        }, duration * 1000);
      }
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
    console.debug("🎯 END TIMING: stopRecording() called at", Date.now());
    
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
      console.debug("🎯 END TIMING: About to call mediaRecorder.stop() at", Date.now());
      mediaRecorder.current.stop();
      console.debug("🎯 END TIMING: mediaRecorder.stop() called at", Date.now());
      console.debug("Recording stopped");
    }
  };

  return {
    recordedAudioBlob,
    isPermissionDenied,
    setIsPermissionDenied,
    startRecordingProcess,
    startRecordingAfterCountdown,
    stopRecording,
    checkMicrophonePermission,
    startingRecordingInSeconds,
    startingRecordingInBeats,
    countdownEndTime,
    recorderStream,
  };
};
