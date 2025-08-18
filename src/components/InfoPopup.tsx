import React, { useState } from 'react';
import { Tabs, Tab, Box, Dialog, Paper, Typography, Stack, IconButton, useMediaQuery } from '@mui/material';
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

interface TabPanelProps {
	children?: React.ReactNode;
	index: number;
	value: number;
}

interface InfoPopupProps {
	open: boolean;
	onClose: () => void;
}

// Define the tab configuration type
interface TabConfig {
	label: string;
	content: React.ReactNode;
}

function TabPanel(props: TabPanelProps) {
	const { children, value, index, ...other } = props;

	return (
		<div
			role="tabpanel"
			hidden={value !== index}
			id={`scrollable-tabpanel-${index}`}
			aria-labelledby={`scrollable-tab-${index}`}
			{...other}
		>
			{value === index && (
				<Box sx={{ p: 3 }}>
					{children}
				</Box>
			)}
		</div>
	);
}

const InfoPopup = ({ open, onClose }: InfoPopupProps) => {
	const [value, setValue] = useState(0);
	const isLandscape = useMediaQuery('(orientation: landscape)', { noSsr: true });
	const isMobileDevice = isAndroid || isIOS;
	const shouldUseLandscapeLayout = isLandscape && isMobileDevice;

	// Define your tabs configuration here
	const tabs: TabConfig[] = [
		{
			label: "About",
			content: (
				<>
					<Typography variant="h4" color="primary" gutterBottom className="info-text-heading">
						About
					</Typography>
					<Typography variant="h6" color="primary" gutterBottom>
						Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna.
					</Typography>
					<Typography variant="body1" color="text.secondary" sx={{ mb: 8 }}>
						Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
					</Typography>
				</>
			)
		},
		{
			label: "Exhibitions",
			content: (
				<>
					<Typography variant="h4" color="primary" gutterBottom className="info-text-heading">
						Exhibitions
					</Typography>
					<Stack spacing={2}>
						<Box>
							<Typography variant="subtitle1" color="primary" gutterBottom>
								Lorem ipsum dolor
							</Typography>
							<Typography variant="body2" color="text.secondary">
								26 Mar 2025 - sit amet, consectetur adipiscing elit, sed do eiusmod tempor
							</Typography>
						</Box>
						<Box>
							<Typography variant="subtitle1" color="primary" gutterBottom>
								Lorem ipsum dolor
							</Typography>
							<Typography variant="body2" color="text.secondary">
								26 Mar 2025 - sit amet, consectetur adipiscing elit, sed do eiusmod tempor
							</Typography>
						</Box>
					</Stack>
				</>
			)
		},
		{
			label: "Artists",
			content: (
				<>
					<Typography variant="h4" color="primary" gutterBottom className="info-text-heading">
						Artists
					</Typography>
					<Stack spacing={3}>
						<Box>
							<Typography variant="subtitle1" color="primary">
								Name Surname
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Technical Director
							</Typography>
						</Box>
						<Box>
							<Typography variant="subtitle1" color="primary">
								Name Surname
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Technical Artist
							</Typography>
						</Box>
					</Stack>
				</>
			)
		}
	];

	const handleChange = (event: React.SyntheticEvent, newValue: number) => {
		setValue(newValue);
	};

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
				<Box sx={{ 
					position: 'sticky', 
					top: 0, 
					zIndex: 1, 
					backdropFilter: 'blur(10px)',
				}}>
					<Tabs
						value={value}
						onChange={handleChange}
						variant="scrollable"
						scrollButtons={false}
						aria-label="scrollable prevent tabs example"
					>
						{tabs.map((tab, index) => (
							<Tab key={index} label={tab.label}/>
						))}
					</Tabs>
				</Box>
				{tabs.map((tab, index) => (
					<TabPanel key={index} value={value} index={index}>
						{tab.content}
					</TabPanel>
				))}
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

export default InfoPopup;
