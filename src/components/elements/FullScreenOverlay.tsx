import React from 'react';
import {
  Dialog,
  DialogContent,
  Stack,
  Typography,
  Button,
  IconButton,
  Box,
  Container,
  Slide,
  useMediaQuery
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import CloseIcon from '@mui/icons-material/Close';
import greenBackground from '../../assets/green_background.svg';
import LeafBackground from '../LeafBackground';

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface FullScreenOverlayProps {
  open: boolean;
  onClose: () => void;
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  primaryButton?: {
    text: string;
    onClick: () => void;
    disabled?: boolean;
  };
  secondaryButton?: {
    text: string;
    onClick: () => void;
  };
  showCloseButton?: boolean;
  useLeafBackground?: boolean;
  transition?: 'slide' | 'none';
}

const FullScreenOverlay: React.FC<FullScreenOverlayProps> = ({
  open,
  onClose,
  icon,
  title,
  description,
  children,
  primaryButton,
  secondaryButton,
  showCloseButton = true,
  useLeafBackground = false,
  transition = 'slide'
}) => {
  const isLandscape = useMediaQuery('(orientation: landscape)', { noSsr: true });
  const backgroundProps = useLeafBackground ? {} : {
    backgroundImage: `url(${greenBackground})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: 'fixed',
    
  };

  const dialogContent = (
    <>
      {showCloseButton && (
        <Box
          sx={{
            position: 'absolute',
            right: 16,
            top: 16,
            width: 40,
            height: 40,
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
            onClick={onClose}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      )}
      
      <DialogContent>
        <Box
          sx={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            WebkitOverflowScrolling: 'touch',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <Container maxWidth="xs">
            <Stack
              spacing={isLandscape ? 2 : 3}
              alignItems="center"
              sx={{ width: '100%', px: 2, position: 'relative', zIndex: 2 }}
            >
              {icon && (
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  {icon}
                </Box>
              )}
              
              {title && (
                <Typography variant="h4" component="div" textAlign="center">
                  {title}
                </Typography>
              )}
              
              {description && (
                <Typography variant="subtitle1" textAlign="center" sx={{ whiteSpace: 'pre-line' }}>
                  {description}
                </Typography>
              )}

              {children}

              {(primaryButton || secondaryButton) && (
                <Stack spacing={2} width="100%">
                  {primaryButton && (
                    <Button
                      variant="contained"
                      onClick={primaryButton.onClick}
                      fullWidth
                      size="large"
                      disabled={primaryButton.disabled}
                      className="MuiButton-dialog"
                      sx={{
                        position: 'relative',
                        zIndex: 10,
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      {primaryButton.text}
                    </Button>
                  )}
                  
                  {secondaryButton && (
                    <Button
                      variant="outlined"
                      onClick={secondaryButton.onClick}
                      fullWidth
                      size="large"
                      className="MuiButton-dialog"
                      sx={{
                        position: 'relative',
                        zIndex: 10,
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      {secondaryButton.text}
                    </Button>
                  )}
                </Stack>
              )}
            </Stack>
          </Container>
        </Box>
      </DialogContent>
    </>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      TransitionComponent={transition === 'slide' ? Transition : undefined}
      PaperProps={{
        sx: backgroundProps,
        'data-fullscreen-overlay': 'true',
        WebkitOverflowScrolling: 'touch',
        position: 'relative',
      }}
    >
      {useLeafBackground ? (
        <LeafBackground>
          {dialogContent}
        </LeafBackground>
      ) : (
        dialogContent
      )}
    </Dialog>
  );
};

export default FullScreenOverlay; 