import React from 'react';
import { Box } from '@mui/material';
import greenBackground from '../assets/green_background.svg';
import greenLeafBg from '../assets/green_leaf_background.svg';

interface LeafBackgroundProps {
  children?: React.ReactNode;
}

const LeafBackground: React.FC<LeafBackgroundProps> = ({ children }) => {
  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        width: '100%',
        backgroundImage: `url(${greenBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        component="img"
        src={greenLeafBg}
        alt="Green Leaf Background"
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          zIndex: 1,
          width: '100%',
          height: 'auto',
          objectFit: 'cover'
        }}
      />
      {children}
    </Box>
  );
};

export default LeafBackground; 