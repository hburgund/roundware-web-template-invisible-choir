import React from 'react';
import WarningDialog from './WarningDialog';

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
    <WarningDialog
      open={open}
      onSecondary={onStay}
      onPrimary={onLeave}
      title={title}
      message={message}
      primaryText={leaveText}
      secondaryText={stayText}
      showSecondaryButton={true}
    />
  );
};

export default BackButtonDialog;
