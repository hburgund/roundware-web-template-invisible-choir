import makeStyles from '@mui/styles/makeStyles';
import React from 'react';
import { useLocation } from 'react-router';
import RoundwareMap from './Map';

interface ListenPageLocationState {
  source?: string;
}

const useStyles = makeStyles((theme) => {
	return {
		map: {
			display: 'flex',
		},
	};
});

const ListenPage = () => {
	const classes = useStyles();
	const location = useLocation<ListenPageLocationState>();
	
	// Determine button text based on where user came from
	// If they came from intro, show "LAUNCH", otherwise show "PLAY"
	const buttonText = location.state?.source === 'intro' ? 'LAUNCH' : 'PLAY';

	if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
		console.warn(`GOOGLE_MAPS_API_KEY was not found in env variable. Please pass it to enable Google Maps component.`);
		return null;
	}
	return (
		<>
			<RoundwareMap 
				className={classes.map} 
				googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
				buttonText={buttonText}
			/>
		</>
	);
};

export default ListenPage;
