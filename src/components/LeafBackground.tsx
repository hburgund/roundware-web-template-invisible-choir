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
        overflow: 'hidden',
        backgroundImage: `url(${greenBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
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
          width: { xs: '100%', sm: '80%', md: '60%' },
          maxWidth: '600px',
          height: 'auto',
          objectFit: 'cover',
          pointerEvents: 'none'
        }}
      />
      {children}
    </Box>
  );
};

export default LeafBackground; 