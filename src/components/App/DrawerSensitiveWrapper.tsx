import { Box, Theme, useMediaQuery } from '@mui/material';
import { useUIContext } from '@/context/UIContext';
import React from 'react';

type Props = {
	children: React.ReactNode;
};

const DrawerSensitiveWrapper = ({ children }: Props) => {

	const { drawerOpen } = useUIContext();


	return (
		<Box
			sx={(t) => ({
				transition: t.transitions.create(['margin', 'width'], {
					easing: t.transitions.easing.sharp,
					duration: t.transitions.duration.leavingScreen,
				}),
				marginRight: 0,
				...(drawerOpen && {
					transition: t.transitions.create('margin', {
						easing: t.transitions.easing.easeOut,
						duration: t.transitions.duration.enteringScreen,
					}),
					marginRight: '350px',
				}),
				height: '100vh',
				display: 'flex',
				flexDirection: 'column',
			})}
		>
			{children}
		</Box>
	);
};

export default DrawerSensitiveWrapper;
