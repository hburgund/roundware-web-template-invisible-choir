import { Box, Typography } from "@mui/material";
import { useEffect, useState, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import config from "@/config";

interface BeatCountdownProps {
  onComplete: () => void;
  isVisible: boolean;
  duration?: number; // Loop duration in seconds
  audioContext: AudioContext; // Use the existing audio context from the main loop
  onClickTrackStarted?: () => void; // Optional callback for parent to forcibly stop click
}

// Expose a stopClickTrack method to parent via ref
const BeatCountdown = forwardRef(({ onComplete, isVisible, duration, audioContext, onClickTrackStarted }: BeatCountdownProps, ref) => {
  const [currentBeat, setCurrentBeat] = useState(4);
  const [progress, setProgress] = useState(0);
  const isActiveRef = useRef(false);
  const singleClickBufferRef = useRef<AudioBuffer | null>(null);

  const beatsPerLoop = config.speak.beatsPerLoop;
  const countdownBeats = 4; // Always 4 beats for countdown

  // Calculate beat interval based on loop duration and BPM (double-time for eighth notes)
  const beatInterval = duration ? (duration / beatsPerLoop) * 500 : 500; // Convert to milliseconds, half the time for eighth notes

  // Load single click sound
  const loadSingleClick = async (): Promise<AudioBuffer | null> => {
    if (!config.speak.clickTrack.enabled) {
      return null;
    }

    try {
      console.log('[BeatCountdown] Loading single click sound...');
      
      // Use import.meta.glob to get the processed URL from Vite
      const clickSingleModules = import.meta.glob('/src/assets/audio/click-single.wav', { eager: true });
      
      if (!clickSingleModules['/src/assets/audio/click-single.wav']) {
        console.error('[BeatCountdown] click-single.wav not found in assets');
        return null;
      }
      
      const url = (clickSingleModules['/src/assets/audio/click-single.wav'] as any).default;
      console.log('[BeatCountdown] Single click URL:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        console.error('[BeatCountdown] Failed to load click-single.wav:', response.status, response.statusText);
        return null;
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = await audioContext.decodeAudioData(arrayBuffer);
      console.log('[BeatCountdown] Single click loaded successfully, duration:', buffer.duration);
      return buffer;
    } catch (error) {
      console.error('[BeatCountdown] Error loading single click:', error);
      return null;
    }
  };

  // Play single click sound
  const playSingleClick = useCallback((clickBuffer: AudioBuffer) => {
    try {
      const source = audioContext.createBufferSource();
      const gainNode = audioContext.createGain();
      
      source.buffer = clickBuffer;
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      gainNode.gain.value = config.speak.clickTrack.volume;
      
      source.start();
      console.log('[BeatCountdown] Single click played');
    } catch (error) {
      console.error('[BeatCountdown] Error playing single click:', error);
    }
  }, [audioContext]);

  // Stop click track playback (for cleanup)
  const stopClickTrack = useCallback(() => {
    // No need to stop individual clicks as they're short sounds
    console.log('[BeatCountdown] Click track stopped');
  }, []);

  // Expose stopClickTrack to parent
  useImperativeHandle(ref, () => ({ stopClickTrack }), [stopClickTrack]);

  useEffect(() => {
    if (!isVisible || isActiveRef.current) return;
    isActiveRef.current = true;
    setCurrentBeat(countdownBeats);
    setProgress(0);
    let beatCount = countdownBeats;
    let cancelled = false;
    
    (async () => {
      // Resume context on user gesture
      if (audioContext.state !== 'running') {
        try {
          await audioContext.resume();
          console.log('[BeatCountdown] AudioContext resumed', audioContext.state);
        } catch (e) {
          console.warn('[BeatCountdown] Failed to resume AudioContext', e);
        }
      }
      
      // Load single click sound
      singleClickBufferRef.current = await loadSingleClick();
      if (cancelled) return;
      
      if (singleClickBufferRef.current) {
        console.log('[BeatCountdown] Single click loaded, countdown ready');
        
        // Play a test click to ensure audio is working
        console.log('[BeatCountdown] Playing test click...');
        playSingleClick(singleClickBufferRef.current);
        
        // Small delay to ensure audio is ready before starting countdown
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (onClickTrackStarted) onClickTrackStarted();
      } else {
        console.warn('[BeatCountdown] No single click available for countdown');
      }
    })();
    
    const beatTimer = setInterval(() => {
      beatCount--;
      setCurrentBeat(beatCount);
      
      // Play single click at each beat (4, 3, 2, 1, but not 0)
      if (beatCount > 0 && singleClickBufferRef.current) {
        playSingleClick(singleClickBufferRef.current);
      }
      
      if (beatCount <= 0) {
        clearInterval(beatTimer);
        onComplete();
        return;
      }
    }, beatInterval);
    
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + (100 / (countdownBeats * 10));
        return newProgress >= 100 ? 100 : newProgress;
      });
    }, beatInterval / 10);
    
    return () => {
      cancelled = true;
      clearInterval(beatTimer);
      clearInterval(progressInterval);
      isActiveRef.current = false;
      stopClickTrack();
    };
  }, [isVisible, onComplete, duration, audioContext, playSingleClick, stopClickTrack, onClickTrackStarted]);

  if (!isVisible) return null;

  return (
    <Box
      sx={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 3,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        sx={{
          width: 120,
          height: 120,
          borderRadius: "50%",
          border: "4px solid rgba(255, 255, 255, 0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          backgroundColor: "rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* Progress ring */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            background: `conic-gradient(
              from 0deg,
              rgba(255, 255, 255, 0.8) 0deg,
              rgba(255, 255, 255, 0.8) ${progress * 3.6}deg,
              transparent ${progress * 3.6}deg,
              transparent 360deg
            )`,
          }}
        />
        <Typography
          variant="h1"
          sx={{
            color: "white",
            fontWeight: "bold",
            fontSize: "3rem",
            textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
            zIndex: 2,
          }}
        >
          {currentBeat}
        </Typography>
      </Box>
      <Typography
        variant="body1"
        sx={{
          color: "white",
          marginTop: 2,
          textAlign: "center",
          textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
        }}
      >
        Get ready to record...
      </Typography>
    </Box>
  );
});

export default BeatCountdown; 