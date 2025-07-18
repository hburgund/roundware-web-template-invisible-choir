import { Typography, FormControlLabel, Checkbox, Stack } from '@mui/material';
import React, { useState } from 'react';
import { useRoundware } from '../hooks';
import FullScreenOverlay from './elements/FullScreenOverlay';

interface LegalAgreementFormProps {
	onAccept: () => void;
	onDecline: () => void;
}

const LegalAgreementForm = ({ onAccept, onDecline }: LegalAgreementFormProps) => {
	const { roundware } = useRoundware();
	const [accepted_agreement, set_accepted_agreement] = useState<boolean>(false);
	
	if (!roundware.project) {
		return null;
	}

	return (
		<FullScreenOverlay
			open={true}
			onClose={onDecline}
			title="Consent Agreement"
			description={roundware.project.legalAgreement}
			children={
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
			}
			primaryButton={{
				text: "Submit",
				onClick: onAccept,
				disabled: !accepted_agreement
			}}
			secondaryButton={{
				text: "Go Back",
				onClick: onDecline
			}}
			showCloseButton={false}
		/>
	);
};

export default LegalAgreementForm;
