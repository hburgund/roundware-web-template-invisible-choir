import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';

interface MicrophonePermissionDialogProps {
  open: boolean;
  onAllow: () => void;
  onBlock: () => void;
}

const MicrophonePermissionDialog: React.FC<MicrophonePermissionDialogProps> = ({
  open,
  onAllow,
  onBlock,
}) => {
  return (
    <Dialog 
      open={open} 
      classes={{
        paper: 'microphone-permission-dialog'
      }}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Invisible Choir</DialogTitle>
      <DialogContent>
        <DialogContentText>
          wants to use your microphone
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onBlock}>
          Block
        </Button>
        <Button variant="contained" onClick={onAllow}>
          Allow
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MicrophonePermissionDialog;