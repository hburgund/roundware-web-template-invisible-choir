import { Box, Typography, CircularProgress } from "@mui/material";

interface ProcessingOverlayProps {
  isVisible: boolean;
  message?: string;
}

const ProcessingOverlay = ({ isVisible, message = "Processing recording..." }: ProcessingOverlayProps) => {
  if (!isVisible) return null;

  return (
    <Box
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
      }}
    >
      <CircularProgress
        size={60}
        sx={{
          color: "white",
          marginBottom: 2,
        }}
      />
      <Typography
        variant="h6"
        sx={{
          color: "white",
          textAlign: "center",
          textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
        }}
      >
        {message}
      </Typography>
    </Box>
  );
};

export default ProcessingOverlay; 