import PermissionDeniedDialog from "@/components/elements/PermissionDeniedDialog";
import { Box, Stack, Typography, CircularProgress } from "@mui/material";
import { Prompt } from "react-router-dom";
import { useLoopContext } from "../../LoopContext";
import StepIndicator from "../StepIndicator";
import { memo, useRef, useEffect } from "react";
import AnimatedCircle from "./AnimatedCircle";
import ControlButton from "./ControlButton";
import BeatCountdown from "./BeatCountdown";
import { useDimensions } from "./hooks";

interface RecordingControlsProps {
  userConfirmedLeaving?: boolean;
}

const RecordingControls = ({ userConfirmedLeaving = false }: RecordingControlsProps) => {
  const { loop, recorder, submission, speaker } = useLoopContext();
  const dimensions = useDimensions();
  const beatCountdownRef = useRef<any>(null);

  // Helper to forcibly stop click track
  const stopCountdownClick = () => {
    if (beatCountdownRef.current && beatCountdownRef.current.stopClickTrack) {
      beatCountdownRef.current.stopClickTrack();
      console.log('[RecordingControls] Forcibly stopped countdown click track');
    }
  };

  // Stop countdown click track when user confirms leaving
  useEffect(() => {
    if (userConfirmedLeaving) {
      console.log('[RecordingControls] User confirmed leaving - stopping countdown click track');
      stopCountdownClick();
    }
  }, [userConfirmedLeaving]);

  // Show loading state until speaker is ready
  if (!speaker.duration) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Typography variant="h5" sx={{ color: "white", textAlign: "center" }}>
          Generating sing-along loop...
        </Typography>
        <CircularProgress sx={{ color: "white" }} />
      </Box>
    );
  }

  // Ensure AudioContext is resumed on user gesture
  const handlePlayClick = async () => {
    if (loop.audioContext.current.state !== 'running') {
      await loop.audioContext.current.resume();
      console.log('[RecordingControls] AudioContext resumed on play', loop.audioContext.current.state);
    }
    stopCountdownClick();
    loop.start("playing-speaker");
  };

  const handleRecordClick = async () => {
    if (loop.audioContext.current.state !== 'running') {
      await loop.audioContext.current.resume();
      console.log('[RecordingControls] AudioContext resumed on record', loop.audioContext.current.state);
    }
    stopCountdownClick();
    recorder.startRecordingProcess();
  };

  return (
    <Stack spacing={8} height={"100%"}>
      <Box pt={15}>
        <StepIndicator />
      </Box>
      <Box
        position={"absolute"}
        sx={{
          top: "calc(50% - 100px)",
          transform: "translateY(-50%)",
        }}
      >
        <Box
          position="relative"
          width={dimensions.svgSize}
          height={dimensions.svgSize}
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Box zIndex={2}>
            <AnimatedCircle
              dimensions={dimensions}
              mode={loop.mode}
              startedAtTime={loop.startedAtTime}
              duration={speaker.duration}
              isRecording={loop.mode === "recording"}
            />
          </Box>
          <ControlButton
            mode={loop.mode}
            onPlayClick={handlePlayClick}
            onRecordClick={handleRecordClick}
          />
          <BeatCountdown
            ref={beatCountdownRef}
            isVisible={loop.mode === "countdown-to-record"}
            onComplete={recorder.startRecordingAfterCountdown}
            duration={speaker.duration}
            audioContext={loop.audioContext.current}
          />
        </Box>
      </Box>
      <Box
        sx={{
          position: "absolute",
          bottom: "20%",
          left: 0,
          right: 0,
          textAlign: "center",
        }}
      >
        <Typography variant="h6" textTransform={"uppercase"} fontWeight="300" fontSize={16}>
          {loop.mode === "idle"
            ? "Press play to start rehearsing"
            : loop.mode === "playing-speaker"
            ? "Press record when ready to sing"
            : loop.mode === "preparing-to-record"
            ? "Preparing to record..."
            : loop.mode === "countdown-to-record"
            ? "Get ready to record..."
            : loop.mode === "recording"
            ? "Recording..."
            : loop.mode === "processing-recording"
            ? "Processing recording..."
            : ""}
        </Typography>
      </Box>
      <Box />
      <PermissionDeniedDialog
        open={recorder.isPermissionDenied}
        onClose={() => recorder.setIsPermissionDenied(false)}
        functionality="microphone"
      />
      <Prompt
        when={!!recorder.recordedAudioBlob && submission.status !== "submitted" && !userConfirmedLeaving}
        message={JSON.stringify({
          message: `Are you sure you want to leave without submitting your recording? If you do, your recording will be deleted.`,
          stay: `Keep Recording`,
          leave: `Delete Recording`,
        })}
      />
    </Stack>
  );
};

export default memo(RecordingControls);
