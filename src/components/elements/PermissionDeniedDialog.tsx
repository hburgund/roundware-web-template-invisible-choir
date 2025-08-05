import LanguageIcon from '@mui/icons-material/Language';
import FullScreenOverlay from './FullScreenOverlay';
import { type Funcionality } from 'web-permission-messages';

type Props = {
	open: boolean;
	onClose: () => void;
	functionality: Funcionality;
};

const PermissionDeniedDialog = (props: Props) => {
	return (
		<FullScreenOverlay
			open={props.open}
			onClose={props.onClose}
			icon={<LanguageIcon sx={{ fontSize: 40 }} />}
			title="SORRY!"
			description="To participate fully in the artwork experience we need access to your location. In the meantime, please see our Youtube channel from some of our favourite choirs."
			primaryButton={{
				text: "WATCH VIDEOS",
				onClick: () => window.open('https://roundware.org/', '_blank')
			}}
			useLeafBackground={true}
			showCloseButton={false}
		/>
	);
};

export default PermissionDeniedDialog;
