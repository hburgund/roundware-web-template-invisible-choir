import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, Typography, Box } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LockIcon from '@mui/icons-material/Lock';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { isChrome, isFirefox, isSafari, isEdge, isAndroid, isIOS, isMobile } from 'react-device-detect';
import aAFontIcon from '../../assets/icons/aAFont.svg';
import pageMenuIOSIcon from '../../assets/icons/page-menu-ios.svg';

function getIOSVersion() {
	const ua = navigator.userAgent;

	// Detect Safari version
	const safariMatch = ua.match(/Version\/(\d+)\.(\d+)/);
	const safariMajor = safariMatch ? parseInt(safariMatch[1], 10) : 0;

	// Detect OS version from UA (will be frozen on iOS 26+)
	const osMatch = ua.match(/OS (\d+)_(\d+)_?(\d+)?/);
	let osMajor = osMatch ? parseInt(osMatch[1], 10) : 0;
	let osMinor = osMatch ? parseInt(osMatch[2], 10) : 0;
	let osPatch = osMatch && osMatch[3] ? parseInt(osMatch[3], 10) : 0;

	// Apple froze OS version at 18.6 in iOS 26+
	// So detect iOS 26+ via Safari version (Version/26+)
	if (osMajor === 18 && safariMajor >= 26) {
		osMajor = safariMajor; // Safari 26 => iOS 26
		osMinor = 0;
		osPatch = 0;
	}

	// Detect iPad with desktop UA
	const isIOS =
		/iPad|iPhone|iPod/.test(ua) ||
		(navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

	return isIOS ? `${osMajor}.${osMinor}.${osPatch}` : null;
}

type Props = {
	open: boolean;
	onClose: () => void;
};

const LocationInstructionsDialog = (props: Props) => {
	const [iosVersion, setIosVersion] = useState<string | null>(null);

	useEffect(() => {
		const version = getIOSVersion();
		setIosVersion(version);
		console.log("IOS", version);
	}, []);

	const shouldUseAAButtonInstructions = (version: string | null): boolean => {
		if (!version) return false;
		
		const parts = version.split('.').map(Number);
		const major = parts[0];
		
		// iOS 15.x, 16.x, 17.x (matches any minor/patch version)
		return major === 15 || major === 16 || major === 17;
	};

	const shouldUsePageMenuInstructions = (version: string | null): boolean => {
		if (!version) return false;
		
		const parts = version.split('.').map(Number);
		const major = parts[0];
		
		// iOS 18.x, 26.x (matches any minor/patch version)
		return major === 18 || major === 26;
	};

	return (
		<Dialog
			open={props.open}
			onClose={props.onClose}
			maxWidth="sm"
			fullWidth
			PaperProps={{
				sx: {
					borderRadius: 2,
					position: 'relative'
				}
			}}
		>
			<Box sx={{ position: 'absolute', right: 8, top: 8, zIndex: 1 }}>
				<IconButton onClick={props.onClose} size="small">
					<CloseIcon />
				</IconButton>
			</Box>

			<DialogTitle sx={{ pt: 4, pb: 1, textAlign: 'center' }}>
				<Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
					<LocationOnIcon sx={{ fontSize: 40 }} />
				</Box>
				<Typography variant="h5" component="div">
					Location Access Help
				</Typography>
			</DialogTitle>

			<DialogContent sx={{ px: 3, pb: 2 }}>
				<Box sx={{ textAlign: 'center' }}>
					<Box sx={{ textAlign: 'left', maxWidth: 400, mx: 'auto', mt: 3 }}>
						{isMobile && isIOS && iosVersion && (
							<Typography variant="body1" sx={{ mb: 2, fontWeight: 'bold' }}>
								IOS - {iosVersion}
							</Typography>
						)}
						{isMobile && isAndroid ? (
							<>
								<Typography variant="body1" sx={{ mb: 2 }}>
									1. Tap the three dots menu (⋮) in the top right corner of your browser
								</Typography>
								<Typography variant="body1" sx={{ mb: 2 }}>
									2. Select "Settings"
								</Typography>
								<Typography variant="body1" sx={{ mb: 2 }}>
									3. Scroll down and find "Site settings" (usually at the bottom)
								</Typography>
								<Typography variant="body1" sx={{ mb: 2 }}>
									4. Tap on "Location" under "Permissions"
								</Typography>
								<Typography variant="body1" sx={{ mb: 2 }}>
									5. Change it from "Block" to "Allow"
								</Typography>
								<Typography variant="body1" sx={{ mb: 3 }}>
									6. Go back and refresh the page
								</Typography>
							</>
						) : isMobile && isIOS ? (
							shouldUseAAButtonInstructions(iosVersion) ? (
								<>
									<Typography variant="body1" sx={{ mb: 2 }}>
										1. Tap the <img src={aAFontIcon} alt="aA" width="20" height="19" style={{ verticalAlign: 'middle', margin: '0 2px' }} /> button on the bottom
									</Typography>
									<Typography variant="body1" sx={{ mb: 2 }}>
										2. Select "Website Settings"
									</Typography>
									<Typography variant="body1" sx={{ mb: 2 }}>
										3. Tap on "Location"
									</Typography>
									<Typography variant="body1" sx={{ mb: 2 }}>
										4. Change it to "Allow"
									</Typography>
									<Typography variant="body1" sx={{ mb: 2 }}>
										5. Tap "Done" & refresh the page
									</Typography>
								</>
							) : shouldUsePageMenuInstructions(iosVersion) ? (
								<>
									<Typography variant="body1" sx={{ mb: 2 }}>
										1. Click on the <img src={pageMenuIOSIcon} alt="left bottom icon" width="24" height="24" style={{ verticalAlign: 'middle', margin: '0 2px' }} /> icon at bottom left
									</Typography>
									<Typography variant="body1" sx={{ mb: 2 }}>
										2. Click on the Three dots (⋮) menu
									</Typography>
									<Typography variant="body1" sx={{ mb: 2 }}>
										3. Scroll to the bottom
									</Typography>
									<Typography variant="body1" sx={{ mb: 2 }}>
										4. Under "Website Settings", find "Location"
									</Typography>
									<Typography variant="body1" sx={{ mb: 2 }}>
										5. Change it to "Allow"
									</Typography>
									<Typography variant="body1" sx={{ mb: 2 }}>
										6. Click on "Done" at the top & refresh the page
									</Typography>
								</>
							) : null
						) : isChrome ? (
							<>
								<Typography variant="body1" sx={{ mb: 2 }}>
									1. Click the site controls icon <img src="//storage.googleapis.com/support-kms-prod/S76Rs1BC1QDxT8zpF3tATLDsc5oxceWYIPHN" width="18" height="18" alt="Site controls" style={{ verticalAlign: 'middle' }} /> next to the URL.
								</Typography>
								<Typography variant="body1" sx={{ mb: 2 }}>
									2. Select "Site settings."
								</Typography>
								<Typography variant="body1" sx={{ mb: 2 }}>
									3. Under Permissions, find "Location."
								</Typography>
								<Typography variant="body1" sx={{ mb: 2 }}>
									4. Change it to "Allow" (or "Allow this time.")
								</Typography>
								<Typography variant="body1" sx={{ mb: 3 }}>
									5. Refresh the page.
								</Typography>
							</>
						) : isEdge ? (
							<>
								<Typography variant="body1" sx={{ mb: 2 }}>
									1. Click the site controls <LockIcon sx={{ fontSize: 18, verticalAlign: 'middle' }} /> lock icon next to the website URL at the top.
								</Typography>
								<Typography variant="body1" sx={{ mb: 2 }}>
									2. Click "Permissions for this site."
								</Typography>
								<Typography variant="body1" sx={{ mb: 2 }}>
									3. Find "Location."
								</Typography>
								<Typography variant="body1" sx={{ mb: 2 }}>
									4. Change it to "Allow."
								</Typography>
								<Typography variant="body1" sx={{ mb: 3 }}>
									5. Refresh the page.
								</Typography>
							</>
						) : isFirefox ? (
							<>
								<Typography variant="body1" sx={{ mb: 2 }}>
									1. Click the three lines menu (☰) in the top right
								</Typography>
								<Typography variant="body1" sx={{ mb: 2 }}>
									2. Go to Settings {'>'} Privacy & Security {'>'} Permissions {'>'} Location
								</Typography>
								<Typography variant="body1" sx={{ mb: 2 }}>
									3. Click 'Settings' and find this website
								</Typography>
								<Typography variant="body1" sx={{ mb: 2 }}>
									4. Change it from 'Block' to 'Allow'
								</Typography>
								<Typography variant="body1" sx={{ mb: 3 }}>
									5. Refresh the page and try again
								</Typography>
							</>
						) : isSafari ? (
							<>
								<Typography variant="body1" sx={{ mb: 2 }}>
									1. Go to Safari {'>'} Preferences {'>'} Websites {'>'} Location
								</Typography>
								<Typography variant="body1" sx={{ mb: 2 }}>
									2. Find this website in the list
								</Typography>
								<Typography variant="body1" sx={{ mb: 2 }}>
									3. Change it from 'Deny' to 'Allow'
								</Typography>
								<Typography variant="body1" sx={{ mb: 3 }}>
									4. Refresh the page and try again
								</Typography>
							</>
						) : (
							<>
								<Typography variant="body1" sx={{ mb: 2 }}>
									1. Open your browser settings
								</Typography>
								<Typography variant="body1" sx={{ mb: 2 }}>
									2. Look for 'Privacy', 'Permissions', or 'Site Settings'
								</Typography>
								<Typography variant="body1" sx={{ mb: 2 }}>
									3. Find 'Location' settings
								</Typography>
								<Typography variant="body1" sx={{ mb: 2 }}>
									4. Find this website and change it from 'Block' to 'Allow'
								</Typography>
								<Typography variant="body1" sx={{ mb: 3 }}>
									5. Refresh the page and try again
								</Typography>
							</>
						)}
					</Box>
				</Box>
			</DialogContent>

			<DialogActions sx={{ px: 3, pb: 3, justifyContent: 'center' }}>
				<Button
					variant="contained"
					onClick={props.onClose}
					size="large"
					sx={{ minWidth: 120 }}
				>
					Got it!
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default LocationInstructionsDialog;
