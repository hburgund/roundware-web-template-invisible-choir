import React, { useState, useEffect } from 'react';
import { Box, Fade, Typography, Button, Stack } from '@mui/material';
import { useHistory } from 'react-router-dom';
import greenBackground from '../assets/green_background.png';
import greenLeafBg from '../assets/green_leaf_bg.png';
import introLogo from '../assets/intro_logo.png';
import { useRoundware } from '@/hooks';
import config from '@/config';
import { GeoListenMode } from 'roundware-web-framework/dist/index';

const Introduction: React.FC = () => {
  const history = useHistory();
  const [showLogo, setShowLogo] = useState(false);
  const [showContent, setShowContent] = useState(false);

	const { roundware, forceUpdate } = useRoundware();
  const project = roundware.project;

	if (!project || project.projectName === '(unknown)') {
		return null;
  }
  
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
    if (project.data?.listen_enabled) {
      if (!config.listen.autoplay) {
        history.push('/listen');
        return;
      }
      if (!roundware.mixer || !roundware.mixer?.playlist) {
        roundware?.activateMixer({ geoListenMode: GeoListenMode.MANUAL }).then(() => {
          if (roundware && roundware.uiConfig && roundware.uiConfig.listen && roundware.uiConfig.listen[0]) {
            const listen_tags = roundware.uiConfig.listen[0].display_items.map((i) => i.tag_id);
            roundware.mixer.updateParams({
              listenerLocation: roundware.listenerLocation,
              minDist: 0,
              maxDist: 0,
              recordingRadius: 0,
              listenTagIds: listen_tags,
            });
            roundware.mixer.play();
            forceUpdate();
            history.push('/listen');
          }
        });
      } else {
        roundware.mixer.play();
        forceUpdate();
        history.push('/listen');
      }
    } else if (project.data?.speak_enabled && config.speak.recordingMethod === 'standard') {
      history.push('/speak');
    }
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
            color="primary"
            onClick={handleTakePart}
          >
            TAKE PART
          </Button>
        </Stack>
      </Fade>

    </Box>
  );
};

export default Introduction; 