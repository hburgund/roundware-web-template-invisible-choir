import React from 'react';
import { Box } from '@mui/material';

interface BeatProgressPieProps {
  /** Progress within current beat (0 to 1) */
  progress: number;
  /** Size of the pie chart */
  size: number;
}

const BeatProgressPie: React.FC<BeatProgressPieProps> = ({ progress, size }) => {
  const center = size / 2;
  const radius = size / 2 - 4; // Leave some padding
  
  // Calculate the end point of the arc based on progress
  // Start at 12 o'clock (90 degrees offset) and go clockwise
  const angle = (progress * 360 - 90) * (Math.PI / 180);
  const endX = center + radius * Math.cos(angle);
  const endY = center + radius * Math.sin(angle);
  
  // Create SVG path for the pie slice
  const createPath = (progress: number) => {
    if (progress === 0) return '';
    if (progress >= 1) {
      // Full circle
      return `M ${center} ${center - radius} A ${radius} ${radius} 0 1 1 ${center - 0.1} ${center - radius} Z`;
    }
    
    // Partial arc
    const largeArcFlag = progress > 0.5 ? 1 : 0;
    return `M ${center} ${center} L ${center} ${center - radius} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1, // Behind the countdown text
      }}
    >
      <svg width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="2"
        />
        
        {/* Progress pie */}
        <path
          d={createPath(progress)}
          fill="rgba(255, 255, 255, 0.2)"
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth="1"
        />
        
        {/* Start indicator at 12 o'clock */}
        <line
          x1={center}
          y1={center}
          x2={center}
          y2={center - radius}
          stroke="rgba(255, 255, 255, 0.6)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </Box>
  );
};

export default BeatProgressPie; 