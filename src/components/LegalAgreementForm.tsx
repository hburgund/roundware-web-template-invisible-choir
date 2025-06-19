import { Typography } from '@mui/material';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import { ThemeProvider } from '@mui/styles';
import React, { Fragment, useState } from 'react';
import { useRoundware } from '../hooks';
import { lightTheme } from '../styles';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import greenBackground from '../assets/green_background.svg';

interface LegalAgreementFormProps {
	onAccept: React.MouseEventHandler<HTMLButtonElement>;
	onDecline: React.MouseEventHandler<HTMLButtonElement>;
}

const LegalAgreementForm = ({ onAccept, onDecline }: LegalAgreementFormProps) => {
	const { roundware } = useRoundware();
	const [accepted_agreement, set_accepted_agreement] = useState<boolean>(false);
	if (!roundware.project) {
		return null;
	}
	return (
		<Dialog
			fullScreen
			open={true}
			PaperProps={{
				sx: {
					backgroundImage: `url(${greenBackground})`,
					backgroundSize: 'cover',
					backgroundPosition: 'center',
					backgroundRepeat: 'no-repeat',
				}
			}}
		>
			<DialogContent>
				<Box
					sx={{
						height: '100%',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center'
					}}
				>
					<Container maxWidth="xs">
						<Stack
							spacing={3}
							alignItems="center"
							sx={{ width: '100%', px: 2 }}
						>
							<Typography variant="h4" component="div" textAlign="center">
								Consent Agreement
							</Typography>

							<Typography variant="body1" textAlign="center" sx={{ whiteSpace: 'pre-line' }}>
								{roundware.project.legalAgreement}
							</Typography>

							<FormControlLabel
								label={'I AGREE'}
								control={
									<Checkbox
										checked={accepted_agreement === true}
										onChange={(e) => {
											set_accepted_agreement(e.target.checked);
										}}
										sx={(theme) => ({
											'&.Mui-checked': {
												color: theme.palette.primary.main,
											},
										})}
									/>
								}
							/>

							<Stack spacing={2} width="100%">
								<Button
									variant="contained"
									onClick={onAccept}
									fullWidth
									size="large"
									disabled={!accepted_agreement}
								>
									Submit
								</Button>

								<Button
									variant="text"
									onClick={onDecline}
									fullWidth
									size="large"
								>
									Go Back
								</Button>
							</Stack>
						</Stack>
					</Container>
				</Box>
			</DialogContent>
		</Dialog>
	);
};

export default LegalAgreementForm;
