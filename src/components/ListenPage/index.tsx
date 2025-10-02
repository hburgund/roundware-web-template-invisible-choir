import makeStyles from '@mui/styles/makeStyles';
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router';
import RoundwareMap from './Map';
import WelcomeAudioOverlay from '../WelcomeAudioOverlay';
import config from '@/config';

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
	const [showWelcomeAudio, setShowWelcomeAudio] = useState(false);
	const [welcomeAudioCompleted, setWelcomeAudioCompleted] = useState(false);
	
	// Determine button text based on where user came from
	// If they came from intro, show "LAUNCH", otherwise show "PLAY"
	const buttonText = location.state?.source === 'intro' ? 'LAUNCH' : 'PLAY';

	// Show welcome audio overlay when coming from intro page
	useEffect(() => {
    if (location.state?.source === 'intro' && config.features?.useAudioWelcome !== false) {
			setShowWelcomeAudio(true);
		} else {
			// No welcome audio, mark as completed immediately
			setWelcomeAudioCompleted(true);
		}
	}, [location.state?.source]);

	const handleCloseWelcomeAudio = () => {
		setShowWelcomeAudio(false);
		setWelcomeAudioCompleted(true);
	};

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
				welcomeAudioCompleted={welcomeAudioCompleted}
			/>
			<WelcomeAudioOverlay 
				open={showWelcomeAudio}
				onClose={handleCloseWelcomeAudio}
			/>
		</>
	);
};

export default ListenPage;
