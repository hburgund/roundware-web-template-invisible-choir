import { Box, Typography } from "@mui/material";
import { useEffect, useState, useRef } from "react";
import config from "@/config";

interface BeatCountdownProps {
  onComplete: () => void;
  isVisible: boolean;
}

const BeatCountdown = ({ onComplete, isVisible }: BeatCountdownProps) => {
  const [currentBeat, setCurrentBeat] = useState(4);
  const [progress, setProgress] = useState(0);
  const isActiveRef = useRef(false);

  const beatsPerLoop = config.speak.beatsPerLoop;
  const countdownBeats = 4; // Always 4 beats for countdown

  useEffect(() => {
    if (!isVisible || isActiveRef.current) return;

    isActiveRef.current = true;
    setCurrentBeat(countdownBeats);
    setProgress(0);

    const beatInterval = 1000; // 1 second per beat (120 BPM equivalent)
    let beatCount = countdownBeats;

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
    };
  }, [isVisible, onComplete]);

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