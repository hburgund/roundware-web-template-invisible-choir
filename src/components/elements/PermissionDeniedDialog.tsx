import React, { useState, useEffect } from 'react';
import LanguageIcon from '@mui/icons-material/Language';
import FullScreenOverlay from './FullScreenOverlay';
import { type Funcionality } from 'web-permission-messages';
import { Box } from '@mui/material';
import LocationInstructionsDialog from './LocationInstructionsDialog';

type Props = {
	open: boolean;
	onClose: () => void;
	functionality: Funcionality;
	onTryAgain?: () => void;
};

const PermissionDeniedDialog = (props: Props) => {
	const [showVideo, setShowVideo] = useState(false);
	const [showLocationHelp, setShowLocationHelp] = useState(false);
	const [isLocationPermanentlyDenied, setIsLocationPermanentlyDenied] = useState(false);

	const handleOpenSettings = () => {
		setShowLocationHelp(true);
	};

	userDeniedPermissionOnMount();

	const handleTryAgain = async () => {
		userDeniedPermission();

		if (props.onTryAgain) {
			props.onTryAgain();
		}
	};

	async function userDeniedPermissionOnMount() {
		// Check permission status on mount
		useEffect(() => {
			const checkPermission = async () => {
				try {
					if (navigator.permissions && navigator.permissions.query) {
						const permissionStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
						if (permissionStatus.state === 'denied') {
							setIsLocationPermanentlyDenied(true);
						}
					}
				} catch (error) {
					// Permissions API might not be available
				}
			};
			
			if (props.open) {
				checkPermission();
			}
		}, [props.open]);
	}

	async function userDeniedPermission() {
		// Check if location permission is blocked
		let permissionDenied = false;
		
		if (!permissionDenied && navigator.geolocation) {
			try {
				navigator.geolocation.getCurrentPosition(
					() => {
					},
					(error) => {
						if (error.code === 1 || error.code === error.PERMISSION_DENIED) {
							permissionDenied = true;
							setIsLocationPermanentlyDenied(true);
							console.warn('⚠️ WARNING: Location permission is completely blocked by the user fallback');
						}
					},
					{ timeout: 1000, maximumAge: 0 }
				);
			} catch (e) {
				console.error('Geolocation API exception:', e);
			}
		} else if (!navigator.geolocation) {
			console.error('Geolocation API not available');
		}

	}

	return (
		<>
			<FullScreenOverlay
				open={props.open && !showVideo}
				onClose={props.onClose}
				icon={<LanguageIcon sx={{ fontSize: 40 }} />}
				title="NO LOCATION ACCESS!"
				description="To participate fully in the artwork experience we need access to your location. Please enable location access in your browser."
				primaryButton={{
					text: (props.onTryAgain && !isLocationPermanentlyDenied) ? "TRY AGAIN" : "LOCATION ENABLE HELP",
					onClick: (props.onTryAgain && !isLocationPermanentlyDenied) ? handleTryAgain : handleOpenSettings
				}}
				secondaryButton={(props.onTryAgain && !isLocationPermanentlyDenied) ? {
					text: "LOCATION ENABLE HELP",
					onClick: handleOpenSettings
				} : undefined}
				useLeafBackground={true}
				showCloseButton={false}
			/>

			<FullScreenOverlay
				open={showVideo}
				onClose={() => setShowVideo(false)}
				showCloseButton={true}
				useLeafBackground={false}
			>
				<Box sx={{ 
					position: 'fixed', 
					top: 80,
					left: 0, 
					right: 0, 
					bottom: 0,
					width: '100vw',
					height: 'calc(100vh - 80px)'
				}}>
					<Box
						component="iframe"
						title="Invisible Choir Video"
						src="https://www.youtube.com/embed/y6aJE_v_40o?autoplay=1"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
						allowFullScreen
						sx={{
							width: '100%',
							height: '100%',
							border: 'none'
						}}
					/>
				</Box>
			</FullScreenOverlay>

			<LocationInstructionsDialog
				open={showLocationHelp}
				onClose={() => setShowLocationHelp(false)}
			/>
		</>
	);
};

export default PermissionDeniedDialog;
