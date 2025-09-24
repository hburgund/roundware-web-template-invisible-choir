import { Mic } from '@mui/icons-material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { Box, Tooltip, Skeleton, Fade, Fab, Typography, Zoom, Grow } from '@mui/material';
import { point } from '@turf/helpers';
import { useRoundware } from '@/hooks/index';
import { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { isAndroid, isIOS } from 'react-device-detect';

const AddLoopVoiceButton = ({ showLaunch }: { showLaunch: boolean }) => {
	const { roundware, forceUpdate } = useRoundware();
	const history = useHistory();

	const [showAddChoirButton, setShowAddChoirButton] = useState(true);
	const [hasShownTooltip, setHasShownTooltip] = useState(false);
	const [isZooming, setIsZooming] = useState(false);
	const [showZoomBackground, setShowZoomBackground] = useState(false);

	const [isInChoirRange, setIsInChoirRange] = useState(false);

	const isMobile = isAndroid || isIOS;

	const tooltipProps = {
		open: isMobile ? (hasShownTooltip && showAddChoirButton) : undefined,
		disableFocusListener: isMobile,
		disableHoverListener: isMobile,
		disableTouchListener: isMobile,
	};

	// show tooltip on mobile devices
	useEffect(() => {
		const hasShownTooltipBefore = localStorage.getItem('hasShownAddChoirTooltip');
		if (isMobile && showAddChoirButton && !hasShownTooltip && !hasShownTooltipBefore && !showLaunch) {
			setHasShownTooltip(true);
			localStorage.setItem('hasShownAddChoirTooltip', 'true');
		}
	}, [showAddChoirButton, hasShownTooltip, showLaunch]);

	// Function to check if user is within any speaker range
	const checkChoirRange = () => {
		if (!roundware?.mixer?.speakerEngine?.speakers || !roundware.listenerLocation) {
			return false;
		}

		const lat = roundware.listenerLocation.latitude as number;
		const lng = roundware.listenerLocation.longitude as number;
		const listenerPoint = point([lng, lat]);

		const speakers = roundware.mixer.speakerEngine.speakers;

		// Check if user is within range of any speaker without calling updateParams
		for (const speaker of speakers) {
			if (speaker.outerBoundaryContains && speaker.outerBoundaryContains(listenerPoint)) {
				return true;
			}
			if (speaker.attenuationShapeContains && speaker.attenuationShapeContains(listenerPoint)) {
				return true;
			}
		}

		return false;
	};

	// Check choir range when location changes (but not when speakers update to avoid interference)
	useEffect(() => {
		const inRange = checkChoirRange();
		setIsInChoirRange(inRange);
	}, [roundware.listenerLocation]);

	// Also check when speakers are initially loaded (only when count changes from 0)
	useEffect(() => {
		const speakerCount = roundware.mixer?.speakerEngine?.speakers?.length || 0;
		if (speakerCount > 0) {
			const inRange = checkChoirRange();
			setIsInChoirRange(inRange);
		}
	}, [roundware.mixer?.speakerEngine?.speakers?.length]);

	const handleClick = () => {
		if (!isInChoirRange) {
			return; // Do nothing if not in range
		}

		// Start zoom animation
		setIsZooming(true);
		setShowZoomBackground(true);

		// After zoom animation completes, navigate
		setTimeout(() => {
			setShowAddChoirButton(false);
			const lat = roundware.listenerLocation.latitude as number;
			const lng = roundware.listenerLocation.longitude as number;

			roundware.mixer.stop();
			forceUpdate();
			history.push({
				pathname: '/speak',
				search: `?lat=${lat}&lng=${lng}`,
			});
		}, 50);
	};

	return (
		<>
			{/* Zoom background overlay */}
			<Box
				sx={{
					position: 'fixed',
					top: '50%',
					left: '50%',
					width: '100vw',
					height: '100vw',
					transform: 'translate(-50%, -50%)',
					backgroundColor: 'secondary.main',
					borderRadius: '50%',
					zIndex: 9999,
					display: showZoomBackground ? 'flex' : 'none',
					alignItems: 'center',
					justifyContent: 'center',
					animation: showZoomBackground ? 'zoomIn 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards' : 'none',
					willChange: 'transform',
					'@keyframes zoomIn': {
						'0%': {
							transform: 'translate(-50%, -50%) scale(0)',
						},
						'100%': {
							transform: 'translate(-50%, -50%) scale(2.5)',
						},
					},
				}}
			/>

			<Fade in={showAddChoirButton} timeout={1000}>
				<Box
					display="flex"
					alignItems="center"
					justifyContent="center"
					position="absolute"
					width="100%"
					height="100%"
					sx={{
						'& .MuiFab-root': { width: 120, height: 120 },
						pointerEvents: 'none'
					}}>
					<Box sx={{ position: 'relative' }}>
						{/* Show skeleton animation only when in choir range */}
						{isInChoirRange && (
							<Skeleton
								variant="circular"
								animation="pulse"
								sx={{
									position: 'absolute',
									width: 160,
									height: 160,
									top: '50%',
									left: '50%',
									transform: 'translate(-50%, -50%)',
								}}
							/>
						)}

						<Tooltip
							title={isInChoirRange ? "TAP TO JOIN CHOIR" : "Move closer to a choir location to join"}
							arrow
							placement="bottom"
							{...tooltipProps}
						>
							<Fab
								size="large"
								color={isInChoirRange ? "secondary" : "primary"}
								onClick={handleClick}
								disabled={!isInChoirRange || isZooming}
								sx={{
									pointerEvents: 'auto',
									opacity: isInChoirRange ? 1 : 0.7, // Slightly transparent when disabled
									'&.Mui-disabled': {
										// Explicitly maintain the dark green color and semi-transparency
										backgroundColor: 'secondary.main',
										opacity: 0.7,
										color: 'white', // Ensure text stays white
									}
								}}
							>
								{isInChoirRange ? (
									<AddCircleOutlineIcon fontSize="large" color="primary" />
								) : (
									<Typography
										variant="caption"
										sx={{
											textAlign: 'center',
											lineHeight: 1.2,
											fontSize: '0.65rem',
											fontWeight: 'bold',
											color: 'white' // White text for disabled state
										}}
									>
										NO CHOIR
										<br />
										TO JOIN
									</Typography>
								)}
							</Fab>
						</Tooltip>
					</Box>
				</Box>
			</Fade>
		</>
	);
};

export default AddLoopVoiceButton;
