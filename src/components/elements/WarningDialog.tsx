import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';

export interface WarningDialogProps {
  open: boolean;
  onSecondary: () => void;
  onPrimary: () => void;
  title: string;
  message: string;
  primaryText?: string;
  secondaryText?: string;
  showSecondaryButton?: boolean;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
}

const WarningDialog: React.FC<WarningDialogProps> = ({
  open,
  onSecondary,
  onPrimary,
  title,
  message,
  primaryText = 'OK',
  secondaryText = 'Cancel',
  showSecondaryButton = true,
  maxWidth = 'sm',
  fullWidth = true,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onSecondary}
      aria-labelledby="warning-dialog-title"
      aria-describedby="warning-dialog-description"
      maxWidth={maxWidth}
      fullWidth={fullWidth}
    >
      <DialogTitle id="warning-dialog-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id="warning-dialog-description">
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        {showSecondaryButton && (
          <Button
            onClick={onSecondary}
            color="primary"
            variant="outlined"
            sx={{ color: 'text.primary' }}
          >
            {secondaryText}
          </Button>
        )}
        <Button
          onClick={onPrimary}
          color="primary"
          variant="contained"
          autoFocus
          sx={{ color: 'white' }}
        >
          {primaryText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WarningDialog;
