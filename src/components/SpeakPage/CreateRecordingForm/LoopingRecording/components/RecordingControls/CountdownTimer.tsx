import { Typography, keyframes, Box } from "@mui/material";
import { useLoopContext } from "../../LoopContext";
import config from "@/config";
import { useEffect, useState } from "react";
import BeatProgressPie from "./BeatProgressPie";

const countdownAnimation = keyframes`
  0% {
    opacity: 0;
    transform: translateY(-10px);
  }
  20% {
    opacity: 1;
    transform: translateY(0);
  }
  80% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(10px);
  }
`;

const CountdownTimer = () => {
  const { recorder, speaker } = useLoopContext();
  const [currentCount, setCurrentCount] = useState(0);
  const [beatProgress, setBeatProgress] = useState(0);
  
  // Calculate beat interval for animation timing
  const beatsPerLoop = config.speak.beatsPerLoop;
  const beatInterval = speaker.duration ? speaker.duration / beatsPerLoop : 1;
  const animationDuration = `${beatInterval}s`;

  useEffect(() => {
    // Use the startingRecordingInSeconds as a trigger for when countdown starts
    if (recorder.startingRecordingInSeconds <= 0 || !speaker.duration) {
      setCurrentCount(0);
      return;
    }

    // Calculate countdown end time
    const countdownEndTime = Date.now() + (recorder.startingRecordingInSeconds * 1000);

    const updateCount = () => {
      const now = Date.now();
      const remainingMs = countdownEndTime - now;
      
      if (remainingMs <= 0) {
        setCurrentCount(0);
        setBeatProgress(0);
        return;
      }
      
      const remainingSeconds = remainingMs / 1000;
      const remainingBeats = Math.ceil(remainingSeconds / beatInterval);
      setCurrentCount(Math.max(0, remainingBeats));
      
      // Calculate progress within the current beat
      // How much time has elapsed since the current beat started
      const timeIntoCurrentBeat = remainingSeconds % beatInterval;
      // Progress from 0 (beat just started) to 1 (beat about to end)
      const progress = (beatInterval - timeIntoCurrentBeat) / beatInterval;
      setBeatProgress(Math.min(1, Math.max(0, progress)));
    };

    // Update immediately
    updateCount();
    
    // Use requestAnimationFrame for smooth updates without interfering with audio
    let animationId: number;
    const animate = () => {
      updateCount();
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [recorder.startingRecordingInSeconds, beatInterval, speaker.duration]);

  // Don't render if count is 0 (recording has started)
  if (currentCount <= 0) {
    return null;
  }

  return (
    <Box position="relative" display="inline-block">
      {/* Beat progress pie chart */}
      <BeatProgressPie progress={beatProgress} size={120} />
      
      {/* Countdown number */}
      <Typography
        variant="h3"
        sx={{
          animation: `${countdownAnimation} ${animationDuration} ease-in-out infinite`,
          color: "white",
          fontWeight: "bold",
          display: "inline-block",
          position: "relative",
          zIndex: 2,
        }}
      >
        {currentCount}
      </Typography>
    </Box>
  );
};

export default CountdownTimer;
