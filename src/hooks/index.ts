import DraftRecordingContext from '../context/DraftRecordingContext';
import RoundwareContext from '../context/RoundwareContext';
import { useContext } from 'react';

import { useLocation } from 'react-router';
// A custom hook that builds on useLocation to parse
// the query string for you.
export const useQuery = () => {
	const location = useLocation();
	return new URLSearchParams(location.search);
};
export const useRoundware = () => {
	const context = useContext(RoundwareContext);
	return context;
};
export const useRoundwareDraft = () => useContext(DraftRecordingContext);

export const useLocationFromQuery = () => {
	const query = useQuery();
	const lat = parseFloat(query.get('lat') as string) || 0;
	const lng = parseFloat(query.get('lng') as string) || 0;
	return { lat, lng };
};

// Custom hook to determine current screen based on route and app state
export const useCurrentScreen = (loopMode?: string) => {
	const location = useLocation();
	const { roundware } = useRoundware();
	
	if (location.pathname.includes('/speak/recording')) {
		if (loopMode) {
			// recording phases based on StepIndicator logic
			switch (loopMode) {
				case 'idle':
					return 'rehearse';
				case 'recording':
					return 'recording';
				case 'recording-playback':
					return 'review';
			}
		}
		return 'rehearse';
	} 
	else if (location.pathname.startsWith('/listen')) {
		if (roundware.mixer?.playing) {
			return 'add choir';
		} else {
			return 'listen';
		}
	}
	return 'listen';
};
