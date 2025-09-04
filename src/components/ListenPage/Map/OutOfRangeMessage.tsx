import WarningDialog from '@/components/elements/WarningDialog';
import { Feature, FeatureCollection, LineString, MultiLineString, Point, point } from '@turf/helpers';
import pointToLine from '@turf/point-to-line-distance';
import polygonToLineString from '@turf/polygon-to-line';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { useRoundware } from '@/hooks';
import { isNumber } from 'lodash';
import { useMemo, useState } from 'react';

type Props = {};
export const normalizeCoords = (coordinates: number[]) => {
	for (let i = 0; i < coordinates.length; i++) {
		if (coordinates[i] > 180) coordinates[i] = (coordinates[i] % 180) - 180;
		else if (coordinates[i] < -180) coordinates[i] = (coordinates[i] % 180) + 180;
	}
	return coordinates;
};

/**
 * @param  {number} {latitude
 * @param  {number} longitude
 * @returns Feature<Point>
 */
export function coordsToPoints({ latitude, longitude }: { latitude: number; longitude: number }): Feature<Point> {
	// shreyas - we need make sure coordinate lies within range of 180 to -180
	return point(normalizeCoords([+longitude, +latitude])); // NOTE we need to reverse the order here to make geolocations compatible with Roundware geometries, which have points listed w/ longitude first
}

const OutOfRangeMessage = (props: Props) => {
	const { roundware, lastSpeakerUpdateTime } = useRoundware();
	const [dialogOpen, setDialogOpen] = useState(false);

	const show = useMemo(() => {
		if (!roundware.project.data?.out_of_range_message || !isNumber(roundware.project.outOfRangeDistance)) {
			return false;
		}

		const listenerPoint = roundware.mixer?.mixParams?.listenerPoint;

		// if we don't have a listener location, we can't show the message
		if (!listenerPoint) {
			return false;
		}

		// if we are in range, we don't need to show the message
		if (roundware.project.outOfRangeDistance <= 0) {
			return false;
		}

		// check if listener is in range of any speaker
		if (
			roundware.speakers().some((speaker) => {
				if (!speaker.shape) {
					return false;
				}
				return booleanPointInPolygon(listenerPoint, speaker.shape);
			})
		) {
			return false;
		}

		const lines: LineString[] = [];

		roundware.speakers().forEach((speaker) => {
			if (speaker.shape) {
				try {
					const polygonLines = polygonToLineString(speaker.shape) as FeatureCollection<LineString | MultiLineString> | LineString | MultiLineString;
					if (polygonLines.type === 'FeatureCollection') {
						polygonLines.features.forEach((line) => {
							if (line.geometry.type === 'LineString') {
								lines.push(line.geometry);
							} else if (line.geometry.type === 'MultiLineString') {
								line.geometry.coordinates.forEach((coord) => {
									lines.push({ type: 'LineString', coordinates: coord });
								});
							}
						});
					}

					if (polygonLines.type === 'LineString') {
						lines.push(polygonLines);
					}

					if (polygonLines.type === 'MultiLineString') {
						polygonLines.coordinates.forEach((coord) => {
							lines.push({ type: 'LineString', coordinates: coord });
						});
					}
				} catch (error) {
					console.warn(`Speaker ${speaker.id} has invalid geometry, skipping out-of-range calculation:`, error);
				}
			}
		});

		const distances = lines.map((line) =>
			pointToLine(listenerPoint, line, {
				units: 'meters',
			})
		);

		if (distances.length === 0) {
			return false;
		}

		const minDistance = Math.min(...distances);
		console.log('minDistance', minDistance, roundware.project.outOfRangeDistance);
		if (minDistance < roundware.project.outOfRangeDistance) {
			return false;
		}

		return true;
	}, [roundware.project.data?.out_of_range_message, roundware.project.outOfRangeDistance, roundware.listenerLocation, roundware.speakers(), lastSpeakerUpdateTime]);

	// Update dialog state when show condition changes
	useMemo(() => {
		setDialogOpen(show);
	}, [show]);

	const handleClose = () => {
		setDialogOpen(false);
	};

	const handleAcknowledge = () => {
		setDialogOpen(false);
	};

	if (show) {
		return (
			<WarningDialog
				open={dialogOpen}
				onSecondary={handleClose}
				onPrimary={handleAcknowledge}
				title="Out of Range"
				message={roundware.project.data?.out_of_range_message || 'You are out of range of this Roundware project. Please go somewhere within range and try again. Thank you.'}
				showSecondaryButton={false}
				primaryText="OK"
			/>
		);
	}
	return null;
};

export default OutOfRangeMessage;
