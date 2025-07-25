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
import { Fade } from "@mui/material";
import { useState } from "react";
import JoinChoirBackground from "./JoinChoirBackground";
import JoinChoirSteps from "./JoinChoirSteps";

interface JoinChoirProps {
  onContinue: () => void;
  onCancel: () => void;
  onCheckPermission?: () => Promise<boolean>; // Made optional since we no longer use it
}

const JoinChoir = ({
  onContinue,
  onCancel,
  onCheckPermission,
}: JoinChoirProps) => {
  const [isConsentChecked, setIsConsentChecked] = useState(false);

  const handleContinue = async () => {
    // Only check consent, don't request microphone permission yet
    // Microphone permission will be requested when user actually starts recording
    onContinue();
  };

  return (
    <Fade mountOnEnter unmountOnExit in={true}>
      <Box
        display="flex"
        flexDirection="column"
        sx={{
          "& .MuiFab-root": { width: 300, height: 300 },
          mx: "auto",
        }}
        position={"absolute"}
        top={0}
        left={0}
        right={0}
        bottom={0}
        justifyContent={"center"}
        alignItems={"center"}
      >
        <JoinChoirBackground />
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
                I consent to my recording being used solely for the artistic
                purposes of Invisible Choir
              </Typography>
            }
          />
        </Stack>
        <Button
          variant="contained"
          disabled={!isConsentChecked}
          onClick={handleContinue}
        >
          Continue
        </Button>
        <Button variant="text" onClick={onCancel}>
          Cancel
        </Button>
      </Box>
    </Fade>
  );
};

export default JoinChoir;
