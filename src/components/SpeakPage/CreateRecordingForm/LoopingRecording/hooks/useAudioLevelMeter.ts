import { useState, useEffect, useRef } from 'react';
import { useLoopContext } from '../LoopContext';
import { createAudioLevelMonitorFromNode } from '@/utils';

export const useAudioLevelMeter = () => {
  const { recorder, loop } = useLoopContext();
  const [immediateLevel, setImmediateLevel] = useState(0);
  const [averageLevel, setAverageLevel] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const immediateLevelUpdateRef = useRef<number | null>(null);
  const averageLevelUpdateRef = useRef<number | null>(null);
  const levelMonitorRef = useRef<ReturnType<typeof createAudioLevelMonitorFromNode> | null>(null);
  
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
  
  // Create level monitor that monitors the compressed signal from the audio chain
  useEffect(() => {
    if (!isVisible || !recorder.audioChain?.compressor?.output || !recorder.audioChain?.audioContext) {
      // Clean up existing monitor
      if (levelMonitorRef.current) {
        levelMonitorRef.current.stopMonitoring();
        levelMonitorRef.current = null;
      }
      return;
    }
    
    // Create a separate level monitor that monitors the compressed signal
    // Use the same AudioContext as the audio chain to avoid cross-context issues
    levelMonitorRef.current = createAudioLevelMonitorFromNode(
      recorder.audioChain.audioContext,
      recorder.audioChain.compressor.output,
      (immediateLevel, averageLevel, rmsLevel, dbLevel) => {
        // Adjust levels to account for makeup gain (6 dB = ~2x amplification)
        // Convert makeup gain from dB to linear scale: 6 dB = 10^(6/20) ≈ 2
        const makeupGainLinear = Math.pow(10, 6 / 20); // ≈ 2
        const adjustedImmediateLevel = immediateLevel / makeupGainLinear;
        const adjustedAverageLevel = averageLevel / makeupGainLinear;
        
        updateImmediateLevel(adjustedImmediateLevel);
        updateAverageLevel(adjustedAverageLevel);
      }
    );
    
    levelMonitorRef.current.startMonitoring();
    
    return () => {
      if (levelMonitorRef.current) {
        levelMonitorRef.current.stopMonitoring();
        levelMonitorRef.current = null;
      }
      // Don't close the audio context here as it's managed by the audio chain
    };
  }, [isVisible, recorder.audioChain]);
  
  return {
    immediateLevel,
    averageLevel,
    isVisible,
  };
};
