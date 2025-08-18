import { Replay } from "@mui/icons-material";
import playIcon from "../../../../../../assets/icons/play_icon.svg";
import micIcon from "../../../../../../assets/icons/mic_icon.svg";
import micRecordingIcon from "../../../../../../assets/icons/mic_recording_icon.svg";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  useTheme,
} from "@mui/material";
import { memo, useState } from "react";
import { useLoopingRecording } from "../../useLoopingRecording";
import { useLoopContext } from "../../LoopContext";
import ConfirmationDialog from "@/components/elements/ConfirmationDialog";

interface ControlButtonProps {
  mode: ReturnType<typeof useLoopingRecording>["loop"]["mode"];
  onPlayClick: () => void;
  onRecordClick: () => void;
}

const ControlButton = memo(
  ({ mode, onPlayClick, onRecordClick }: ControlButtonProps) => {
    const theme = useTheme();
    const { recorder } = useLoopContext();
    const [rerecordWarningOpen, setRerecordWarningOpen] = useState(false);

    return (
      <Box
        position={"absolute"}
        sx={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 3,
        }}
      >
        {mode === "idle" ? (
          <IconButton size="large" onClick={onPlayClick}>
            <img 
              src={playIcon} 
              alt="play" 
              style={{ width: 60, height: 60 }}
            />
          </IconButton>
        ) : mode === "playing-speaker" ? (
          <IconButton onClick={onRecordClick}>
            <img 
              src={micIcon} 
              alt="mic" 
              style={{ width: 60, height: 60 }}
            />
          </IconButton>
        ) : mode === "recording" ? (
          <Box
            width={60}
            height={60}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              borderRadius: "50%",
            }}
          >
            <img 
              src={micRecordingIcon} 
              alt="mic recording" 
              style={{ width: 60, height: 60 }}
            />
          </Box>
        ) : mode === "recording-playback" ? (
          <Button
            variant="outlined"
            color="primary"
            className="MuiButton-rerecord"
            startIcon={<Replay />}
            onClick={() => {
              setRerecordWarningOpen(true);
            }}
          >
            Re-Record
          </Button>
        ) : mode === "preparing-to-record" || mode === "processing-recording" ? (
          <Box
            width={60}
            height={60}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              borderRadius: "50%",
            }}
          >
            <Typography variant="h6" sx={{ color: "white" }}>
              {mode === "preparing-to-record" ? "..." : "..."}
            </Typography>
          </Box>
        ) : mode === "countdown-to-record" ? (
          // Don't show anything during countdown - BeatCountdown will handle this
          null
        ) : mode === "loading" ? (
          <Typography 
            variant="body1" 
            color="primary"
          >
            LOADING PREVIEW
          </Typography>
        ) : null}

      <ConfirmationDialog
        open={rerecordWarningOpen}
        onClose={() => setRerecordWarningOpen(false)}
        onConfirm={() => {
          setRerecordWarningOpen(false);
          recorder.startRecordingProcess();
        }}
        icon={<Replay sx={{ fontSize: 40 }} />}
        title="Re-record"
        description="Are you sure? 
        You will lose your recording."
        confirmText="Yes, Re-record"
        cancelText="Cancel"
      />

      </Box>
    );
  }
);

export default ControlButton;
