import { useState, useEffect, useRef } from 'react';
import { useLoopContext } from '../LoopContext';
import { createAudioLevelMonitor } from '@/utils';

export const useAudioLevelMeter = () => {
  const { recorder, loop } = useLoopContext();
  const [immediateLevel, setImmediateLevel] = useState(0);
  const [averageLevel, setAverageLevel] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const immediateLevelUpdateRef = useRef<number | null>(null);
  const averageLevelUpdateRef = useRef<number | null>(null);
  const levelMonitorRef = useRef<ReturnType<typeof createAudioLevelMonitor> | null>(null);
  
  // For fast attack, gradual decay behavior
  const smoothedImmediateLevel = useRef(0);
  
  // Update immediate level with fast attack, gradual decay
  const updateImmediateLevel = (newLevel: number) => {
    if (immediateLevelUpdateRef.current) {
      cancelAnimationFrame(immediateLevelUpdateRef.current);
    }
    
    immediateLevelUpdateRef.current = requestAnimationFrame(() => {
      // Fast attack, gradual decay behavior
      const currentLevel = smoothedImmediateLevel.current;
      
      if (newLevel > currentLevel) {
        // Attack phase - move up more gradually (less flashy response)
        smoothedImmediateLevel.current = currentLevel + (newLevel - currentLevel) * 0.5;
      } else {
        // Decay phase - move down slowly (gradual fallback)
        smoothedImmediateLevel.current = currentLevel + (newLevel - currentLevel) * 0.1;
      }
      
      setImmediateLevel(smoothedImmediateLevel.current);
    });
  };

  // Update average level with smooth animation
  const updateAverageLevel = (newLevel: number) => {
    if (averageLevelUpdateRef.current) {
      cancelAnimationFrame(averageLevelUpdateRef.current);
    }
    
    averageLevelUpdateRef.current = requestAnimationFrame(() => {
      setAverageLevel(newLevel);
    });
  };
  
  // Monitor loop mode to show/hide meter
  useEffect(() => {
    const isRecording = loop.mode === "recording";
    setIsVisible(isRecording);
    
    if (!isRecording) {
      // Reset levels when not recording
      updateImmediateLevel(0);
      updateAverageLevel(0);
      smoothedImmediateLevel.current = 0; // Reset the smoothed level
    }
  }, [loop.mode]);
  
  // Create separate level monitor for the meter
  useEffect(() => {
    if (!isVisible || !recorder.recorderStream) {
      // Clean up existing monitor
      if (levelMonitorRef.current) {
        levelMonitorRef.current.stopMonitoring();
        levelMonitorRef.current = null;
      }
      return;
    }
    
    // Create a separate level monitor for the meter
    const audioContext = new AudioContext();
    levelMonitorRef.current = createAudioLevelMonitor(
      audioContext,
      recorder.recorderStream,
      (immediateLevel, averageLevel, rmsLevel, dbLevel) => {
        updateImmediateLevel(immediateLevel);
        updateAverageLevel(averageLevel);
      }
    );
    
    levelMonitorRef.current.startMonitoring();
    
    return () => {
      if (levelMonitorRef.current) {
        levelMonitorRef.current.stopMonitoring();
        levelMonitorRef.current = null;
      }
      audioContext.close();
    };
  }, [isVisible, recorder.recorderStream]);
  
  return {
    immediateLevel,
    averageLevel,
    isVisible,
  };
};
