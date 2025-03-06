import { Polygon, PolygonProps, Marker } from '@react-google-maps/api';
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useRoundware } from '@/hooks';
import { speakerPolygonColors as colors, speakerPolygonOptions } from '@/styles/speaker';
import { polygonToGoogleMapPaths } from '@/utils';
import CustomMapControl from '../CustomControl';
import config from '@/config';
import { ISpeakerData } from 'roundware-web-framework';

interface Props {}

const getColorForIndex = (index: number): string => {
	return colors[index % colors.length];
};

const getRandomPulseDuration = () => Math.random() * (8000 - 3000) + 3000;

const getRandomPolygon = (center: google.maps.LatLngLiteral, numSides: number, baseRadius: number) => {
	const angleStep = (2 * Math.PI) / numSides;
	const points = Array.from({ length: numSides }, (_, i) => {
		const angle = i * angleStep;
		// Apply a random factor to the radius for each point (between 0.6 and 1.4 of the base radius)
		const randomFactor = 0.6 + Math.random() * 0.8;
		const radius = baseRadius * randomFactor;

		const lat = center.lat + (radius * Math.sin(angle)) / 111320;
		const lng = center.lng + (radius * Math.cos(angle)) / (111320 * Math.cos(center.lat * (Math.PI / 180)));
		return { lat, lng };
	});
	points.push(points[0]); // Close the polygon
	return points;
};

const SpeakerPolygons = (props: Props) => {
	const { roundware, hideSpeakerPolygons } = useRoundware();
	const [options, setOptions] = useState<PolygonProps[`options`]>(speakerPolygonOptions);
	const [fillOpacities, setFillOpacities] = useState<{ [key: number]: number }>({});
	const polygonPulseDurations = useRef<{ [key: number]: number }>({});

	// Create the random polygon once and store it in a ref
	const zeroPolygonRef = useRef<google.maps.LatLngLiteral[]>();

	// Initialize the zero polygon once
	useEffect(() => {
		if (!zeroPolygonRef.current) {
			const randomNumSides = Math.floor(Math.random() * 8) + 3; // Random number of sides between 3 and 10
			const radius = 1000 * 1000; // 1000 km in meters
			zeroPolygonRef.current = getRandomPolygon({ lat: 0, lng: 0 }, randomNumSides, radius);
		}
	}, []);

	useEffect(() => {
		const newDurations: { [key: number]: number } = {};
		roundware
			.speakers()
			?.filter((s) => !hideSpeakerPolygons.includes(s.id))
			.forEach((s) => {
				newDurations[s.id] = getRandomPulseDuration();
			});
		polygonPulseDurations.current = newDurations;
	}, [roundware.project, hideSpeakerPolygons]);

	useEffect(() => {
		let startTimes: { [key: number]: number } = {};
		let animationFrame: number;

		const pulse = (timestamp: number) => {
			const newOpacities: { [key: number]: number } = {};
			roundware
				.speakers()
				?.filter((s) => !hideSpeakerPolygons.includes(s.id))
				.forEach((s) => {
					if (!startTimes[s.id]) startTimes[s.id] = timestamp;
					const progress = ((timestamp - startTimes[s.id]) / polygonPulseDurations.current[s.id]) % 1;
					newOpacities[s.id] = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(progress * Math.PI * 2));
				});

			setFillOpacities(newOpacities);
			animationFrame = requestAnimationFrame(pulse);
		};

		animationFrame = requestAnimationFrame(pulse);
		return () => cancelAnimationFrame(animationFrame);
	}, [roundware.project, hideSpeakerPolygons]);

	const googleMapPolygonProps = useMemo(() => {
		// Use the pre-generated zero polygon from the ref
		const zeroPolygonProps: PolygonProps = {
			path: zeroPolygonRef.current,
			options: {
				...options,
				fillColor: '#0000FF',
				strokeColor: '#0000FF',
				fillOpacity: 0.5,
			},
			key: 'zero-polygon',
		};

		if (!Array.isArray(roundware.speakers())) return [<Polygon {...zeroPolygonProps} />];
		return [
			<Polygon {...zeroPolygonProps} />,
			...roundware
				.speakers()
				?.sort((a, b) => (a?.id > b?.id ? -1 : 1))
				?.filter((speaker): speaker is ISpeakerData & Required<Pick<ISpeakerData, 'shape'>> => !!speaker.shape)
				?.filter((s) => !hideSpeakerPolygons.includes(s.id))
				.flatMap((s, index) => {
					const path = polygonToGoogleMapPaths(s.shape);
					const prop: PolygonProps = {
						path: path,
						options: {
							...options,
							fillColor: getColorForIndex(index),
							strokeColor: getColorForIndex(index),
							fillOpacity: fillOpacities[s.id] || 0.6,
						},
						key: s?.id,
					};
					return [
						<Polygon {...prop} key={`polygon-${s.id}`} />,
					];
				}),
		];
	}, [roundware.project, options, hideSpeakerPolygons, fillOpacities]);

	return (
		<div>
			{config.debugMode === true && (
				<CustomMapControl position={window.google.maps.ControlPosition.LEFT_CENTER}>
					<div>
						<p>fillOpacity</p>
						<input type='number' value={options?.fillOpacity?.toString()} onChange={(e) => setOptions((prev) => ({ ...prev, fillOpacity: Number(e.target.value) }))} />
					</div>
				</CustomMapControl>
			)}
			{googleMapPolygonProps.map((p, index) => <React.Fragment key={index}>{p}</React.Fragment>)}
		</div>
	);
};

export default SpeakerPolygons;
