import ConfirmationDialog from "@/components/elements/ConfirmationDialog";
import { Close, Logout } from "@mui/icons-material";
import ReplayIcon from "@mui/icons-material/Replay";
import { Box, Button } from "@mui/material";
import { useState, useEffect } from "react";
import { useHistory } from "react-router";
import JoinChoir from "./components/JoinChoir";
import RecordingControls from "./components/RecordingControls";
import SubmissionControls from "./components/SubmissionControls";
import { useLoopContext, withLoopContext } from "./LoopContext";

const LoopingRecordingForm = () => {
  const { recorder, submission, location } = useLoopContext();
  const [showJoinChoirPage, setShowJoinChoirPage] = useState(true);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showRerecordConfirm, setShowRerecordConfirm] = useState(false);
  const [showThankYouConfirm, setShowThankYouConfirm] = useState(false);
  const [userConfirmedLeaving, setUserConfirmedLeaving] = useState(false);

  const history = useHistory();

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
      console.log("🚪 User confirmed leaving - navigating to listen page");
      history.push("/listen");
    }
  }, [userConfirmedLeaving, history]);

  // Create a retry function that bypasses legal agreement
  const handleRetry = async () => {
    console.log("🔄 Retrying submission without legal agreement");
    await submission.start();
  };

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
      {showJoinChoirPage ? (
        <JoinChoir
          onContinue={() => {
            setShowJoinChoirPage(false);
          }}
          onCancel={() => {
            history.push("/listen");
          }}
          onCheckPermission={recorder.checkMicrophonePermission}
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
          recorder.scheduleRecording();
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

      <ConfirmationDialog
        open={showThankYouConfirm}
        onClose={() => {
          history.push(`/listen?latitude=${location.lat}&longitude=${location.lng}`);
        }}
        onConfirm={() => {
          history.push(`/listen?latitude=${location.lat}&longitude=${location.lng}`);
        }}
        icon={<Logout sx={{ fontSize: 40 }} />}
        title="Thank You!"
        description="Your voice has been added to the choir and can now be heard with the other voices in this location."
        confirmText="Listen"
        cancelText=""
      />

      {!showJoinChoirPage && (
        <Button
          variant="outlined"
          size="small"
          sx={{
            position: "absolute",
            top: 15,
            right: 25,
            minWidth: 0,
            p: 1,
            borderRadius: "50%",
            color: "white",
            borderColor: "rgba(255, 255, 255, 0.5)"
          }}
          onClick={() => setShowCloseConfirm(true)}
        >
          <Close />
        </Button>
      )}
    </Box>
  );
};

export default withLoopContext(LoopingRecordingForm);
