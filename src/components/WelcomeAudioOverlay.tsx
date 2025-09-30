import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  Typography,
  IconButton,
  Box,
  Container,
  Stack,
  Slide,
  useMediaQuery
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ReplayIcon from '@mui/icons-material/Replay';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import greenBackground from '../assets/green_background.svg';

const SlideUpTransition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface WelcomeAudioOverlayProps {
  open: boolean;
  onClose: () => void;
}

const WelcomeAudioOverlay: React.FC<WelcomeAudioOverlayProps> = ({
  open,
  onClose
}) => {
  // Resolve welcome audio URL dynamically so build doesn't fail if file is absent
  const welcomeAudioModules = import.meta.glob('/src/assets/audio/ic-welcome.mp3', { eager: true });
  const welcomeAudioUrl = (welcomeAudioModules['/src/assets/audio/ic-welcome.mp3'] as any)?.default as string | undefined;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isSlidingOut, setIsSlidingOut] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const isLandscape = useMediaQuery('(orientation: landscape)', { noSsr: true });

  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      // Start slide out immediately when audio ends
      setIsSlidingOut(true);
      // Close overlay after slide animation
      setTimeout(() => {
        onClose();
      }, 300);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onClose]);

  // Auto-play when overlay opens
  useEffect(() => {
    if (open && audioRef.current) {
      // Reset states when opening
      setIsPlaying(false);
      setIsSlidingOut(false);
      
      // Create a synthetic user interaction to enable audio
      const triggerAudioPlay = () => {
        const audio = audioRef.current;
        if (!audio) return;
        
        // Try to play immediately
        audio.play().then(() => {
          setIsPlaying(true);
          console.log('Audio started playing successfully');
        }).catch((error) => {
          console.error('Failed to play audio:', error);
          // Try again with a small delay
          setTimeout(() => {
            audio.play().then(() => {
              setIsPlaying(true);
              console.log('Audio started playing on retry');
            }).catch((retryError) => {
              console.error('Failed to play audio on retry:', retryError);
            });
          }, 300);
        });
      };
      
      // Small delay to ensure overlay is fully rendered
      setTimeout(triggerAudioPlay, 100);
    }
  }, [open]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
  };

  const handleReplay = () => {
    if (!audioRef.current) return;
    
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(console.error);
  };

  const handleClose = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    onClose();
  };

  const handleBackdropClick = () => {
    // Pause audio instead of closing overlay
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
    }
  };

  // If no audio present, render nothing (caller treats as no welcome message)
  if (!welcomeAudioUrl) {
    return null;
  }

  return (
    <Dialog
      open={open && !isSlidingOut}
      onClose={handleBackdropClick}
      TransitionComponent={SlideUpTransition}
      maxWidth={false}
      fullWidth
      PaperProps={{
        sx: {
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          width: '100vw !important',
          maxWidth: 'none !important',
          height: '30vh',
          maxHeight: '300px',
          margin: 0,
          borderRadius: '16px 16px 0 0',
          backgroundImage: `url(${greenBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      <DialogContent sx={{ flex: 1, p: 2, display: 'flex', flexDirection: 'column' }}>
        {/* Close button */}
        <Box
          sx={{
            position: 'absolute',
            right: 16,
            top: 16,
            width: 32,
            height: 32,
            border: 1,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderColor: 'rgba(255, 255, 255, 0.5)',
            zIndex: 10
          }}
        >
          <IconButton
            aria-label="close"
            onClick={handleClose}
            size="small"
          >
            <CloseIcon sx={{ color: 'white', fontSize: 20 }} />
          </IconButton>
        </Box>

        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column'
          }}
        >
          <Stack
            spacing={isLandscape ? 1.5 : 2}
            alignItems="center"
            sx={{ width: '100%', px: 2 }}
          >
            {/* Headphones icon */}
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <HeadphonesIcon sx={{ fontSize: 40, color: 'white' }} />
            </Box>
            
            {/* Welcome text */}
            <Typography variant="h5" component="div" textAlign="center" sx={{ color: 'white', fontWeight: 'bold' }}>
              Get Ready!
            </Typography>
            
            <Typography variant="body1" textAlign="center" sx={{ color: 'white', fontSize: '0.9rem' }}>
              Please put on headphones!
            </Typography>

            {/* Audio controls */}
            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              <IconButton
                onClick={handlePlayPause}
                size="medium"
                sx={{
                  border: 1,
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  width: 48,
                  height: 48,
                  color: 'white'
                }}
              >
                {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
              </IconButton>
              
              <IconButton
                onClick={handleReplay}
                size="medium"
                sx={{
                  border: 1,
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  width: 48,
                  height: 48,
                  color: 'white'
                }}
              >
                <ReplayIcon />
              </IconButton>
            </Stack>
          </Stack>
        </Box>

        {/* Hidden audio element - completely isolated from app audio system */}
        <audio
          ref={audioRef}
          src={welcomeAudioUrl}
          preload="auto"
          autoPlay
          style={{ display: 'none' }}
          crossOrigin="anonymous"
        />
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeAudioOverlay;
