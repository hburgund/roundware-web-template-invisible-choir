import ConfirmationDialog from "@/components/elements/ConfirmationDialog";
import { Close, Logout } from "@mui/icons-material";
import ReplayIcon from "@mui/icons-material/Replay";
import { LightbulbOutlined } from "@mui/icons-material";
import { Box, Button, Fab } from "@mui/material";
import { useState, useEffect } from "react";
import { Prompt, useHistory } from "react-router";
import JoinChoir from "./components/JoinChoir";
import RecordingControls from "./components/RecordingControls";
import SubmissionControls from "./components/SubmissionControls";
import ProcessingOverlay from "./components/ProcessingOverlay";
import { useLoopContext, withLoopContext } from "./LoopContext";
import { useRoundware, useCurrentScreen } from "@/hooks";
import MicrophoneBlockedDialog from "@/components/elements/MicrophoneBlockedDialog";
import MicrophoneInstructionsDialog from "@/components/elements/MicrophoneInstructionsDialog";
import AudioRequiredDialog from "@/components/elements/AudioRequiredDialog";
import AudioLevelMeter from "./components/AudioLevelMeter";
import { useAudioLevelMeter } from "./hooks/useAudioLevelMeter";
import HelpPopup from "@/components/HelpPopup";
import BackButtonDialog from "@/components/elements/BackButtonDialog";

const LoopingRecordingForm = () => {
  const { recorder, submission, location, loop } = useLoopContext();
  const { roundware } = useRoundware();
  const currentScreen = useCurrentScreen(loop.mode);
  const [showJoinChoirPage, setShowJoinChoirPage] = useState(true);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showRerecordConfirm, setShowRerecordConfirm] = useState(false);
  const [showThankYouConfirm, setShowThankYouConfirm] = useState(false);
  const [showMicrophoneHelp, setShowMicrophoneHelp] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [userConfirmedLeaving, setUserConfirmedLeaving] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [nextTx, setNextTx] = useState<any>(null);


  // Audio level meter hook
  const { immediateLevel, averageLevel, isVisible: isMeterVisible } = useAudioLevelMeter();
  const [currentPath, setCurrentPath] = useState<string | null>(null);

  const history = useHistory();

  // Comprehensive cleanup function to stop all audio and clear resources
  const cleanupRecordingSession = () => {
    console.log("🧹 Starting comprehensive cleanup of recording session");
    
    // Clean up all audio resources (sources, timers, state)
    loop.cleanupAllAudioResources();
    
    // Clean up all recording resources (streams, timers, blobs, etc.)
    recorder.cleanupAllRecordingResources();
    
    // Suspend AudioContext to save resources
    if (loop.audioContext.current.state !== 'suspended') {
      loop.audioContext.current.suspend().then(() => {
        console.log("🔇 AudioContext suspended for cleanup");
      }).catch(err => {
        console.warn("⚠️ Failed to suspend AudioContext:", err);
      });
    }
    
    console.log("✅ Recording session cleanup completed");
  };

  // Watch for successful submission to show thank you dialog
  useEffect(() => {
    if (submission.status === "submitted") {
      console.log("✅ Submission status changed to submitted, showing thank you dialog");
      setShowThankYouConfirm(true);
    }
  }, [submission.status]);

  // Watch for confirmed leaving to trigger navigation
  useEffect(() => {
    if (userConfirmedLeaving) {
      console.log("🚪 User confirmed leaving - cleaning up and navigating to listen page");
      cleanupRecordingSession();
      history.push("/listen", { source: 'recording' });
    }
  }, [userConfirmedLeaving, history]);

  // Create a retry function that bypasses legal agreement
  const handleRetry = async () => {
    console.log("🔄 Retrying submission without legal agreement");
    await submission.start();
  };

  // Store current path when component mounts
  useEffect(() => {
    setCurrentPath(window.location.pathname);
  }, []);

  // History blocking to prevent navigation until user confirms
  useEffect(() => {
    const unblock = history.block((tx) => {
      if (currentPath === "/speak/recording" && !userConfirmedLeaving && !showJoinChoirPage && !showLeaveDialog) {
        console.log("🚫 Blocking navigation, showing leave dialog");
        setShowLeaveDialog(true);
        setNextTx(tx); // save the attempted navigation
        return false; // block navigation for now
      }
      return; // allow navigation
    });

    return () => unblock();
  }, [history, currentPath, userConfirmedLeaving, showJoinChoirPage, showLeaveDialog]);

  // Cleanup on unmount & back button handling
  useEffect(() => {
    
    return () => {
      console.log("🧹 LoopingRecordingForm unmounting - cleaning up");
      cleanupRecordingSession();
    };
  }, []);

  return (
    <Box
      sx={{
        overflow: "hidden",
        width: "100%",
        height: "100%",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      {recorder.isAudioDeviceMissing && (
        <AudioRequiredDialog
          open={recorder.isAudioDeviceMissing}
          onClose={() => {
            recorder.setIsAudioDeviceMissing(false);
            setShowJoinChoirPage(true);
          }}
        />
      )}
      {recorder.isPermissionDenied && (
        <MicrophoneBlockedDialog
          open={recorder.isPermissionDenied}
          onClose={() => {
            recorder.setIsPermissionDenied(false);
            history.push("/listen", { source: 'recording' });
          }}
          onNeedHelp={() => {
            setShowMicrophoneHelp(true);
          }}
        />
      )}
      {showJoinChoirPage ? (
        <JoinChoir
          onContinue={() => {
            setShowJoinChoirPage(false);
          }}
          onCancel={() => {
            console.log("🚪 User cancelled from Join Choir page - cleaning up");
            cleanupRecordingSession();
            history.push("/listen", { source: 'recording' });
          }}
          onPermissionDenied={() => {
            console.log("🎤 Microphone permission denied on Join Choir page");
            // show the MicrophoneBlockedDialog
            recorder.setIsPermissionDenied(true);
          }}
          onAudioDeviceMissing={() => {
            // show the AudioRequiredDialog
            recorder.setIsAudioDeviceMissing(true);
          }}
        />
      ) : (
        <RecordingControls userConfirmedLeaving={userConfirmedLeaving} />
      )}

      <SubmissionControls
        hasRecording={!!recorder.recordedAudioBlob}
        submissionStatus={submission.status}
        errorDetails={submission.errorDetails}
        onLegalAccept={async () => {
          console.log("📋 Legal agreement accepted, starting submission");
          await submission.start();
          // Thank you dialog will be shown via useEffect when status becomes "submitted"
        }}
        onLegalDecline={() => {}}
        onReset={submission.reset}
        onRetry={handleRetry}
      />

      <ConfirmationDialog
        open={showRerecordConfirm}
        onClose={() => setShowRerecordConfirm(false)}
        onConfirm={() => {
          setShowRerecordConfirm(false);
          recorder.startRecordingProcess();
        }}
        icon={<ReplayIcon sx={{ fontSize: 40 }} />}
        title="Re-record"
        description="Are you sure? You will lose your recording."
        confirmText="Yes, Re-record"
        cancelText="Cancel"
      />

      <ConfirmationDialog
        open={showCloseConfirm}
        onClose={() => setShowCloseConfirm(false)}
        onConfirm={() => {
          setShowCloseConfirm(false);
          setUserConfirmedLeaving(true); // This will trigger navigation via useEffect
          console.log("🚪 User confirmed leaving - setting flag to bypass router prompt");
        }}
        icon={<Logout sx={{ fontSize: 40 }} />}
        title="Leave Choir"
        description="Are you sure you want to leave this choir?
        You will lose your recording."
        confirmText="Yes, Leave"
        cancelText="Cancel"
      />

      {/* Back Button Dialog */}
      <BackButtonDialog
        open={showLeaveDialog}
        onClose={() => setShowLeaveDialog(false)}
        onStay={() => {
          setShowLeaveDialog(false)
          setNextTx(null)
        }}
        onLeave={() => {
          setShowLeaveDialog(false);
          // Set flag to allow navigation and trigger cleanup
          setUserConfirmedLeaving(true);
        }}
        title="Warning"
        message="Are you sure you want to leave without submitting your recording? If you do, your recording will be deleted."
        stayText="Keep Recording"
        leaveText="Delete Recording"
      />

      <ConfirmationDialog
        open={showThankYouConfirm}
        onClose={() => {
          // Use current listener location instead of static query location
          const currentLocation = roundware.listenerLocation;
          history.push(`/listen?latitude=${currentLocation.latitude}&longitude=${currentLocation.longitude}`, { source: 'recording' });
        }}
        onConfirm={() => {
          // Use current listener location instead of static query location
          const currentLocation = roundware.listenerLocation;
          history.push(`/listen?latitude=${currentLocation.latitude}&longitude=${currentLocation.longitude}`, { source: 'recording' });
        }}
        icon={<Logout sx={{ fontSize: 40 }} />}
        title="Thank You!"
        description="Your voice has been added to the choir and can now be heard with the other voices in this location."
        confirmText="Listen"
        cancelText=""
      />

      {!showJoinChoirPage && (
        <>
          <Button
            variant="outlined"
            size="small"
            sx={{
              position: "absolute",
              top: 30,
              right: 25,
              minWidth: 45,
              minHeight: 45,
              width: 45,
              height: 45,
              p: 0,
              borderRadius: "50%",
              color: "white",
              borderColor: "rgba(255, 255, 255, 0.5)"
            }}
            onClick={() => setShowCloseConfirm(true)}
          >
            <Close />
          </Button>

          {/* Help Button */}
          <Button
            variant="contained"
            color="info"
            size="large"
            sx={{
              position: "absolute",
              top: 30,
              right: 90,
              minWidth: 45,
              minHeight: 45,
              p: 0,
              borderRadius: "50%",
              color: "white",
              borderColor: "rgba(255, 255, 255, 0.5)",
              width: 45,
              height: 45,
            }}
            onClick={() => setShowHelp(true)}
          >
            <LightbulbOutlined sx={{ fontSize: 20 }} />
          </Button>
        </>
      )}

      <ProcessingOverlay
        isVisible={loop.mode === "processing-recording" || loop.mode === "preparing-to-record"}
        message={loop.mode === "preparing-to-record" ? "Preparing to record..." : "Processing recording..."}
      />

      <MicrophoneInstructionsDialog
        open={showMicrophoneHelp}
        onClose={() => setShowMicrophoneHelp(false)}
      />

      <HelpPopup
        open={showHelp}
        onClose={() => setShowHelp(false)}
        currentScreen={currentScreen}
      />

      {/* Audio Level Meter - displays during recording */}
      <AudioLevelMeter
        immediateLevel={immediateLevel}
        averageLevel={averageLevel}
        isVisible={isMeterVisible}
      />
    </Box>
  );
};

export default withLoopContext(LoopingRecordingForm);
