import { Button, Dialog, DialogContent, Stack, Typography } from '@mui/material';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';

type Props = {
	open: boolean;
	onClose: () => void;
};

const LocationNotFoundDialog = (props: Props) => {
	return (
		<Dialog 
			open={props.open} 
			onClose={props.onClose}
			fullScreen
		>
			<DialogContent>
				<Stack spacing={2} alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
					<LocationOnOutlinedIcon />
					<Typography variant="h6" sx={{ color: 'black' }}>
						LOCATION NOT FOUND!
					</Typography>
					<Typography sx={{ textAlign: 'center', color: 'black' }}>
						Sorry we couldn't find your location. Please refresh you browser and try again.
					</Typography>
					<Button 
						variant="contained"
						onClick={props.onClose}
					>
						GOT IT!
					</Button>
				</Stack>
			</DialogContent>
		</Dialog>
	);
};

export default LocationNotFoundDialog; 