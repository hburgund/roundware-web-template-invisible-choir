import { useState, useEffect, useRef } from 'react';
import MicOffOutlinedIcon from '@mui/icons-material/MicOffOutlined';
import FullScreenOverlay from './FullScreenOverlay';

type Props = {
	open: boolean;
	onClose: () => void;
	onNeedHelp?: () => void;
	onTryAgain?: () => void;
};

const MicrophoneBlockedDialog = (props: Props) => {
	const [isMicrophonePermanentlyDenied, setIsMicrophonePermanentlyDenied] = useState(false);
	const permissionStatusRef = useRef<PermissionStatus | null>(null);

	// Check permission status
	useEffect(() => {
		if (!props.open) {
			setIsMicrophonePermanentlyDenied(false);
			return;
		}

		const checkPermission = async () => {
			try {
				if (navigator.permissions && navigator.permissions.query) {
					const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
					permissionStatusRef.current = permissionStatus;
					
					if (permissionStatus.state === 'denied') {
						setIsMicrophonePermanentlyDenied(true);
					}

					permissionStatus.onchange = () => {
						if (permissionStatus.state === 'denied') {
							setIsMicrophonePermanentlyDenied(true);
						}
					};
				}
			} catch (error) {

			}
		};

		checkPermission();

		// Cleanup when component unmounts
		return () => {
			if (permissionStatusRef.current) {
				permissionStatusRef.current.onchange = null;
				permissionStatusRef.current = null;
			}
		};
	}, [props.open]);

	return (
		<FullScreenOverlay
			open={props.open}
			onClose={props.onClose}
			icon={<MicOffOutlinedIcon sx={{ fontSize: 40 }} />}
			title="MICROPHONE BLOCKED"
			description="To join a choir by recording your voice, we need access to your microphone. If you do not wish to record, feel free to wander and listen to the choir!"
			primaryButton={{
				text: "LISTEN MORE",
				onClick: props.onClose
			}}
			secondaryButton={props.onNeedHelp ? {
				text: "MIC ACCESS HELP",
				onClick: props.onNeedHelp
			} : undefined}
			tertiaryButton={(props.onTryAgain && !isMicrophonePermanentlyDenied) ? {
				text: "TRY AGAIN",
				onClick: props.onTryAgain
			} : undefined}
			useLeafBackground={true}
			showCloseButton={false}
		/>
	);
};

export default MicrophoneBlockedDialog; 