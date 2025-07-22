import { memo, useEffect, useRef, useState } from "react";
import ProgressRing from "./ProgressRing";
import { useDimensions } from "./hooks";
import { useLoop } from "../../useLoop";

interface AnimatedCircleProps {
  dimensions: ReturnType<typeof useDimensions>;
  mode: ReturnType<typeof useLoop>["mode"];
  startedAtTime: React.MutableRefObject<number | null>;
  duration: number;
  isRecording?: boolean;
}

const AnimatedCircle = memo(
  ({ dimensions, mode, startedAtTime, duration, isRecording = false }: AnimatedCircleProps) => {
    const [progress, setProgress] = useState(0);
    const requestRef = useRef<number>();

    useEffect(() => {
      // Only animate for modes that have active playback
      const shouldAnimate = mode === "playing-speaker" || 
                           mode === "recording" || 
                           mode === "recording-playback";
      
      if (shouldAnimate && duration) {
        const animate = () => {
          const elapsedTime = Date.now() - (startedAtTime.current || 0);
          const durationMs = duration * 1000;
          
          // For recording mode, stop at exactly one loop
          if (mode === "recording" && isRecording) {
            const recordingProgress = Math.min(elapsedTime / durationMs, 1);
            setProgress(recordingProgress);
            
            // Stop animation when recording completes one loop
            if (recordingProgress >= 1) {
              return;
            }
          } else {
            // For other modes, loop continuously
            const loopProgress = (elapsedTime % durationMs) / durationMs;
            setProgress(loopProgress);
          }
          
          requestRef.current = requestAnimationFrame(animate);
        };
        requestRef.current = requestAnimationFrame(animate);

        return () => {
          if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
          }
        };
      } else {
        setProgress(0);
      }
    }, [mode, duration, startedAtTime, isRecording]);

    return (
      <ProgressRing
        progress={progress}
        mode={
          mode === "idle"
            ? "rehearse"
            : mode === "preparing-to-record"
            ? "rehearse"
            : mode === "countdown-to-record"
            ? "rehearse"
            : mode === "recording"
            ? "recording"
            : mode === "processing-recording"
            ? "review"
            : mode === "playing-speaker"
            ? "rehearse"
            : mode === "recording-playback" || mode === "loading"
            ? "review"
            : "rehearse"
        }
      />
    );
  }
);

export default AnimatedCircle;
