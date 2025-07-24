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
  const [isAudioDeviceMissing, setIsAudioDeviceMissing] = useState(false);

  const [recorderStream, setRecorderStream] = useState<MediaStream>();

  const [startingRecordingInSeconds, setStartingRecordingInSeconds] =
    useState<number>(0);
  const [startingRecordingInBeats, setStartingRecordingInBeats] =
    useState<number>(0);
  const countdownEndTime = useRef<number | null>(null);
  const countdownCleanupTimeout = useRef<NodeJS.Timeout>();
  const preInitializedStream = useRef<MediaStream | null>(null);
  const preInitializedRecorder = useRef<MediaRecorder | null>(null);

  // Check if device has audio capabilities
  const checkAudioDeviceCapabilities = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasMicrophone = devices.some(device => device.kind === 'audioinput');
      const hasSpeakers = devices.some(device => device.kind === 'audiooutput');
      
      if (!hasMicrophone || !hasSpeakers) {
        setIsAudioDeviceMissing(true);
        return false;
      }
      
      return true;
    } catch (error) {
      setIsAudioDeviceMissing(true);
      return false;
    }
  };

  // Check microphone permission status using the proper API
  const checkMicrophonePermission = async () => {
    
    // First check if device has audio capabilities
    const hasAudioCapabilities = await checkAudioDeviceCapabilities();
    if (!hasAudioCapabilities) {
      return false;
    }

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

    // Step 1: Stop current playback and show "Preparing to record..."
    loop.stop();
    loop.setMode("preparing-to-record");
    setRecordedAudioBlob(null);

    // Step 2: Pre-initialize MediaRecorder during preparation (after audio is loaded)
    const preInitializeRecorder = async () => {
      try {
        console.debug("🎯 TIMING: Starting pre-initialization at", Date.now());
        
        // Permission should already be granted from JoinChoir screen
        // Just get the stream directly without permission checks
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
          },
        });
        console.debug("🎯 TIMING: Pre-initialization getUserMedia completed at", Date.now());
        
        const recorder = new MediaRecorder(stream);
        console.debug("🎯 TIMING: Pre-initialization MediaRecorder created at", Date.now());
        
        // Store the pre-initialized resources
        preInitializedStream.current = stream;
        preInitializedRecorder.current = recorder;
        console.debug("🎯 TIMING: Pre-initialization completed successfully at", Date.now());
        
      } catch (error) {
        console.error("Error pre-initializing recorder:", error);
        setIsPermissionDenied(true);
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

      // Use pre-initialized recorder if available, otherwise create new one
      if (preInitializedRecorder.current && preInitializedStream.current) {
        console.debug("🎯 TIMING: Using pre-initialized recorder at", Date.now());
        mediaRecorder.current = preInitializedRecorder.current;
        setRecorderStream(preInitializedStream.current);
        
        // Clear the pre-initialized refs so they can't be reused
        preInitializedRecorder.current = null;
        preInitializedStream.current = null;
      } else {
        console.debug("🎯 TIMING: Pre-initialized recorder not available, creating new one at", Date.now());
        
        // Request microphone permission and create MediaRecorder
        console.debug("🎯 TIMING: Requesting microphone permission at", Date.now());
        
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
          
          if (permissionStatus.state === 'granted') {
            console.debug("🎯 TIMING: Permission already granted, requesting getUserMedia at", Date.now());
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: false,
              },
            });
            console.debug("🎯 TIMING: getUserMedia completed at", Date.now());

            setRecorderStream(stream);

            console.debug("🎯 TIMING: Creating MediaRecorder at", Date.now());
            mediaRecorder.current = new MediaRecorder(stream);
          } else if (permissionStatus.state === 'denied') {
            console.error("Microphone permission denied");
            setIsPermissionDenied(true);
            return;
          } else {
            // Permission not determined - request it
            console.debug("🎯 TIMING: Permission not determined, requesting getUserMedia at", Date.now());
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
        } catch (error) {
          // Fallback for browsers that don't support permissions API
          console.log('Permissions API not supported, using getUserMedia directly');
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
      
      // Check if this is an audio device issue
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('notfound') || 
            errorMessage.includes('not supported') || 
            errorMessage.includes('not allowed') ||
            errorMessage.includes('permission denied')) {
          // This might be an audio device issue, check capabilities
          const hasAudioCapabilities = await checkAudioDeviceCapabilities();
          if (!hasAudioCapabilities) {
            // Audio device issue - don't set permission denied
            return;
          }
        }
      }
      
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

  // Comprehensive cleanup function for when leaving the recording session
  const cleanupAllRecordingResources = () => {
    console.log("🧹 Cleaning up all recording resources");
    
    // Stop any ongoing recording
    stopRecording();
    
    // Clear any recorded audio blob
    setRecordedAudioBlob(null);
    
    // Stop and clean up any active recorder stream
    if (recorderStream) {
      recorderStream.getTracks().forEach((track) => {
        track.stop();
        console.log("🎤 Stopped recorder stream track:", track.kind);
      });
      setRecorderStream(undefined);
    }
    
    // Clean up pre-initialized resources
    if (preInitializedStream.current) {
      preInitializedStream.current.getTracks().forEach((track) => {
        track.stop();
        console.log("🎤 Stopped pre-initialized stream track:", track.kind);
      });
      preInitializedStream.current = null;
    }
    if (preInitializedRecorder.current) {
      preInitializedRecorder.current = null;
    }
    
    // Clear any pending timers
    if (countdownCleanupTimeout.current) {
      clearTimeout(countdownCleanupTimeout.current);
      countdownCleanupTimeout.current = undefined;
    }
    countdownEndTime.current = null;
    
    // Reset state
    setStartingRecordingInSeconds(0);
    setStartingRecordingInBeats(0);
    setIsPermissionDenied(false);
    
    console.log("✅ All recording resources cleaned up");
  };

  return {
    recordedAudioBlob,
    isPermissionDenied,
    setIsPermissionDenied,
    isAudioDeviceMissing,
    setIsAudioDeviceMissing,
    startRecordingProcess,
    startRecordingAfterCountdown,
    stopRecording,
    cleanupAllRecordingResources,
    checkMicrophonePermission,
    startingRecordingInSeconds,
    startingRecordingInBeats,
    countdownEndTime,
    recorderStream,
  };
};
