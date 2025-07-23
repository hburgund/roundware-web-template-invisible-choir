//the createMuiTheme function was renamed to createTheme.
import { createTheme, Theme } from '@mui/material/styles';
import { PaletteMode, ButtonProps } from '@mui/material';
import { makeStyles } from '@mui/styles';

declare module '@mui/material/Button' {
	interface ButtonPropsVariantOverrides {
		rerecord: true;
	}
}

const black = '#000000';
const white = '#ffffff';

// Base theme with common settings
const baseTheme = {
	typography: {
		fontFamily: 'Inria Sans, sans-serif',
	},
	components: {
		MuiDialog: {
			styleOverrides: {
				paper: ({ theme }: { theme: Theme }) => ({
					backgroundColor: white,
					'& .MuiDialogTitle-root': {
						color: black,
						fontWeight: 'bold'
					},
					'& .MuiDialogContentText-root': {
						color: black
					},
					'& .MuiDialogContent-root': {
						paddingBottom: 0,
						color: black
					},
					'& .MuiDialogActions-root': {
						justifyContent: 'flex-end',
						'& .MuiButton-outlined': {
							borderColor: black,
							color: black,
							padding: `${theme.spacing(1)} ${theme.spacing(2.5)}`,
							borderRadius: 0,
							textTransform: 'none',
							marginRight: theme.spacing(1),
							marginBottom: theme.spacing(2)
						},
						'& .MuiButton-contained': {
							backgroundColor: black,
							color: white,
							padding: `${theme.spacing(1)} ${theme.spacing(2.5)}`,
							borderRadius: 0,
							textTransform: 'none',
							marginRight: theme.spacing(2),
							marginBottom: theme.spacing(2)
						}
					},
					'&.location-permission-dialog': {
						borderRadius: 20
					},

					// Style for FullScreenOverlay component to ensure white text and icons
					'&[data-fullscreen-overlay="true"]': {
						'& .MuiTypography-root': {
							color: white
						},
						'& .MuiSvgIcon-root': {
							color: white
						},
						'& .MuiIconButton-root': {
							color: white
						}
					}
				})
			}
		},
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
					},
					'&.MuiButton-microphone': {
						marginTop: 0,
						paddingLeft: theme.spacing(3.5),
						paddingRight: theme.spacing(3.5),
						paddingY: theme.spacing(0),
						borderRadius: theme.spacing(2)
					},
					'&.MuiButton-dialog': {
						position: 'relative',
						zIndex: 10,
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
					},
					'&.joinChoirTitle': {
						fontSize: '48px !important',
						textTransform: 'none',
					},
					'&.joinChoirText': {
						fontSize: '15px !important',
						textAlign: 'center',
						whiteSpace: 'pre-line',
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
		},
		MuiFab: {
			styleOverrides: {
				root: {
					'&.reset-button': {
						position: 'fixed',
						zIndex: 100,
						right: 20,
						bottom: 68,
						'&:hover': {
							backgroundColor: 'secondary.dark',
						},
					},
					'&.map-button': {
						position: 'fixed',
						zIndex: 100,
						left: 20,
						bottom: 68,
						'&:hover': {
							backgroundColor: 'secondary.dark',
						},
						'&.hidden': {
							display: 'none',
						},
					}
				}
			}
		},
		MuiTooltip: {
			defaultProps: {
				PopperProps: {
					style: { zIndex: 1000 }
				}
			}
		},

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
