import React, { useState, useEffect } from 'react';
import { Box, Fade, Typography, Button, Stack } from '@mui/material';
import { useHistory } from 'react-router-dom';
import introLogo from '../assets/intro_logo.png';
import { useRoundware } from '@/hooks';
import config from '@/config';
import { GeoListenMode } from 'roundware-web-framework/dist/index';
import LeafBackground from './LeafBackground';

const Introduction: React.FC = () => {
  const history = useHistory();
  const [showLogo, setShowLogo] = useState(false);
  const [showContent, setShowContent] = useState(false);

	const { roundware, forceUpdate } = useRoundware();
  const project = roundware.project;

	// Check if project is ready
	const isProjectReady = project && project.projectName !== '(unknown)';
  
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
    if (!isProjectReady) {
      return;
    }
    if (project.data?.listen_enabled) {
      if (!config.listen.autoplay) {
        history.push('/listen', { source: 'intro' });
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
            history.push('/listen', { source: 'intro' });
          }
        });
      } else {
        roundware.mixer.play();
        forceUpdate();
        history.push('/listen', { source: 'intro' });
      }
    } else if (project.data?.speak_enabled && config.speak.recordingMethod === 'standard') {
      history.push('/speak');
    }
  };

  return (
    <LeafBackground>
      <Fade in={showLogo} timeout={1000}>
        <Box
          component="img"
          src={introLogo}
          alt="Intro Logo"
          width={144}
          height={188}
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
            Welcome to Invisible Choir.
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center">
            <p>A geo-located co-created musical work.</p>
            <p>By Ari Benjamin Meyers and Halsey Burgund.</p>
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={handleTakePart}
            disabled={!isProjectReady}
            sx={{
              opacity: isProjectReady ? 1 : 0.6,
              cursor: isProjectReady ? 'pointer' : 'not-allowed',
            }}
          >
            {isProjectReady ? 'TAKE PART' : 'Loading...'}
          </Button>
        </Stack>
      </Fade>
    </LeafBackground>
  );
};

export default Introduction; 