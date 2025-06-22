import { Polygon, PolygonProps } from '@react-google-maps/api';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRoundware } from '@/hooks';
import { speakerPolygonColors as colors, speakerPolygonOptions } from '@/styles/speaker';
import { polygonToGoogleMapPaths } from '@/utils';
import CustomMapControl from '../CustomControl';
import config from '@/config';

interface Props {}

const getColorForIndex = (index: number): string => {
	return colors[index % colors.length];
};
const SpeakerPolygons = (props: Props) => {
	const { roundware, hideSpeakerPolygons, lastSpeakerUpdateTime } = useRoundware();

	const [options, setOptions] = useState<PolygonProps[`options`]>(speakerPolygonOptions);
	const [googleMapPolygonProps, setGoogleMapPolygonProps] = useState<PolygonProps[]>([]);

	const updatePolygons = () => {
		setGoogleMapPolygonProps(
			roundware.mixer.speakerEngine?.speakers
				?.sort((a, b) => (a?.data.id > b?.data.id ? -1 : 1))
				?.filter(({ data: speaker }) => !!speaker.shape)
				?.filter((s) => !hideSpeakerPolygons.includes(s.data.id))
				.flatMap((s, index) => {
					const prop: PolygonProps & { key: string } = {
						path: polygonToGoogleMapPaths(s.data.shape!),
						options: {
							...options,
							fillColor: getColorForIndex(index),
							strokeColor: getColorForIndex(index),
							...(!s.buffer
								? {
										fillOpacity: 0,
										strokeOpacity: 1,
										strokeWeight: 1,
										strokeColor: getColorForIndex(index),
								  }
								: {}),
						},
						key: s.data.id.toString(),
					};
					return [prop];
				}) ?? []
		);
	};

	useEffect(() => {
		// Update immediately on mount
		updatePolygons();
	}, []);

	// Update polygons when speakers are updated (using timestamp)
	useEffect(() => {
		if (lastSpeakerUpdateTime) {
			updatePolygons();
		}
	}, [lastSpeakerUpdateTime]);

	useEffect(() => {
		if (!Array.isArray(roundware.speakers())) {
			return;
		}

		if (roundware.mixer?.speakerEngine?.speakers) {
			roundware.mixer.speakerEngine.speakers.forEach((s) => {
				s.on('loaded', updatePolygons);
				s.on('unloaded', updatePolygons);
			});
		}

		// Trigger initial update
		updatePolygons();

		return () => {
			if (roundware.mixer?.speakerEngine?.speakers) {
				roundware.mixer.speakerEngine.speakers.forEach((s) => {
					s.off('loaded', updatePolygons);
					s.off('unloaded', updatePolygons);
				});
			}
		};
	}, [roundware.speakers(), roundware.mixer?.speakerEngine?.speakers]);

	return (
		<div>
			{config.debugMode === true && (
				<CustomMapControl position={window.google.maps.ControlPosition.LEFT_CENTER}>
					<div>
						<p>fillOpacity</p>
						<input type='number' value={options?.fillOpacity?.toString()} onChange={(e) => setOptions((prev) => ({ ...prev, fillOpacity: Number(e.target.value) }))} />
					</div>

					<div>
						<p>strokeOpacity</p>
						<input type='number' value={options?.strokeOpacity?.toString()} onChange={(e) => setOptions((prev) => ({ ...prev, strokeOpacity: Number(e.target.value) }))} />
					</div>

					<div>
						<p>strokeWeight</p>
						<input type='number' value={options?.strokeWeight?.toString()} onChange={(e) => setOptions((prev) => ({ ...prev, strokeWeight: Number(e.target.value) }))} />
					</div>
				</CustomMapControl>
			)}
			{Array.isArray(googleMapPolygonProps) && googleMapPolygonProps.map((p) => <Polygon {...p} />)}
		</div>
	);
};

export default SpeakerPolygons;
