import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography } from '@mui/material';

interface AudioLevelMeterProps {
  immediateLevel: number; // 0-1 normalized immediate level
  averageLevel: number; // 0-1 normalized average level
  isVisible?: boolean;
}

const AudioLevelMeter: React.FC<AudioLevelMeterProps> = ({ 
  immediateLevel, 
  averageLevel,
  isVisible = true 
}) => {
  const [displayImmediateLevel, setDisplayImmediateLevel] = useState(0);
  const [displayAverageLevel, setDisplayAverageLevel] = useState(0);
  const immediateAnimationRef = useRef<number>();
  const averageAnimationRef = useRef<number>();
  
  // Smooth animation for the immediate level display
  useEffect(() => {
    if (!isVisible) {
      setDisplayImmediateLevel(0);
      return;
    }
    
    const animate = () => {
      setDisplayImmediateLevel(prev => {
        const diff = immediateLevel - prev;
        const newLevel = prev + diff * 0.3; // Faster interpolation for immediate response
        return Math.abs(diff) < 0.001 ? immediateLevel : newLevel;
      });
      
      immediateAnimationRef.current = requestAnimationFrame(animate);
    };
    
    immediateAnimationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (immediateAnimationRef.current) {
        cancelAnimationFrame(immediateAnimationRef.current);
      }
    };
  }, [immediateLevel, isVisible]);

  // Smooth animation for the average level display
  useEffect(() => {
    if (!isVisible) {
      setDisplayAverageLevel(0);
      return;
    }
    
    const animate = () => {
      setDisplayAverageLevel(prev => {
        const diff = averageLevel - prev;
        const newLevel = prev + diff * 0.1; // Slower interpolation for stable average
        return Math.abs(diff) < 0.001 ? averageLevel : newLevel;
      });
      
      averageAnimationRef.current = requestAnimationFrame(animate);
    };
    
    averageAnimationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (averageAnimationRef.current) {
        cancelAnimationFrame(averageAnimationRef.current);
      }
    };
  }, [averageLevel, isVisible]);
  
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
  
  // Get message based on average level (more stable for user feedback)
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
        height: '100vh',
        zIndex: -1, // Below all UI components but above background
        pointerEvents: 'none', // Don't interfere with UI interactions
      }}
    >
      {/* Immediate level layer (behind, with opacity-based attack) */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          width: '100%',
          height: `${displayImmediateLevel * 100}%`,
          backgroundColor: getColor(displayImmediateLevel),
          opacity: Math.min(0.4, 0.1 + displayImmediateLevel * 0.3), // Opacity increases with level
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          transition: 'opacity 0.1s ease', // Smooth opacity transitions
        }}
      >
        {/* Solid bar at the top of immediate level */}
        <Box
          sx={{
            width: '100%',
            height: '4px',
            backgroundColor: getColor(displayImmediateLevel),
            opacity: Math.min(0.9, 0.3 + displayImmediateLevel * 0.6), // Top bar opacity also increases with level
            transition: 'opacity 0.1s ease',
          }}
        />
      </Box>
      
      {/* Average level layer (in front, more opaque) */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          width: '100%',
          height: `${displayAverageLevel * 100}%`,
          backgroundColor: getColor(displayAverageLevel),
          opacity: 0.6, // More opaque for the average level
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
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
            {getMessage(displayAverageLevel)}
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
              Avg: {Math.round(displayAverageLevel * 100)}% | Immediate: {Math.round(displayImmediateLevel * 100)}%
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default AudioLevelMeter;
