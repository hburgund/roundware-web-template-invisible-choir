import { Box } from '@mui/material';
import launchPageLogo from '@/assets/icons/launch_page_logo.svg';
import { useLocation } from 'react-router-dom';

const LaunchPageLogo = () => {
  const location = useLocation();
  const shouldShowLogo = location.pathname === '/listen';

  if (!shouldShowLogo) {
    return null;
  }

  return (
    <Box position="absolute" zIndex={1} sx={{ mt: 2 }}>
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