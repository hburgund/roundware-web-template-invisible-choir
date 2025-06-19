import { Button, Container, Dialog, DialogContent, Stack, Typography } from '@mui/material';
import MicOffOutlinedIcon from '@mui/icons-material/MicOffOutlined';
import LeafBackground from '../LeafBackground';

type Props = {
	open: boolean;
	onClose: () => void;
	onNeedHelp?: () => void;
};

const MicrophoneBlockedDialog = (props: Props) => {
	return (
		<Dialog 
			open={props.open} 
			onClose={props.onClose}
			fullScreen
		>
			<LeafBackground>
				<DialogContent sx={{ 
					display: 'flex', 
					flexDirection: 'column',
					justifyContent: 'space-between', 
					alignItems: 'center', 
					minHeight: '100vh',
			
				}}>
					<Container sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
						<Stack spacing={4} alignItems="center" justifyContent="center" sx={{ width: '100%' }}>
							<Stack spacing={2} alignItems="center">
								<MicOffOutlinedIcon sx={{ fontSize: 40 }} />
								<Typography 
									variant="h6" 
									component="h1" 
								>
									MICROPHONE BLOCKED
								</Typography>
							</Stack>
							<Typography 
								variant="body1"
								sx={{ textAlign: 'center' }}
							>
								To participate fully in the artwork we need access to your microphone. In the meantime, you can still listen to our choirs in your current location.
							</Typography>
							<Button 
								variant="contained"
								color="primary"
								size="large"
							>
								GOT IT!
							</Button>
						</Stack>
					</Container>
					<Button 
						variant="outlined"
						color="primary"
						size="large"
						className="MuiButton-microphone"
						sx={{ mt: 'auto', mb: 4 }}
					>
						NEED MORE HELP
					</Button>
				</DialogContent>
			</LeafBackground>
		</Dialog>
	);
};

export default MicrophoneBlockedDialog; 