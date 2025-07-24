import MicExternalOnIcon from '@mui/icons-material/MicExternalOn';
import FullScreenOverlay from './FullScreenOverlay';

type Props = {
	open: boolean;
	onClose: () => void;
};

const AudioRequiredDialog = (props: Props) => {
	return (
		<FullScreenOverlay
			open={props.open}
			onClose={props.onClose}
			icon={<MicExternalOnIcon sx={{ fontSize: 40 }} />}
			title="AUDIO REQUIRED"
			description="We notice that your device doesn't allow for audio experiences. Invisible Choir is a music project that requires audio, so please plug in speakers and a mic or try on a different device. Thanks!"
			primaryButton={{
				text: "GOT IT!",
				onClick: props.onClose
			}}
			useLeafBackground={true}
			showCloseButton={false}
		/>
	);
};

export default AudioRequiredDialog; 