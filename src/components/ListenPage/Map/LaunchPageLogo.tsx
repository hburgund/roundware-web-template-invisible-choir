import { Box } from '@mui/material';
import launchPageLogo from '@/assets/icons/launch_page_logo.svg';

const LaunchPageLogo = () => {
  return (
    <Box position="absolute" top={80} left={8} zIndex={1} sx={{ ml: 2 }}>
      <Box
        component="img"
        src={launchPageLogo}
        alt="Launch Page Logo"
        sx={{
          height: 60,
          width: 'auto'
        }}
      />
    </Box>
  );
};

export default LaunchPageLogo; 