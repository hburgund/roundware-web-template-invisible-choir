import speakerImage from '@/assets/speaker.png';
import { useRoundware } from '@/hooks';
import { speakerPolygonColors as colors, speakerPolygonOptions } from '@/styles/speaker';
import { GroundOverlay, GroundOverlayProps } from '@react-google-maps/api';
import getCenterOfMass from '@turf/center-of-mass';
import destination from '@turf/destination';
import distance from '@turf/distance';
import { point, Point, polygon, Position } from '@turf/helpers';
import midpoint from '@turf/midpoint';
import { useMemo } from 'react';
import { ISpeakerData } from 'roundware-web-framework';
import config from '@/config';
interface Props {}

const getColorForIndex = (index: number): string => {
	return colors[index % colors.length];
};
const SpeakerImages = (props: Props) => {
	const { roundware, hideSpeakerPolygons, lastSpeakerUpdateTime, sessionCreatedSpeakerIds, timeMachineFilterDate, timeMachineMode, timeMachineOrderIndex } = useRoundware();
	const [recentSpeakerIds, setRecentSpeakerIds] = useState<Set<number>>(new Set());
	
	// Calculate sorted speakers list for order-based mode (only when feature is enabled)
	const sortedSpeakersForOrder = useMemo(() => {
		// Skip computation when time machine is disabled
		if (!config.map.displayTimeMachineSlider) {
			return [];
		}
		
		if (!roundware.speakers || !Array.isArray(roundware.speakers())) {
			return [];
		}

		const speakers = roundware.speakers();
		const minDate = new Date(config.map.timeMachineSliderMin);
		
		// Get max date from speakers
		const validTimestamps = speakers
			.filter(speaker => speaker.created && !isNaN(new Date(speaker.created).getTime()))
			.map(speaker => new Date(speaker.created).getTime());
		
		if (validTimestamps.length === 0) return [];
		
		const maxDate = new Date(Math.max(...validTimestamps));

		// Filter speakers within the time range and sort by creation time (oldest first)
		return speakers
			.filter(speaker => {
				const speakerCreated = speaker.created;
				if (!speakerCreated) return false;
				const speakerDate = new Date(speakerCreated);
				if (isNaN(speakerDate.getTime())) return false;
				return speakerDate >= minDate && speakerDate <= maxDate;
			})
			.sort((a, b) => {
				const aTime = new Date(a.created!).getTime();
				const bTime = new Date(b.created!).getTime();
				return aTime - bTime; // Oldest first
			});
	}, [roundware.speakers]);
	
	// Create a map of speaker ID to index in sorted list for order-based mode
	const speakerIdToOrderIndex = useMemo(() => {
		const map = new Map<number, number>();
		sortedSpeakersForOrder.forEach((speaker, index) => {
			map.set(speaker.id, index);
		});
		return map;
	}, [sortedSpeakersForOrder]);

	// Calculate recent speakers from currently visible speakers
	const updateRecentSpeakers = useMemo(() => {
		if (!roundware.speakers || !Array.isArray(roundware.speakers())) {
			return new Set<number>();
		}

		const speakers = roundware.speakers();
		const recentCount = config.map.recentSpeakerCount || 5;
		
		// Apply time machine filter to get currently visible speakers
		const visibleSpeakers = speakers.filter(speaker => {
			// Only apply time machine filtering if the feature is enabled
			if (!config.map.displayTimeMachineSlider) {
				return true; // Show all speakers when time machine is disabled
			}
			
			if (timeMachineMode === 'order-based') {
				// Order-based mode: check if speaker index is within the order index
				const speakerIndex = speakerIdToOrderIndex.get(speaker.id);
				if (speakerIndex === undefined) return false;
				return speakerIndex < timeMachineOrderIndex;
			} else {
				// Time-based mode: only show speakers created before the selected date
				if (!timeMachineFilterDate) return true;
				
				const speakerCreated = speaker.created;
				if (!speakerCreated) return true;
				
				const speakerDate = new Date(speakerCreated);
				if (isNaN(speakerDate.getTime())) return true;
				
				return speakerDate <= timeMachineFilterDate;
			}
		});
		
		// Filter visible speakers with valid created timestamps and sort by creation time (newest first)
		const speakersWithValidCreated = visibleSpeakers
			.filter(speaker => speaker.created && !isNaN(new Date(speaker.created).getTime()))
			.sort((a, b) => new Date(b.created!).getTime() - new Date(a.created!).getTime());

		// Take the most recent speakers from visible ones
		const recentSpeakers = speakersWithValidCreated.slice(0, recentCount);
		return new Set(recentSpeakers.map(speaker => speaker.id));
	}, [roundware.speakers, timeMachineFilterDate, timeMachineMode, timeMachineOrderIndex, speakerIdToOrderIndex]);

	// Update recent speaker IDs when calculation changes
	useEffect(() => {
		setRecentSpeakerIds(updateRecentSpeakers);
	}, [updateRecentSpeakers]);

	const overlayProps: (GroundOverlayProps & {
		key: string;
	})[] = useMemo(() => {
		if (!Array.isArray(roundware.speakers())) return [];

		const p = roundware
			.speakers()
			?.sort((a, b) => (a?.id > b?.id ? -1 : 1))
			?.filter((speaker): speaker is ISpeakerData & Required<Pick<ISpeakerData, 'shape'>> => !!speaker.shape)
			?.filter((s) => !hideSpeakerPolygons.includes(s.id))
			?.filter((s) => {
				// Only apply time machine filtering if the feature is enabled
				if (!config.map.displayTimeMachineSlider) {
					return true; // Show all speakers when time machine is disabled
				}
				
				if (timeMachineMode === 'order-based') {
					// Order-based mode: check if speaker index is within the order index
					const speakerIndex = speakerIdToOrderIndex.get(s.id);
					if (speakerIndex === undefined) return false;
					return speakerIndex < timeMachineOrderIndex;
				} else {
					// Time-based mode: only show speakers created before the selected date
					if (!timeMachineFilterDate) return true;
					
					const speakerCreated = s.created;
					if (!speakerCreated) return true; // Show speakers without timestamps
					
					const speakerDate = new Date(speakerCreated);
					if (isNaN(speakerDate.getTime())) return true; // Show speakers with invalid timestamps
					
					return speakerDate <= timeMachineFilterDate;
				}
			})
			.flatMap((s, index) => {
				const shape = polygon(s.shape.coordinates[0]);
				const coordinates = shape.geometry.coordinates[0];

				// get midpoints of all edges
				const midpoints: Point[] = [];

				for (let i = 0; i < coordinates.length - 1; i++) {
					const currentPoint = point(coordinates[i]);
					const nextPoint = point(coordinates[i + 1]);
					midpoints.push(midpoint(currentPoint, nextPoint).geometry);
				}

				// center of mass of polygon
				const centerOfMass = getCenterOfMass(shape).geometry.coordinates;

				// distances from center of mass to each midpoint
				const distances: number[] = [];

				midpoints.forEach((m) =>
					distances.push(
						distance(centerOfMass, m.coordinates, {
							units: 'degrees',
						})
					)
				);

				// take mean distance
				const avgDistance = (Math.min(...distances) + Math.max(...distances)) / 2;

				// find square points
				const squarePoints: Position[] = [];

				for (let i = 0; i < 4; i++) {
					squarePoints.push(
						destination(centerOfMass, avgDistance, 90 * i + 45, {
							units: 'degrees',
						}).geometry.coordinates
					);
				}

				const prop: GroundOverlayProps & {
					key: string;
				} = {
					bounds: {
						north: squarePoints[0][1],
						south: squarePoints[2][1],
						east: squarePoints[0][0],
						west: squarePoints[2][0],
					},
					url: speakerImage,
					options: {
						opacity: sessionCreatedSpeakerIds.includes(s.id) 
							? (config.map.sessionCreatedSpeakerDefaults?.fillOpacity ?? 0.4)
							: 0.2,
					},
					key: speakerImage + JSON.stringify(squarePoints),
				};

				return [prop];
			});

		return p;
	}, [hideSpeakerPolygons, lastSpeakerUpdateTime, sessionCreatedSpeakerIds, timeMachineFilterDate, recentSpeakerIds, timeMachineMode, timeMachineOrderIndex, speakerIdToOrderIndex]);

	return (
		<>
			{Array.isArray(overlayProps) &&
				overlayProps.map((p) => {
					return <GroundOverlay {...p} key={p.key} />;
				})}
		</>
	);
};

export default SpeakerImages;
