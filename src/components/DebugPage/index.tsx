import Dialog from '@mui/material/Dialog';
import React from 'react';
import LegalAgreementForm from '../LegalAgreementForm';

const DebugPage = () => {
	return (
		<Dialog open={true}>
			<LegalAgreementForm
				onAccept={() => {
					debugger;
				}}
				onDecline={() => {
					debugger;
				}}
			/>
		</Dialog>
	);
};

export default DebugPage;
