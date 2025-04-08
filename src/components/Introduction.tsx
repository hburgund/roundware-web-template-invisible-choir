import React, { useState, useEffect } from 'react';
import { Box, Fade, Typography, Button, Stack, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import { useHistory } from 'react-router-dom';
import greenBackground from '../assets/green_background.png';
import greenLeafBg from '../assets/green_leaf_bg.png';
import introLogo from '../assets/intro_logo.png';

const Introduction: React.FC = () => {
  const history = useHistory();
  const [showLogo, setShowLogo] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [error, setError] = useState<GeolocationPositionError | null>(null);

  useEffect(() => {
    // Start fade in after component mounts
    setShowLogo(true);

    // Start fade out after 3s (1s fade in + 2s display)
    const logoTimer = setTimeout(() => {
      setShowLogo(false);
      // Start showing content after logo starts fading out
      setShowContent(true);
    }, 3000);

    return () => clearTimeout(logoTimer);
  }, []);

  const handleTakePart = () => {
    setShowPermissionDialog(true);
  };

  const handleBlock = () => {
    setShowPermissionDialog(false);
    // Simulate permission denied error
    setError({
      code: 1,
      message: "Permission denied",
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3
    });
  };

  const handleRequestPermission = () => {
    setShowPermissionDialog(false);
    if (!navigator.geolocation) {
      setError({ code: 1, message: "Your browser doesn't support geolocation.", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Success callback - navigate to listen page
        history.push('/listen');
      },
      (err) => {
        // Error callback - treat all errors as permission denied
        setError({
          code: 1,
          message: "Permission denied",
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3
        });
      }
    );
  };

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
          top: 50,
          right: 0,
          zIndex: 1,
        }}
      />
      <Fade in={showLogo} timeout={1000}>
        <Box
          component="img"
          src={introLogo}
          alt="Intro Logo"
          sx={{
            zIndex: 2,
          }}
        />
      </Fade>
      <Fade in={showContent} timeout={1000}>
        <Stack
          spacing={4}
          alignItems="center"
          sx={{
            position: 'absolute',
            zIndex: 2,
            p: 5
          }}
        >
          <Typography variant="h5" color="primary" align="center">
            Welcome ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor.
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.
          </Typography>
          <Button 
            variant="contained" 
            color="secondary"
            onClick={handleTakePart}
          >
            TAKE PART
          </Button>
        </Stack>
      </Fade>

      {/* Custom Permission Dialog */}
      <Dialog
        open={showPermissionDialog}
        onClose={() => setShowPermissionDialog(false)}
      >
        <DialogTitle>
          Invisible Choir needs access
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enabling location is necessary to participate fully in the artwork experience. Your location data won't be saved or shared.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
          <Button 
            onClick={handleBlock}
            variant="outlined"
          >
            Block
          </Button>
          <Button 
            onClick={handleRequestPermission}
            variant="contained"
            color="primary"
          >
            Allow
          </Button>
        </DialogActions>
      </Dialog>

      {/* Permission Instructions Dialog */}
      <Dialog
        open={!!error}
        onClose={() => setError(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={3}>
            <Typography variant="h6">
              Permission to location was denied. Please allow access to the location to use this feature.
            </Typography>
            
            <Stack spacing={2}>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                1. Click the lock icon in the address bar.
              </Typography>
              
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                2. Next, go to Permissions.
              </Typography>
              
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                3. Here, you'll find a list of permissions for Chrome.
              </Typography>
              
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                4. Change to Allow.
              </Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setError(null)}
            variant="contained"
            fullWidth
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Introduction; 