import MicOffOutlinedIcon from '@mui/icons-material/MicOffOutlined';
import FullScreenOverlay from './FullScreenOverlay';

type Props = {
	open: boolean;
	onClose: () => void;
	onNeedHelp?: () => void;
};

const MicrophoneBlockedDialog = (props: Props) => {
	return (
		<FullScreenOverlay
			open={props.open}
			onClose={props.onClose}
			icon={<MicOffOutlinedIcon sx={{ fontSize: 40 }} />}
			title="MICROPHONE BLOCKED"
			description="To participate fully in the artwork we need access to your microphone. In the meantime, you can still listen to our choirs in your current location."
			primaryButton={{
				text: "GOT IT!",
				onClick: props.onClose
			}}
			secondaryButton={props.onNeedHelp ? {
				text: "NEED MORE HELP",
				onClick: props.onNeedHelp
			} : undefined}
			useLeafBackground={true}
			showCloseButton={false}
		/>
	);
};

export default MicrophoneBlockedDialog; 