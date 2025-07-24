import { Box, Typography } from "@mui/material";
import { useEffect, useState, useRef } from "react";
import config from "@/config";

interface BeatCountdownProps {
  onComplete: () => void;
  isVisible: boolean;
  duration?: number; // Loop duration in seconds
}

const BeatCountdown = ({ onComplete, isVisible, duration }: BeatCountdownProps) => {
  const [currentBeat, setCurrentBeat] = useState(4);
  const [progress, setProgress] = useState(0);
  const isActiveRef = useRef(false);
  const clickSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const beatsPerLoop = config.speak.beatsPerLoop;
  const countdownBeats = 4; // Always 4 beats for countdown

  // Calculate beat interval based on loop duration and BPM (double-time for eighth notes)
  const beatInterval = duration ? (duration / beatsPerLoop) * 500 : 500; // Convert to milliseconds, half the time for eighth notes

  // Load click track buffer
  const loadClickTrack = async (): Promise<AudioBuffer | null> => {
    if (!config.speak.clickTrack.enabled || !duration) {
      return null;
    }

    try {
      // Import click track files
      const clickTrackModules = import.meta.glob('/src/assets/audio/*.wav', { eager: true });
      
      // Find click track file that matches the duration
      const tolerance = 0.2; // 200ms tolerance
      const clickFiles = Object.entries(clickTrackModules).map(([path, module]) => {
        const filename = path.split('/').pop()!;
        const url = (module as any).default || (module as any);
        return { filename, url };
      });

      for (const { filename, url } of clickFiles) {
        try {
          const response = await fetch(url);
          if (!response.ok) continue;
          
          const arrayBuffer = await response.arrayBuffer();
          const audioContext = new AudioContext();
          const buffer = await audioContext.decodeAudioData(arrayBuffer);
          
          // Check if this click file duration matches our target (within tolerance)
          if (Math.abs(buffer.duration - duration) <= tolerance) {
            return buffer;
          }
        } catch (error) {
          console.debug(`Error loading click track ${filename}:`, error);
        }
      }
    } catch (error) {
      console.error('Error loading click track:', error);
    }
    
    return null;
  };

  // Start click track playback
  const startClickTrack = (clickBuffer: AudioBuffer) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    
    const audioContext = audioContextRef.current;
    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();
    
    source.buffer = clickBuffer;
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Set volume based on config
    gainNode.gain.value = config.speak.clickTrack.volume;
    
    source.start();
    return source;
  };

  useEffect(() => {
    if (!isVisible || isActiveRef.current) return;

    isActiveRef.current = true;
    setCurrentBeat(countdownBeats);
    setProgress(0);

    let beatCount = countdownBeats;
    let clickBuffer: AudioBuffer | null = null;

    // Load and start click track
    loadClickTrack().then((buffer) => {
      if (buffer) {
        clickBuffer = buffer;
        clickSourceRef.current = startClickTrack(buffer);
      }
    });

    const beatTimer = setInterval(() => {
      beatCount--;
      setCurrentBeat(beatCount);
      
      if (beatCount <= 0) {
        clearInterval(beatTimer);
        onComplete();
        return;
      }
    }, beatInterval);

    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + (100 / (countdownBeats * 10)); // 10 updates per beat
        return newProgress >= 100 ? 100 : newProgress;
      });
    }, beatInterval / 10);

    return () => {
      clearInterval(beatTimer);
      clearInterval(progressInterval);
      isActiveRef.current = false;
      
      // Stop click track playback
      if (clickSourceRef.current) {
        try {
          clickSourceRef.current.stop();
        } catch (error) {
          // Ignore errors when stopping already stopped source
        }
        clickSourceRef.current = null;
      }
    };
  }, [isVisible, onComplete, duration]);

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
};

export default BeatCountdown; 