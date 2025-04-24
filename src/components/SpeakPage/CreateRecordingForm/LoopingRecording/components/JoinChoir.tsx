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

interface JoinChoirProps {
  onContinue: () => void;
  onCancel: () => void;
  onCheckPermission: () => Promise<boolean>;
}

const JoinChoir = ({
  onContinue,
  onCancel,
  onCheckPermission,
}: JoinChoirProps) => {
  const [isConsentChecked, setIsConsentChecked] = useState(false);

  const handleContinue = async () => {
    const hasPermission = await onCheckPermission();
    if (!hasPermission) return;
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
            <Stack alignItems="center" spacing={4}>
              <Stack alignItems="center" spacing={1}>
                <Typography variant="button" fontSize={45} sx={{ textTransform: 'none'}}>Join Choir</Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  justifyContent="center"
                  alignItems="center"
                >
                  <Box sx={{ width: 55, height: 2, bgcolor: "primary.main" }} />
                  <Box sx={{ width: 55, height: 2, bgcolor: "grey.500" }} />
                  <Box sx={{ width: 55, height: 2, bgcolor: "grey.500" }} />
                </Stack>
              </Stack>
              <Typography variant="body2" fontSize={14}>
                Rehearse your
                <br />
                singing to the loop
              </Typography>
            </Stack>
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
