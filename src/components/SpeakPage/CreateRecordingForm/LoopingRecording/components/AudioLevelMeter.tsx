import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography } from '@mui/material';

interface AudioLevelMeterProps {
  level: number; // 0-1 normalized level
  isVisible?: boolean;
}

const AudioLevelMeter: React.FC<AudioLevelMeterProps> = ({ 
  level, 
  isVisible = true 
}) => {
  const [displayLevel, setDisplayLevel] = useState(0);
  const animationRef = useRef<number>();
  
  // Smooth animation for the level display
  useEffect(() => {
    if (!isVisible) {
      setDisplayLevel(0);
      return;
    }
    
    const animate = () => {
      setDisplayLevel(prev => {
        const diff = level - prev;
        const newLevel = prev + diff * 0.1; // Smooth interpolation
        return Math.abs(diff) < 0.001 ? level : newLevel;
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [level, isVisible]);
  
  // Calculate color based on level
  const getColor = (level: number): string => {
    if (level < 0.1) {
      // Green for quiet levels
      return '#4CAF50';
    } else if (level < 0.3) {
      // Green to yellow transition
      const t = (level - 0.1) / 0.2;
      return `rgb(${76 + t * 179}, ${175 + t * 80}, ${80 - t * 80})`;
    } else if (level < 0.6) {
      // Yellow for target zone
      return '#FFC107';
    } else if (level < 0.8) {
      // Yellow to red transition
      const t = (level - 0.6) / 0.2;
      return `rgb(${255 - t * 55}, ${193 - t * 193}, ${7 + t * 48})`;
    } else {
      // Red for too loud
      return '#F44336';
    }
  };
  
  // Get message based on level
  const getMessage = (level: number): string => {
    if (level < 0.05) {
      return "Sing a bit louder!";
    } else if (level < 0.1) {
      return "Getting there...";
    } else if (level < 0.3) {
      return "Good level!";
    } else if (level < 0.6) {
      return "Perfect!";
    } else if (level < 0.8) {
      return "Getting loud...";
    } else {
      return "Pull back from the mic a bit!";
    }
  };
  
  if (!isVisible) return null;
  
  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100vw',
        height: `${displayLevel * 100}%`,
        backgroundColor: getColor(displayLevel),
        opacity: 0.7,
        zIndex: -1, // Below all UI components but above background
        transition: 'background-color 0.1s ease',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        pointerEvents: 'none', // Don't interfere with UI interactions
      }}
    >
      {/* Level indicator text */}
              <Box
          sx={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center',
            zIndex: 0, // Above the meter bar but below other UI
          }}
        >
        <Typography
          variant="h6"
          sx={{
            color: 'white',
            textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
            fontWeight: 'bold',
            fontSize: { xs: '1rem', sm: '1.25rem' },
            textAlign: 'center',
            maxWidth: '300px',
            lineHeight: 1.2,
          }}
        >
          {getMessage(displayLevel)}
        </Typography>
        
        {/* Level percentage (optional, for debugging) */}
        {process.env.NODE_ENV === 'development' && (
          <Typography
            variant="body2"
            sx={{
              color: 'white',
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
              marginTop: 1,
              opacity: 0.8,
            }}
          >
            {Math.round(displayLevel * 100)}%
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default AudioLevelMeter;
