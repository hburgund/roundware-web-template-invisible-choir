import React from 'react';
import FullScreenOverlay from './FullScreenOverlay';

interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  icon?: React.ReactNode;
  title: string;
  description: string;
  confirmText: string;
  cancelText?: string;
  showCloseButton?: boolean;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  onClose,
  onConfirm,
  icon,
  title,
  description,
  confirmText,
  cancelText,
  showCloseButton
}) => {
  return (
    <FullScreenOverlay
      open={open}
      onClose={onClose}
      icon={icon}
      title={title}
      description={description}
      showCloseButton={showCloseButton}
      primaryButton={{
        text: confirmText,
        onClick: onConfirm
      }}
      secondaryButton={cancelText ? {
        text: cancelText,
        onClick: onClose
      } : undefined}
    />
  );
};

export default ConfirmationDialog; 