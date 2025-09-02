import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';

export interface BackButtonDialogProps {
  open: boolean;
  onClose: () => void;
  onStay: () => void;
  onLeave: () => void;
  title: string;
  message: string;
  stayText: string;
  leaveText: string;
}

const BackButtonDialog: React.FC<BackButtonDialogProps> = ({
  open,
  onClose,
  onStay,
  onLeave,
  title,
  message,
  stayText,
  leaveText,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="back-dialog-title"
      aria-describedby="back-dialog-description"
    >
      <DialogTitle id="back-dialog-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id="back-dialog-description">
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onStay}
          color="primary"
          variant="outlined"
          sx={{ color: 'text.primary' }}
        >
          {stayText}
        </Button>
        <Button
          onClick={onLeave}
          color="primary"
          variant="contained"
          autoFocus
          sx={{ color: 'white' }}
        >
          {leaveText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BackButtonDialog;
