import { PolygonProps } from '@react-google-maps/api';
import { getFillColorsFromConfig } from '@/utils/colors';

export const speakerPolygonColors = getFillColorsFromConfig();
export const speakerPolygonOptions: PolygonProps[`options`] = {
	clickable: false,
	draggable: false,
	editable: false,
	strokeOpacity: 0,
	strokeWeight: 0,
	// fillOpacity removed - now uses config.map.speakerDisplayDefaults.fillOpacity
	strokeColor: undefined,
};
