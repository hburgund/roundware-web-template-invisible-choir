import { useRoundware } from '@/hooks';
import Backdrop from '@mui/material/Backdrop';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import React, { useEffect, useState } from 'react';

interface Props {}

interface SpeakerProgress {
	id: number;
	loaded: number;
	total: number;
	value: number;
}

const CollectiveSpeakerLoadingIndicator = (props: Props) => {
	const { roundware } = useRoundware();

	const [speakerProgress, setSpeakerProgress] = useState<SpeakerProgress[]>([]);
	const [smoothedProgress, setSmoothedProgress] = useState<number>(0);

	useEffect(() => {
		roundware.mixer.speakerEngine?.speakers?.forEach((sp) => {
			sp.request?.addEventListener('progress', (ev) => {
				const loaded = ev.loaded;
				const total = ev.total;
				const value = (loaded / total) * 100;

				setSpeakerProgress((prev) => {
					// Remove existing progress for this speaker
					const filtered = prev.filter((s) => s.id !== sp.data.id);
					
					// Add new progress if not complete
					if (value < 100) {
						return [...filtered, { id: sp.data.id, loaded, total, value }];
					} else {
						return filtered;
					}
				});
			});
		});
	}, [roundware?.mixer?.speakerEngine?.speakers]);

	// Calculate collective progress
	const totalSpeakers = roundware.mixer.speakerEngine?.speakers?.length || 0;
	const downloadingSpeakers = speakerProgress.length;
	const completedSpeakers = totalSpeakers - downloadingSpeakers;

	// Calculate progress based on file count instead of bytes
	const currentProgress = totalSpeakers > 0 ? (completedSpeakers / totalSpeakers) * 100 : 0;

	// Apply boxcar smoothing to prevent sudden jumps
	useEffect(() => {
		const smoothingFactor = 0.1; // Adjust this for more/less smoothing
		const maxJump = 5; // Maximum percentage jump allowed per update
		
		setSmoothedProgress(prev => {
			const jump = currentProgress - prev;
			const clampedJump = Math.max(-maxJump, Math.min(maxJump, jump));
			return prev + clampedJump * smoothingFactor;
		});
	}, [currentProgress]);

	// Don't show if all downloads are complete
	if (downloadingSpeakers === 0) {
		return null;
	}

	return (
		<Backdrop open sx={(theme) => ({ 
			zIndex: theme.zIndex.appBar + 1,
			backgroundColor: 'rgba(0, 0, 0, 0.8)' // Less transparent background
		})}>
			<Stack spacing={3} alignItems="center" p={4}>
				<Typography variant="h5" textAlign="center">
					Downloading awesome music... Please wait
				</Typography>
				
				<Box position="relative" display="flex" alignItems="center" justifyContent="center">
					<CircularProgress
						variant="determinate"
						value={smoothedProgress}
						size={180}
						thickness={4}
						sx={{ color: 'primary.main' }}
					/>
					<Box
						position="absolute"
						display="flex"
						alignItems="center"
						justifyContent="center"
						flexDirection="column"
					>
						<Typography variant="h3" component="div" color="primary.main">
							{Math.round(smoothedProgress)}%
						</Typography>
						<Typography variant="body1" color="text.secondary">
							{completedSpeakers} of {totalSpeakers} files
						</Typography>
					</Box>
				</Box>

				<Typography variant="body1" textAlign="center" color="text.secondary">
					{downloadingSpeakers} file{downloadingSpeakers !== 1 ? 's' : ''} remaining
				</Typography>
			</Stack>
		</Backdrop>
	);
};

export default CollectiveSpeakerLoadingIndicator;
