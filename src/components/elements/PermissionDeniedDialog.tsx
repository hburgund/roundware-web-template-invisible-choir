import React, { useState } from 'react';
import LanguageIcon from '@mui/icons-material/Language';
import FullScreenOverlay from './FullScreenOverlay';
import { type Funcionality } from 'web-permission-messages';
import { Box } from '@mui/material';
import LocationInstructionsDialog from './LocationInstructionsDialog';

type Props = {
	open: boolean;
	onClose: () => void;
	functionality: Funcionality;
};

const PermissionDeniedDialog = (props: Props) => {
	const [showVideo, setShowVideo] = useState(false);
	const [showLocationHelp, setShowLocationHelp] = useState(false);

	return (
		<>
			<FullScreenOverlay
				open={props.open && !showVideo}
				onClose={props.onClose}
				icon={<LanguageIcon sx={{ fontSize: 40 }} />}
				title="NO LOCATION ACCESS!"
				description="To participate fully in the artwork experience we need access to your location. Please enable location access in your browser."
				primaryButton={{
					text: "LOCATION ENABLE HELP",
					onClick: () => setShowLocationHelp(true)
				}}
				// secondaryButton={{
				// 	text: "WATCH VIDEOS",
				// 	onClick: () => setShowVideo(true)
				// }}
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
