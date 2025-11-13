import {
  Box,
  Button,
  Checkbox,
  Fab,
  FormControlLabel,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { Fade, Slide, useMediaQuery } from "@mui/material";
import { useState, useRef, useEffect } from "react";
import { isAndroid, isIOS } from 'react-device-detect';
import { Help } from "@mui/icons-material";
import JoinChoirBackground from "./JoinChoirBackground";
import JoinChoirSteps from "./JoinChoirSteps";
import MicrophonePermissionDialog from "@/components/elements/MicrophonePermissionDialog";
import MicrophoneBlockedDialog from "@/components/elements/MicrophoneBlockedDialog";
import MicrophoneInstructionsDialog from "@/components/elements/MicrophoneInstructionsDialog";
import AudioRequiredDialog from "@/components/elements/AudioRequiredDialog";
import HelpPopup from "@/components/HelpPopup";
import { getCleanAudioConstraints } from "@/utils";
import { useRoundware } from "@/hooks";

interface JoinChoirProps {
  onContinue: () => void;
  onCancel: () => void;
  onCheckPermission?: () => Promise<boolean>; // Made optional since we no longer use it
  onPermissionDenied?: () => void; // Callback for when permission is denied
  onAudioDeviceMissing?: () => void; // Callback for when audio devices are missing
}

const JoinChoir = ({
  onContinue,
  onCancel,
  onCheckPermission,
  onPermissionDenied,
  onAudioDeviceMissing,
}: JoinChoirProps) => {
  const { roundware } = useRoundware();
  const [isConsentChecked, setIsConsentChecked] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isCheckingPermission, setIsCheckingPermission] = useState(false);
  const [showMicrophonePermissionDialog, setShowMicrophonePermissionDialog] = useState(false);
  const [showMicrophoneBlockedDialog, setShowMicrophoneBlockedDialog] = useState(false);
  const [showMicrophoneHelp, setShowMicrophoneHelp] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showAudioRequiredDialog, setShowAudioRequiredDialog] = useState(false);
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    isMountedRef.current = true;
    
    // Check audio device availability on mount
    const checkAudioDevices = async () => {
      try {
        // Check if mediaDevices API is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
          if (isMountedRef.current) {
            setShowAudioRequiredDialog(true);
          }
          return;
        }

        // Enumerate devices to check for microphone and speakers
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasMicrophone = devices.some(device => device.kind === 'audioinput');
        const hasSpeakers = devices.some(device => device.kind === 'audiooutput');
        
        if (!hasMicrophone || !hasSpeakers) {
          if (isMountedRef.current) {
            setShowAudioRequiredDialog(true);
          }
        }
      } catch (error) {
        console.error('[JoinChoir] Error checking audio devices:', error);
        // If we can't check devices, show the dialog to be safe
        if (isMountedRef.current) {
          setShowAudioRequiredDialog(true);
        }
      }
    };

    checkAudioDevices();
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  
  const legalAgreementText = roundware?.project?.legalAgreement || 
    "I consent to my recording being used solely for the artistic purposes of Invisible Choir";

  const handleContinue = async () => {
    console.log('[JoinChoir] handleContinue called, isConsentChecked:', isConsentChecked);
    if (!isConsentChecked) return;
    
    // Check if permission already granted
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
        if (!isMountedRef.current) return;
        
        if (permissionStatus.state === 'granted') {
          onContinue();
          return;
        }
      } catch (error) {
        // Fallback for unsupported browsers
        if (!isMountedRef.current) return; 
      }
    }
    
    // Show the permission dialog first
    if (isMountedRef.current) {
      setShowMicrophonePermissionDialog(true);
    }
  };

  const handlePermissionAllow = async () => {
    if (!isMountedRef.current) return;
    
    setShowMicrophonePermissionDialog(false);
    
    // Check if we're on HTTPS (required for getUserMedia in most browsers)
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      console.error('[JoinChoir] getUserMedia requires HTTPS (except on localhost)');
      alert('Microphone access requires HTTPS. Please use https:// or localhost.');
      return;
    }
    
    console.log('[JoinChoir] Starting permission request...');
    if (isMountedRef.current) {
      setIsRequestingPermission(true);
    }
    
    try {
      // Request microphone permission early to avoid timing issues during countdown
      console.log('[JoinChoir] Requesting microphone permission...');
      
      // Check if permissions API is supported
      if (navigator.permissions && navigator.permissions.query) {
        try {
          if (isMountedRef.current) {
            setIsCheckingPermission(true);
          }
          const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
          
          if (!isMountedRef.current) return;
          
          if (permissionStatus.state === 'granted') {
            console.log('[JoinChoir] Microphone permission already granted');
            onContinue();
            return;
          } else if (permissionStatus.state === 'denied') {
            console.warn('[JoinChoir] Permissions API reports denied, but trying getUserMedia anyway...');
            // Don't return here - try getUserMedia as a fallback
            // Sometimes the permissions API can be wrong or outdated
            // If getUserMedia fails, we'll handle it in the catch block below
          }
          // If state is 'prompt', continue to request permission below
        } catch (permissionError) {
          console.warn('[JoinChoir] Permissions API not supported or failed, falling back to getUserMedia:', permissionError);
          // Continue to getUserMedia fallback
        } finally {
          if (isMountedRef.current) {
            setIsCheckingPermission(false);
          }
        }
      } else {
        console.log('[JoinChoir] Permissions API not supported, using getUserMedia directly');
      }
      
      // Permission not determined or permissions API not supported - request it
      console.log('[JoinChoir] Requesting microphone permission from user...');
      const stream = await navigator.mediaDevices.getUserMedia(getCleanAudioConstraints());
      
      if (!isMountedRef.current) {
        // Component unmounted, clean up stream and return
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      
      // Stop the stream immediately since we just need permission
      stream.getTracks().forEach(track => track.stop());
      console.log('[JoinChoir] Microphone permission granted');
      onContinue();
      
    } catch (error) {
      if (!isMountedRef.current) return;
      
      console.error('[JoinChoir] Error requesting microphone permission:', error);
      console.error('[JoinChoir] Error details:', {
        name: (error as any)?.name,
        message: (error as any)?.message,
        stack: (error as any)?.stack
      });
      
      // Show more specific error message to user
      const errorName = (error as any)?.name;
      if (errorName === 'NotAllowedError') {
        setPermissionError('Microphone permission was denied. Please allow microphone access in your browser settings and try again.');
        onPermissionDenied?.();
      } else if (errorName === 'NotFoundError') {
        setPermissionError('No microphone found. Please connect a microphone and try again.');
        onAudioDeviceMissing?.();
      } else if (errorName === 'NotSupportedError') {
        setPermissionError('Microphone access is not supported in this browser. Please try a different browser.');
        onAudioDeviceMissing?.();
      } else {
        setPermissionError('Failed to access microphone. Please check your browser settings and try again.');
        onPermissionDenied?.();
      }
    } finally {
      if (isMountedRef.current) {
        console.log('[JoinChoir] Permission request completed, setting isRequestingPermission to false');
        setIsRequestingPermission(false);
      }
    }
  };

  const handlePermissionBlock = () => {
    setShowMicrophonePermissionDialog(false);
    // Show the blocked dialog
    setShowMicrophoneBlockedDialog(true);
  };

  const isLandscape = useMediaQuery('(orientation: landscape)', { noSsr: true });
  const isMobileDevice = isAndroid || isIOS;
  const shouldUseLandscapeLayout = isLandscape && isMobileDevice;

  if (shouldUseLandscapeLayout) {
    return (
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: "hidden",
          WebkitOverflowScrolling: "touch",
          willChange: "transform",
        }}
      >
        <JoinChoirBackground />
        <Slide 
          direction="up" 
          in={true} 
          mountOnEnter 
          unmountOnExit 
          timeout={200}
          easing={{
            enter: 'cubic-bezier(0.0, 0, 0.2, 1)',
            exit: 'cubic-bezier(0.4, 0, 1, 1)',
          }}
        >
          <Box
            sx={{
              "& .MuiFab-root": { width: 260, height: 260 },
              mx: "auto",
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Box
              sx={{
                position: "relative",
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: 4,
              }}
            >
              {/* Help Button */}
              <Button
                variant="outlined"
                color="secondary"
                size="large"
                sx={{
                  position: "absolute",
                  top: 30,
                  right: 30,
                  minWidth: 45,
                  minHeight: 45,
                  p: 0,
                  borderRadius: "50%",
                  color: "white",
                  borderColor: "rgba(255, 255, 255, 0.5)",
                  borderWidth: 1,
                  width: 45,
                  height: 45,
                }}
                onClick={() => setShowHelp(true)}
              >
                <Help sx={{ fontSize: 30 }} />
              </Button>
              {/* Main content (Fab and Skeleton) on the left */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  flex: 1,
                }}
              >
                <Box sx={{ position: "relative" }}>
                  <Skeleton
                    variant="circular"
                    animation="pulse"
                    sx={{
                      position: "absolute",
                      width: 290,
                      height: 290,
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      bgcolor: "secondary.main",
                    }}
                  />

                  <Fab size="large" color="secondary" sx={{ width: 350, height:350 }}>
                    <JoinChoirSteps />
                  </Fab>
                </Box>
              </Box>

              {/* Form elements on the right */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  flex: 1,
                  height: "100%",
                  gap: 3,
                }}
              >
                <Stack direction="row" alignItems="center" sx={{ p: 5 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={isConsentChecked}
                        onChange={(e) => setIsConsentChecked(e.target.checked)}
                      />
                    }
                    label={
                      <Typography variant="body2" fontSize={14}>
                        {legalAgreementText}
                      </Typography>
                    }
                  />
                </Stack>

                <Stack direction="column" spacing={2} alignItems="center">
                  <Button
                    variant="contained"
                    disabled={!isConsentChecked || isRequestingPermission || isCheckingPermission}
                    onClick={handleContinue}
                  >
                    {isCheckingPermission ? "Checking Permission..." : isRequestingPermission ? "Requesting Permission..." : "Continue"}
                  </Button>
                  <Button variant="text" onClick={onCancel}>
                    Cancel
                  </Button>
                </Stack>
              </Box>
            </Box>
          </Box>
        </Slide>

        <AudioRequiredDialog
          open={showAudioRequiredDialog}
          onClose={() => {
            setShowAudioRequiredDialog(false);
            onCancel();
          }}
        />
      </Box>
    );
  }

  // Portrait mode layout (original)
  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: "hidden",
        WebkitOverflowScrolling: "touch",
        willChange: "transform",
      }}
    >
      <JoinChoirBackground />
      
      {/* Help Button for Portrait */}
      <Button
        variant="outlined"
        color="secondary"
        size="large"
        sx={{
          position: "absolute",
          top: 10,
          right: 10,
          minWidth: 45,
          minHeight: 45,
          p: 0,
          borderRadius: "50%",
          color: "white",
          borderColor: "rgba(255, 255, 255, 0.5)",
          borderWidth: 1,
          width: 45,
          height: 45,
          zIndex: 10001,
        }}
        onClick={() => setShowHelp(true)}
      >
        <Help sx={{ fontSize: 30 }} />
      </Button>
      
      <Slide 
        direction="up" 
        in={true} 
        mountOnEnter 
        unmountOnExit 
        timeout={200}
        easing={{
          enter: 'cubic-bezier(0.0, 0, 0.2, 1)',
          exit: 'cubic-bezier(0.4, 0, 1, 1)',
        }}
      >
        <Box
          display="flex"
          flexDirection="column"
          sx={{
            "& .MuiFab-root": { width: 300, height: 300 },
            mx: "auto",
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Box sx={{ position: "relative" }}>
            <Skeleton
              variant="circular"
              animation="pulse"
              sx={{
                position: "absolute",
                width: 340,
                height: 340,
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                bgcolor: "secondary.main"
              }}
            />

            <Fab size="large" color="secondary" sx={{ width: 350, height: 350 }}>
              <JoinChoirSteps />
            </Fab>
          </Box>
          <Stack direction="row" alignItems="center" sx={{ mt: 4, p: 4}}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={isConsentChecked}
                  onChange={(e) => setIsConsentChecked(e.target.checked)}
                />
              }
              label={
                <Typography variant="body2" fontSize={14}>
                  {legalAgreementText}
                </Typography>
              }
            />
          </Stack>

          <Button
            variant="contained"
            disabled={!isConsentChecked || isRequestingPermission || isCheckingPermission}
            onClick={handleContinue}
          >
            {isCheckingPermission ? "Checking Permission..." : isRequestingPermission ? "Requesting Permission..." : "Continue"}
          </Button>
          <Button variant="text" onClick={onCancel}>
            Cancel
          </Button>
        </Box>
      </Slide>

        <MicrophonePermissionDialog
          open={showMicrophonePermissionDialog}
          onAllow={handlePermissionAllow}
          onBlock={handlePermissionBlock}
        />

        <MicrophoneBlockedDialog
          open={showMicrophoneBlockedDialog}
          onClose={() => {
            setShowMicrophoneBlockedDialog(false);
            onCancel();
          }}
          onNeedHelp={() => {
            setShowMicrophoneHelp(true);
          }}
        />

        <MicrophoneInstructionsDialog
          open={showMicrophoneHelp}
          onClose={() => setShowMicrophoneHelp(false)}
        />

        <HelpPopup
          open={showHelp}
          onClose={() => setShowHelp(false)}
          currentScreen="add choir"
        />

        <AudioRequiredDialog
          open={showAudioRequiredDialog}
          onClose={() => {
            setShowAudioRequiredDialog(false);
            onCancel();
          }}
        />
      </Box>
  );
};

export default JoinChoir;
