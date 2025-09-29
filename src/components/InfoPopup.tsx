import React, { useState } from 'react';
import { Tabs, Tab, Box, Dialog, Paper, Typography, Stack, IconButton, useMediaQuery } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import Slide from '@mui/material/Slide';
import { TransitionProps } from '@mui/material/transitions';
import { useHistory } from 'react-router-dom';
import { isAndroid, isIOS } from 'react-device-detect';
import SwipeableViews from 'react-swipeable-views';
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
			style={{ height: '100%', minHeight: '400px' }}
			{...other}
		>
			{value === index && (
				<Box sx={{ p: 3, height: '100%', minHeight: '400px' }}>
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
						We live in divisive times; the simple act of listening and interacting
						with each other has become fraught with a constant barrage of political
						and social baggage.
					</Typography>
					<Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
						With Invisible Choir, we seek to circumvent some of these challenges
						by allowing strangers to create an evolving collective musical work by
						singing with each other, without words.
					</Typography>
					<Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
						Invisible Choir combines urban sound design, sound ecology, and technology
						to create a novel type of interactive social soundscape: an invisible
						landscape of music created by an ever-evolving open-sourced choir.
						Beginning with musical "seeds" composed for the specific location, a
						choral composition is nurtured through the active, asynchronous participation
						of visitors who become members of the invisible choir through their vocal
						contributions recorded and “planted” live on the spot. This is accomplished
						through a specially designed web-based application that both facilitates
						singing together as well as listening to "choirs".
					</Typography>
					<Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
						By harnessing the power of new technologies - including automated compositional
						algorithms and advanced audio AR - we propose an innovative and urgent
						form for public spaces that facilitates collective engagement centered
						around communal singing, music creation and the establishment of new
						networks of citizen-singers. Ultimately, Invisible Choir reimagines what
						a public artwork can be and how it may allow us to connect with each
						other and our (sonic) environment in these polarized times.
					</Typography>
				</>
			)
		},
		{
			label: "Exhibition",
			content: (
				<>
					<Typography variant="h4" color="primary" gutterBottom className="info-text-heading">
						Exhibition
					</Typography>
					<Stack spacing={2}>
						<Box>
							<Typography variant="subtitle1" color="primary" gutterBottom>
								<a href="https://base.milano.it/" target="_blank" rel="noopener noreferrer" className="hyperlink">BASE Milano</a>, Milan, Italy
							</Typography>
							<Typography variant="body2" color="text.secondary">
								09-OCT-2025 - 26-OCT-2025
							</Typography>
						</Box>
						<Box>
							<Typography variant="subtitle1" color="primary" gutterBottom>
								Full Exhibition Information
							</Typography>
							<Typography variant="subtitle1" color="primary" gutterBottom>
								<a href="https://resilence.eu/artists-in-residence-2nd-open-call/" target="_blank" rel="noopener noreferrer" className="hyperlink">Re-Silence Program</a>
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
								Ari Benjamin Meyers
							</Typography>
							<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
								<a href="http://aribenjaminmeyers.com/" target="_blank" rel="noopener noreferrer" className="hyperlink">Ari Benjamin Meyers</a> is
								an artist and composer who explores structures
								and processes that redefine the performative, social, and ephemeral
								nature of music. He received his training at The Julliard School,
								Yale University, and Peabody Institute; his work has since been
								presented and exhibited at major institutions, festivals, and biennials
								worldwide. Several of his works, including "Rehearsing Philadelphia" (2022),
								"Werksorchester" (2022), and "Hymnus" (2024), are centered around
								the public and civic spheres and have incorporated large-scale communal
								rituals.
							</Typography>
							<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
								Recently, Meyers has also created works directly related to
								the environment and climate change issues; these include "Forecast (LX23)"
								and "Unless" (both 2023). He has collaborated with artists such as
								Tino Sehgal, Anri Sala, and Dominique Gonzalez-Foerster, as well as
								with bands like The Residents, Chicks on Speed, and Einstürzende Neubauten.
								"Marshal Allen, 99, Astronaut," his first film premiered in Venice
								as part of the group exhibition Nebula during the 2024 Biennale Arte.
								He lives in Berlin and currently is Professor for Sculpture at
								Kunstakademie Düsseldorf.
							</Typography>
						</Box>
						<Box>
							<Typography variant="subtitle1" color="primary">
								Halsey Burgund
							</Typography>
							<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
								<a href="https://halseyburgund.com" target="_blank" rel="noopener noreferrer" className="hyperlink">Halsey Burgund</a> is a new media artist and Emmy-winning interactive
								director whose work focuses on the combination of modern technologies -
								from mobile phones to artificial intelligence - with fundamentally
								human “technologies”, primarily language, music and the spoken voice.
							</Typography>
							<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
								He is the creator of Roundware, the open source contributory audio AR platform,
								which has been used to create art and educational installations for
								cultural organizations internationally. Halsey’s recent work has
								focussed on the societal challenges posed by artificial intelligence,
								in particular synthetic media and generative AI. Halsey was a
								Smithsonian Artist Research Fellow, a Research Affiliate at the
								MIT Media Lab and an affiliate in Harvard's metaLAB and is currently
								Creative Technologist in Residence at the MIT Open Documentary Lab.
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
					position: 'relative',
					display: 'flex',
					flexDirection: 'column',
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
			<Box sx={{ width: '100%', mt: 3, pb: 3, flex: 1 }}>
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
				<SwipeableViews
					index={value}
					onChangeIndex={setValue}
					enableMouseEvents
					disabled={!isMobileDevice}
					style={{ height: '100%', minHeight: '400px' }}
					containerStyle={{ height: '100%', minHeight: '400px' }}
				>
					{tabs.map((tab, index) => (
						<TabPanel key={index} value={value} index={index}>
							{tab.content}
						</TabPanel>
					))}
				</SwipeableViews>
			</Box>
			<Box sx={{
				px: 3,
				mt: 3,
				pb: 3
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
					{/* <Typography variant="body2" color="text.secondary">
						PRIVACY POLICY
					</Typography> */}
				</Stack>
			</Box>
		</Dialog>
	);
};

export default InfoPopup;
