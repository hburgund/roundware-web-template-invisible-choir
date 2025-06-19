import { useRoundware } from '../../hooks';


import Introduction from '../Introduction';

export const LandingPage = () => {
	const { roundware } = useRoundware();

	const project = roundware.project;
	if (!project || project.projectName === '(unknown)') {
		return null;
	}

	return (
		<Introduction />
	);
};
