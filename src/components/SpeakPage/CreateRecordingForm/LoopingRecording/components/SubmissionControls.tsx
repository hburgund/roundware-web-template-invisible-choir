import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogContentText,
  Stack,
} from "@mui/material";
import LegalAgreementForm from "@/components/LegalAgreementForm";
import { useState } from "react";

interface SubmissionError {
  type: 'network' | 'server' | 'validation' | 'unknown';
  message: string;
  originalError?: any;
  retryable: boolean;
}

interface SubmissionControlsProps {
  hasRecording: boolean;
  submissionStatus: "idle" | "submitting" | "submitted" | "error";
  errorDetails?: SubmissionError | null;

  onLegalAccept: () => Promise<void>;
  onLegalDecline: () => void;
  onReset?: () => void;
  onRetry?: () => Promise<void>;
}

const SubmissionControls = ({
  hasRecording,
  submissionStatus,
  errorDetails,
  onLegalAccept,
  onLegalDecline,
  onReset,
  onRetry,
}: SubmissionControlsProps) => {
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  
  // Debug logging (can be removed once testing is complete)
  console.log('🎯 SubmissionControls render:', { 
    hasRecording, 
    submissionStatus, 
    errorDetails,
    errorDialogShouldOpen: submissionStatus === "error"
  });

  if (!hasRecording) return null;

  return (
    <>
      <Stack
        spacing={10}
        alignItems={"center"}
        sx={{ position: "absolute", bottom: 150, width: "100%" }}
      >
        <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              setLegalModalOpen(true);
            }}
            size="large"
          >
            Submit Recording
          </Button>
        </Box>
      </Stack>

      <Dialog open={legalModalOpen}>
        <LegalAgreementForm
          onDecline={() => {
            setLegalModalOpen(false);
            onLegalDecline();
          }}
          onAccept={async () => {
            setLegalModalOpen(false);
            await onLegalAccept();
          }}
        />
      </Dialog>

      <Dialog open={submissionStatus === "submitting"}>
        <DialogContent>
          <CircularProgress color={"primary"} style={{ margin: "auto" }} />
          <DialogContentText>
            Uploading your contribution now! Please keep this page open until we
            finish uploading.
          </DialogContentText>
        </DialogContent>
      </Dialog>

      <Dialog 
        open={submissionStatus === "error"}
        disableEscapeKeyDown={false}
        maxWidth="sm"
        fullWidth
      >
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {errorDetails?.message || "We encountered an error while trying to upload your contribution. Please try again later."}
          </DialogContentText>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
            {errorDetails?.retryable && (
              <Button
                variant="contained"
                color="primary"
                onClick={async () => {
                  console.log('🔄 Retry button clicked - bypassing legal agreement');
                  // Reset error state and retry directly (skip legal modal)
                  onReset?.();
                  await onRetry?.();
                }}
              >
                Try Again
              </Button>
            )}
            <Button
              variant="outlined"
              onClick={() => {
                console.log('❌ Close error dialog clicked');
                // Reset error state to close dialog
                onReset?.();
              }}
            >
              Close
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SubmissionControls;
