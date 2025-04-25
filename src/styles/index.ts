//the createMuiTheme function was renamed to createTheme.
import { createTheme, Theme } from '@mui/material/styles';
import { PaletteMode, ButtonProps } from '@mui/material';
import { makeStyles } from '@mui/styles';

declare module '@mui/material/Button' {
	interface ButtonPropsVariantOverrides {
		rerecord: true;
	}
}

// Base theme with common settings
const baseTheme = {
	typography: {
		fontFamily: 'Inria Sans, sans-serif',
	},
	components: {
		MuiButton: {
			styleOverrides: {
				textPrimary: {
					color: '#ffffff !important',
				},
				root: ({ theme }: { theme: Theme }) => ({
					marginTop: theme.spacing(4),
					paddingLeft: theme.spacing(8),
					paddingRight: theme.spacing(8),
					paddingY: theme.spacing(1),
					borderRadius: theme.spacing(1.5),
					'&.Mui-disabled': {
						backgroundColor: `${theme.palette.primary.main} !important`,
						opacity: 0.4,
						color: theme.palette.common.black
					},
					'&.MuiButton-rerecord': {
						marginTop: 0,
						paddingLeft: theme.spacing(2),
						paddingRight: theme.spacing(2),
						paddingY: theme.spacing(0.5),
						borderRadius: theme.spacing(1.5)
					}
				})
			},
		},
		MuiTypography: {
			styleOverrides: {
				root: {
					'&.info-text-heading': {
						fontStyle: 'italic',
						fontWeight: 700
					}
				}
			}
		},
		MuiTab: {
			styleOverrides: {
				root: ({ theme }: { theme: Theme }) => ({
					minWidth: 'auto',
					padding: `${theme.spacing(1.5)} 0`,
					marginLeft: theme.spacing(3),
					'&.Mui-selected': {
						color: theme.palette.primary.main
					}
				})
			}
		},
		MuiTabs: {
			styleOverrides: {
				indicator: {
					display: 'flex'
				}
			}
		}
	},
};

// Color themes
const darkColorTheme = {
	palette: {
		mode: 'dark' as PaletteMode,
		primary: {
			main: '#A3E635',
		},
		secondary: {
			main: '#042F2E',
		},
		background: {
			paper: '#14532D',
		},
	},
};

const lightColorTheme = {
	palette: {
		mode: 'light' as PaletteMode,
		primary: {
			main: '#159095',
		},
		secondary: {
			main: '#042F2E',
		},
		background: {
			paper: '#14532D',
		},
	},
};

// Create final themes by combining base theme with color themes
export const defaultTheme = createTheme({
	...baseTheme,
	...darkColorTheme,
});

export const lightTheme = createTheme({
	...baseTheme,
	...lightColorTheme,
});

export const useDefaultStyles = makeStyles(() => ({
	root: {
		height: '100vh',
		display: 'flex',
	},
}));
