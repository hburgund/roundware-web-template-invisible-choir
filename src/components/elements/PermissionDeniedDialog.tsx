import React, { useState } from 'react';
import LanguageIcon from '@mui/icons-material/Language';
import FullScreenOverlay from './FullScreenOverlay';
import { type Funcionality } from 'web-permission-messages';
import { Box } from '@mui/material';

type Props = {
	open: boolean;
	onClose: () => void;
	functionality: Funcionality;
};

const PermissionDeniedDialog = (props: Props) => {
	const [showVideo, setShowVideo] = useState(false);

	return (
		<>
			<FullScreenOverlay
				open={props.open && !showVideo}
				onClose={props.onClose}
				icon={<LanguageIcon sx={{ fontSize: 40 }} />}
				title="SORRY!"
				description="To participate fully in the artwork experience we need access to your location. In the meantime, please see our Youtube channel from some of our favourite choirs."
				primaryButton={{
					text: "WATCH VIDEOS",
					onClick: () => setShowVideo(true)
				}}
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
		</>
	);
};

export default PermissionDeniedDialog;
