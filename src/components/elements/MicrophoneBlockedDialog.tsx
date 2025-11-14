import MicOffOutlinedIcon from '@mui/icons-material/MicOffOutlined';
import FullScreenOverlay from './FullScreenOverlay';

type Props = {
	open: boolean;
	onClose: () => void;
	onNeedHelp?: () => void;
	onTryAgain?: () => void;
};

const MicrophoneBlockedDialog = (props: Props) => {
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
			tertiaryButton={props.onTryAgain ? {
				text: "TRY AGAIN",
				onClick: props.onTryAgain
			} : undefined}
			useLeafBackground={true}
			showCloseButton={false}
		/>
	);
};

export default MicrophoneBlockedDialog; 