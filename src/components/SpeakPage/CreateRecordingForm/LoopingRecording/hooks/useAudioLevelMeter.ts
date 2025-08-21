import { useState, useEffect, useRef } from 'react';
import { useLoopContext } from '../LoopContext';
import { createAudioLevelMonitor } from '@/utils';

export const useAudioLevelMeter = () => {
  const { recorder, loop } = useLoopContext();
  const [currentLevel, setCurrentLevel] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const levelUpdateRef = useRef<number | null>(null);
  const levelMonitorRef = useRef<ReturnType<typeof createAudioLevelMonitor> | null>(null);
  
  // Update level with smooth animation
  const updateLevel = (newLevel: number) => {
    if (levelUpdateRef.current) {
      cancelAnimationFrame(levelUpdateRef.current);
    }
    
    levelUpdateRef.current = requestAnimationFrame(() => {
      setCurrentLevel(newLevel);
    });
  };
  
  // Monitor loop mode to show/hide meter
  useEffect(() => {
    const isRecording = loop.mode === "recording";
    setIsVisible(isRecording);
    
    if (!isRecording) {
      // Reset level when not recording
      updateLevel(0);
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
      (level, rmsLevel, dbLevel) => {
        updateLevel(level);
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
    currentLevel,
    isVisible,
  };
};
