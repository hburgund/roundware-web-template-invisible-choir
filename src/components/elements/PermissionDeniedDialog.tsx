import React, { useState, useEffect, useRef } from 'react';
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
	const permissionStatusRef = useRef<PermissionStatus | null>(null);

	const handleOpenSettings = () => {
		setShowLocationHelp(true);
	};

	// Check permission status and listen for changes
	useEffect(() => {
		if (!props.open) {
			// Reset state when dialog closes
			setIsLocationPermanentlyDenied(false);
			return;
		}

		const checkPermission = async () => {
			try {
				if (navigator.permissions && navigator.permissions.query) {
					const permissionStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
					permissionStatusRef.current = permissionStatus;
					
					// Check initial state
					if (permissionStatus.state === 'denied') {
						setIsLocationPermanentlyDenied(true);
					}

					// Listen for permission state changes (e.g., when user clicks "Never Allow" in browser prompt)
					permissionStatus.onchange = () => {
						if (permissionStatus.state === 'denied') {
							setIsLocationPermanentlyDenied(true);
						}
					};
				}
			} catch (error) {
				// Permissions API might not be available
			}
		};

		checkPermission();

		// Cleanup when component unmounts
		return () => {
			if (permissionStatusRef.current) {
				permissionStatusRef.current.onchange = null;
				permissionStatusRef.current = null;
			}
		};
	}, [props.open]);

	const checkPermissionStatus = async (): Promise<boolean> => {
		// First try the Permissions API
		try {
			if (navigator.permissions && navigator.permissions.query) {
				const permissionStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
				if (permissionStatus.state === 'denied') {
					return true;
				}
			}
		} catch (error) {
			// Permissions API might not be available, fall through to geolocation check
		}

		// Fallback: Check using geolocation API
		return new Promise((resolve) => {
			if (!navigator.geolocation) {
				resolve(false);
				return;
			}

			navigator.geolocation.getCurrentPosition(
				() => {
					resolve(false);
				},
				(error) => {
					if (error.code === 1 || error.code === error.PERMISSION_DENIED) {
						resolve(true);
					} else {
						resolve(false);
					}
				},
				{ timeout: 1000, maximumAge: 0 }
			);
		});
	};

	const handleTryAgain = async () => {

		const isDenied = await checkPermissionStatus();
		if (isDenied) {
			setIsLocationPermanentlyDenied(true);
			return; 
		}

		if (props.onTryAgain) {
			props.onTryAgain();
		}

		setTimeout(async () => {
			const isDeniedAfter = await checkPermissionStatus();
			if (isDeniedAfter) {
				setIsLocationPermanentlyDenied(true);
			}
		}, 500);
	};

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
