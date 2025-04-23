//the createMuiTheme function was renamed to createTheme.
import { createTheme } from '@mui/material/styles';
import { makeStyles } from '@mui/styles';

export const defaultTheme = createTheme({
	typography: {
		fontFamily: 'Inria Sans, sans-serif',
	},
	palette: {
		mode: 'dark',
		primary: {
			main: '#A3E635',
		},
		secondary: {
			main: '#042F2E',
		},
	},
	components: {
		MuiButton: {
			styleOverrides: {
				textPrimary: {
					color: '#ffffff !important',
				},
			},
		},
	},
});

export const lightTheme = createTheme({
	typography: {
		fontFamily: 'Inria Sans, sans-serif',
	},
	palette: {
		mode: 'light',
		primary: {
			main: '#159095',
		},
		secondary: {
			main: '#042F2E',
		}
	},
});

export const useDefaultStyles = makeStyles(() => ({
	root: {
		height: '100vh',
		display: 'flex',
	},
}));
