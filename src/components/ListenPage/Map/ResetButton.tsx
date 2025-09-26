import config from '@/config';
import ZoomOutMapIcon from '@mui/icons-material/ZoomOutMap';
import Fab from '@mui/material/Fab';
import { useGoogleMap } from '@react-google-maps/api';
import { useMediaQuery } from '@mui/material';

import { useRoundware } from '@/hooks';
import { Coordinates, GeoListenMode } from 'roundware-web-framework/dist/index';

type Props = {
	updateLocation: (coords: Coordinates) => void;
};

const ResetButton = ({ updateLocation }: Props) => {
	// Temporarily hidden - may be re-enabled in the future
	return null;
	
	// Original implementation (commented out for future use):
	// const map = useGoogleMap();
	// const { roundware, geoListenMode } = useRoundware();
	// const isLandscape = useMediaQuery('(orientation: landscape)', { noSsr: true });
	// if (geoListenMode != GeoListenMode.MANUAL) return null;
	// return (
	// 	<Fab
	// 		onClick={() => {
	// 			if (!map) return;
	// 			map.setZoom(config.map.zoom.low);
	// 			updateLocation(roundware.project.location);
	// 		}}
	// 		color="secondary"
	// 		className="reset-button"
	// 		sx={{
	// 			marginRight: isLandscape ? '40px' : '20px'
	// 		}}
	// 	>
	// 		<ZoomOutMapIcon />
	// 	</Fab>
	// );
};

export default ResetButton;
