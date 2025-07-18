import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import FullScreenOverlay from './FullScreenOverlay';

type Props = {
	open: boolean;
	onClose: () => void;
};

const LocationNotFoundDialog = (props: Props) => {
	return (
		<FullScreenOverlay
			open={props.open}
			onClose={props.onClose}
			icon={<LocationOnOutlinedIcon />}
			title="LOCATION NOT FOUND!"
			description="Sorry we couldn't find your location. Please refresh you browser and try again."
			primaryButton={{
				text: "GOT IT!",
				onClick: props.onClose
			}}
			showCloseButton={false}
		/>
	);
};

export default LocationNotFoundDialog; 