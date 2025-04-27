import config from '@/config';
import ZoomOutMapIcon from '@mui/icons-material/ZoomOutMap';
import Fab from '@mui/material/Fab';
import { useGoogleMap } from '@react-google-maps/api';

import { useRoundware } from '@/hooks';
import { Coordinates, GeoListenMode } from 'roundware-web-framework/dist/index';

type Props = {
	updateLocation: (coords: Coordinates) => void;
};

const ResetButton = ({ updateLocation }: Props) => {
	const map = useGoogleMap();
	const { roundware, geoListenMode } = useRoundware();
	if (geoListenMode != GeoListenMode.MANUAL) return null;
	return (
		<Fab
			onClick={() => {
				if (!map) return;
				map.setZoom(config.map.zoom.low);
				updateLocation(roundware.project.location);
			}}
			color="secondary"
			className="reset-button"
		>
			<ZoomOutMapIcon />
		</Fab>
	);
};

export default ResetButton;
