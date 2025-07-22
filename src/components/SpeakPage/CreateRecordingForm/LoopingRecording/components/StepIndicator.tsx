import { Box, Stack, Typography } from "@mui/material";
import { useLoopContext } from "../LoopContext";

const StepIndicator = () => {
  const { loop } = useLoopContext();
  const steps = [
    { label: "REHEARSE", key: "rehearsal" },
    { label: "RECORDING", key: "recording" },
    { label: "REVIEW", key: "review" },
  ];

  const activeKey =
    loop.mode === "idle"
      ? "rehearsal"
      : loop.mode === "playing-speaker"
      ? "rehearsal"
      : loop.mode === "preparing-to-record"
      ? "rehearsal"
      : loop.mode === "countdown-to-record"
      ? "rehearsal"
      : loop.mode === "recording"
      ? "recording"
      : loop.mode === "processing-recording"
      ? "recording"
      : loop.mode === "recording-playback"
      ? "review"
      : "rehearsal";

  console.log(loop.mode);

  return (
    <Stack
      direction="row"
      spacing={1}
      justifyContent="center"
      alignItems="flex-start"
    >
      {steps.map((step) => (
        <Stack
          key={step.key}
          direction="column"
          alignItems="center"
          spacing={1}
        >
          <Box
            sx={{
              width: 100,
              height: 2,
              backgroundColor: (t) =>
                activeKey === step.key
                  ? t.palette.primary.main
                  : t.palette.text.disabled,
            }}
          />
          {activeKey === step.key && (
            <Typography
              variant="body2"
              fontWeight="300"
              fontSize={14}
              color="primary.main"
            >
              {step.label}
            </Typography>
          )}
        </Stack>
      ))}
    </Stack>
  );
};

export default StepIndicator;
