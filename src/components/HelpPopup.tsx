import React from 'react';
import { Box, Dialog, Typography, Stack, IconButton, useMediaQuery } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import Slide from '@mui/material/Slide';
import { TransitionProps } from '@mui/material/transitions';
import { isAndroid, isIOS } from 'react-device-detect';
import startsLogo from '../assets/starts_logo.png';
import europeanCommissionLogo from '../assets/european_commission_logo.png';
import mainLogo from '../assets/main_logo.png';
import greenBackground from '../assets/green_background.svg';

const Transition = React.forwardRef(function Transition(
	props: TransitionProps & {
		children: React.ReactElement<any, any>;
	},
	ref: React.Ref<unknown>,
) {
	return <Slide direction="up" ref={ref} {...props} />;
});

interface HelpPopupProps {
	open: boolean;
	onClose: () => void;
}

const HelpPopup = ({ open, onClose }: HelpPopupProps) => {
	const isLandscape = useMediaQuery('(orientation: landscape)', { noSsr: true });
	const isMobileDevice = isAndroid || isIOS;
	const shouldUseLandscapeLayout = isLandscape && isMobileDevice;

	return (
		<Dialog
			open={open}
			onClose={onClose}
			TransitionComponent={Transition}
			fullScreen
			PaperProps={{
				sx: {
					backgroundImage: `url(${greenBackground})`,
					backgroundSize: 'cover',
					backgroundPosition: 'center',
					overflow: 'auto',
					position: 'relative'
				},
				'data-fullscreen-overlay': 'true'
			}}
		>
			<Box sx={{ 
				display: 'flex', 
				justifyContent: 'space-between', 
				alignItems: 'center',
				mt: 3, 
				px: 3 
			}}>
				<Box
					component="img"
					src={mainLogo}
					alt="Main Logo"
					sx={{
						height: 50,
						width: 'auto',
						display: 'flex',
						alignItems: 'center'
					}}
				/>
				<IconButton
					color="inherit"
					size="medium"
					edge="end"
					onClick={onClose}
					sx={{ 
						border: 1, 
						borderColor: 'rgba(255, 255, 255, 0.5)',
						width: 40,
						height: 40,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center'
					}}
				>
					<CloseIcon />
				</IconButton>
			</Box>
			<Box sx={{ width: '100%', mt: 3, pb: shouldUseLandscapeLayout ? 3 : 10 }}>
				<Box sx={{ p: 3 }}>
					<Typography variant="h4" color="primary" gutterBottom className="info-text-heading">
						Help
					</Typography>
					<Typography variant="body1" color="text.secondary">
						Help content will be added here.
					</Typography>
				</Box>
			</Box>
			<Box sx={{ 
				position: shouldUseLandscapeLayout ? 'relative' : 'fixed', 
				bottom: shouldUseLandscapeLayout ? 'auto' : 20, 
				left: 0, 
				right: 0, 
				px: 3,
				mt: shouldUseLandscapeLayout ? 3 : 0,
				pb: shouldUseLandscapeLayout ? 3 : 0
			}}>
				<Stack direction="row" justifyContent="space-between" alignItems="flex-end">
					<Stack direction="column" spacing={2}>
						<Box
							component="img"
							src={startsLogo}
							alt="Starts Logo"
							sx={{
								height: 20,
								width: 'auto'
							}}
						/>
						<Box
							component="img"
							src={europeanCommissionLogo}
							alt="European Commission Logo"
							sx={{
								height: 40,
								width: 'auto'
							}}
						/>
					</Stack>
					<Typography variant="body2" color="text.secondary">
						PRIVACY POLICY
					</Typography>
				</Stack>
			</Box>
		</Dialog>
	);
};

export default HelpPopup;
