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

const SpeakerPolygons = (props: Props) => {
	const { roundware, hideSpeakerPolygons } = useRoundware();
	const [options, setOptions] = useState<PolygonProps[`options`]>(speakerPolygonOptions);
	const [fillOpacities, setFillOpacities] = useState<{ [key: number]: number }>({});
	const polygonPulseDurations = useRef<{ [key: number]: number }>({});
	const [debugMarkers, setDebugMarkers] = useState<number>(0);

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

	// Create custom marker icon
	const createCustomMarkerIcon = () => {
		return {
			url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3E%3Ccircle cx='4' cy='4' r='3.5' fill='white' stroke='black' stroke-width='1'/%3E%3C/svg%3E",
			size: new google.maps.Size(8, 8),
			anchor: new google.maps.Point(4, 4),
		};
	};

	const googleMapPolygonProps = useMemo(() => {
		if (!Array.isArray(roundware.speakers())) {
			console.log("No speakers array found");
			return [];
		}

		console.log("Total speakers:", roundware.speakers()?.length);
		let totalMarkers = 0;

		const elements = roundware
			.speakers()
			?.sort((a, b) => (a?.id > b?.id ? -1 : 1))
			?.filter((speaker): speaker is ISpeakerData & Required<Pick<ISpeakerData, 'shape'>> => {
				const hasShape = !!speaker.shape;
				if (!hasShape) console.log("Speaker without shape:", speaker?.id);
				return hasShape;
			})
			?.filter((s) => {
				const isHidden = hideSpeakerPolygons.includes(s.id);
				if (isHidden) console.log("Hidden speaker:", s.id);
				return !isHidden;
			})
			.flatMap((s, index) => {
				// Get the path using the existing utility
				const path = polygonToGoogleMapPaths(s.shape);
				console.log(`Speaker ${s.id} path:`, path ? `${path.length} points` : 'no path');

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

				// Create a polygon element
				const polygonElement = <Polygon {...prop} key={`polygon-${s.id}`} />;

				// Create array to hold all elements (polygon + vertex markers)
				const elements = [polygonElement];

				// Add markers for each vertex if path exists
				if (path && Array.isArray(path)) {
					let markerCount = 0;

					// Only use the LatLng object format since that's what works
					path.forEach((vertex, vertexIndex) => {
						if (vertex && typeof vertex.lat === 'function' && typeof vertex.lng === 'function') {
							const lat = vertex.lat();
							const lng = vertex.lng();
							markerCount++;

							elements.push(
								<Marker
									key={`vertex-${s.id}-${vertexIndex}`}
									position={{ lat, lng }}
									icon={createCustomMarkerIcon()}
									visible={true}
									zIndex={1000}
								/>
							);
						}
					});

					console.log(`Added ${markerCount} markers for speaker ${s.id}`);
					totalMarkers += markerCount;
				}

				return elements;
			});

		// Update the total marker count
		setDebugMarkers(totalMarkers);
		console.log("Total elements created:", elements.length);
		return elements;
	}, [roundware.project, options, hideSpeakerPolygons, fillOpacities]);

	useEffect(() => {
		console.log(`Debug: Total markers count: ${debugMarkers}`);
	}, [debugMarkers]);

	return (
		<div>
			{config.debugMode === true && (
				<>
					<CustomMapControl position={google.maps.ControlPosition.LEFT_CENTER}>
						<div>
							<p>fillOpacity</p>
							<input type='number' value={options?.fillOpacity?.toString()} onChange={(e) => setOptions((prev) => ({ ...prev, fillOpacity: Number(e.target.value) }))} />
						</div>
					</CustomMapControl>
					<CustomMapControl position={google.maps.ControlPosition.TOP_RIGHT}>
						<div style={{ backgroundColor: 'white', padding: '5px', border: '1px solid #ccc' }}>
							<p>Debug Info:</p>
							<p>Markers count: {debugMarkers}</p>
							<p>Elements: {googleMapPolygonProps.length}</p>
						</div>
					</CustomMapControl>
				</>
			)}
			{googleMapPolygonProps.map((p, index) => <React.Fragment key={index}>{p}</React.Fragment>)}
		</div>
	);
};

export default SpeakerPolygons;
