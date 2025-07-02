import { Polygon, PolygonProps, Marker, Polyline } from '@react-google-maps/api';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRoundware } from '@/hooks';
import { speakerPolygonColors as colors, speakerPolygonOptions } from '@/styles/speaker';
import { polygonToGoogleMapPaths } from '@/utils';
import CustomMapControl from '../CustomControl';
import config from '@/config';
import { 
	getRandomSpeakerColor, 
	isValidColor, 
	getFillOpacity, 
	getStrokeOpacity, 
	getBaseColor 
} from '@/utils/colors';
import * as turf from '@turf/turf';
// Import module augmentation to extend ISpeakerData with color fields
import '@/types/speaker-augmentation';

interface Props {}

const getColorForIndex = (index: number): string => {
	return colors[index % colors.length];
};

/**
 * Calculate the centroid (center point) of a polygon using Turf.js for accuracy
 */
const calculatePolygonCenter = (shape: any): google.maps.LatLngLiteral => {
	try {
		// The shape is already a GeoJSON object
		if (shape && shape.type === 'MultiPolygon' && Array.isArray(shape.coordinates)) {
			// Use turf.center() instead of turf.centroid() - this gives the center of the bounding box
			// which is more visually intuitive for irregular polygons
			const center = turf.center(shape);

			if (config.debugMode) {
				console.log('Turf center (bounding box) calculation for speaker:', {
					shapeType: shape.type,
					center: center.geometry.coordinates,
					result: {
						lat: center.geometry.coordinates[1],
						lng: center.geometry.coordinates[0]
					}
				});
			}

			return {
				lat: center.geometry.coordinates[1],
				lng: center.geometry.coordinates[0]
			};
		} else {
			throw new Error("Shape is not a valid GeoJSON MultiPolygon");
		}
	} catch (error) {
		console.error("Error calculating polygon center:", error);

		// Fallback for GeoJSON: use the first point of the first polygon
		try {
			if (shape &&
				shape.type === 'MultiPolygon' &&
				Array.isArray(shape.coordinates) &&
				shape.coordinates.length > 0 &&
				Array.isArray(shape.coordinates[0]) &&
				shape.coordinates[0].length > 0 &&
				Array.isArray(shape.coordinates[0][0]) &&
				shape.coordinates[0][0].length > 0) {

				// Calculate average of all points in the first polygon
				const polygon = shape.coordinates[0][0];
				let sumLat = 0;
				let sumLng = 0;

				for (let i = 0; i < polygon.length; i++) {
					sumLng += polygon[i][0];
					sumLat += polygon[i][1];
				}

				const fallbackResult = {
					lat: sumLat / polygon.length,
					lng: sumLng / polygon.length
				};

				if (config.debugMode) {
					console.log('Fallback centroid calculation for speaker:', {
						shapeType: shape.type,
						polygonPoints: polygon.length,
						result: fallbackResult
					});
				}

				return fallbackResult;
			}

			return { lat: 0, lng: 0 };
		} catch (fallbackError) {
			console.error("Fallback center calculation failed:", fallbackError);
			return { lat: 0, lng: 0 };
		}
	}
};

const SpeakerPolygons = (props: Props) => {
	const { roundware, hideSpeakerPolygons, lastSpeakerUpdateTime } = useRoundware();

	const [options, setOptions] = useState<PolygonProps[`options`]>(speakerPolygonOptions);
	const [googleMapElements, setGoogleMapElements] = useState<React.ReactElement[]>([]);

	/**
	 * Gets the fill color for a speaker, with fallback to random config color for invalid data
	 */
	const getSpeakerFillColor = useCallback((speaker: any, fallbackIndex: number): string => {
		// Server migration provides default colors, but fallback for invalid data
		if (isValidColor(speaker.fill_color)) {
			return speaker.fill_color;
		}

		// Fallback to config colors for invalid data
		if (config.debugMode) {
			console.warn(`Invalid fill_color "${speaker.fill_color}" for speaker ${speaker.id}, using config fallback`);
		}
		
		return getColorForIndex(fallbackIndex);
	}, []);

	const updatePolygons = useCallback(() => {
		const speakers = roundware.mixer.speakerEngine?.speakers
			?.sort((a: any, b: any) => (a?.data.id > b?.data.id ? -1 : 1))
			?.filter(({ data: speaker }: any) => !!speaker.shape)
			?.filter((s: any) => !hideSpeakerPolygons.includes(s.data.id));

		if (!speakers) {
			setGoogleMapElements([]);
			return;
		}

		// Create a map of speaker IDs to their center positions for easy lookup
		const speakerCenters: { [key: number]: google.maps.LatLngLiteral } = {};
		speakers.forEach((s: any) => {
			speakerCenters[s.data.id] = calculatePolygonCenter(s.data.shape);
		});

		// First pass: create polygons and center markers
		const polygonsAndMarkers = speakers.flatMap((s: any, index: number) => {
			// Get fill color (from server or config fallback)
			const fillColor = getSpeakerFillColor(s.data, index);
			const baseFillColor = getBaseColor(fillColor);
			const fillOpacity = getFillOpacity(fillColor, speakerPolygonOptions?.fillOpacity || config.map.speakerDisplayDefaults?.fillOpacity || 0.25);

			// Handle border color
			const borderColor = s.data.border_color;
			const baseBorderColor = getBaseColor(borderColor);
			const strokeOpacity = getStrokeOpacity(borderColor, config.map.speakerDisplayDefaults?.strokeOpacity || 1);
			const strokeWeight = isValidColor(borderColor) ? (config.map.speakerDisplayDefaults?.strokeWeight || 2) : (speakerPolygonOptions?.strokeWeight || 0);

			const path = polygonToGoogleMapPaths(s.data.shape);
			const center = speakerCenters[s.data.id];

			// Create polygon
			const polygon = (
				<Polygon
					key={`polygon-${s.data.id}`}
					path={path}
					options={{
						...options,
						fillColor: baseFillColor || getColorForIndex(index),
						fillOpacity: fillOpacity,
						strokeColor: baseBorderColor || baseFillColor || getColorForIndex(index),
						strokeOpacity: strokeOpacity,
						strokeWeight: strokeWeight,
						// Handle speakers without loaded audio buffer
						...(!s.buffer
							? {
									fillOpacity: 0,
									strokeOpacity: strokeOpacity > 0 ? strokeOpacity : 1,
									strokeWeight: strokeWeight > 0 ? strokeWeight : 1,
									strokeColor: baseBorderColor || baseFillColor || getColorForIndex(index),
							  }
							: {}),
					}}
				/>
			);

			// Skip creating markers with invalid centers
			if (center.lat === 0 && center.lng === 0) {
				return [polygon];
			}

			// Create center marker
			const marker = (
				<Marker
					key={`center-${s.data.id}`}
					position={center}
					icon={{
						path: google.maps.SymbolPath.CIRCLE,
						fillColor: config.map.speakerConnectorStyles.markerFill === "auto" 
							? (baseFillColor || getColorForIndex(index))
							: config.map.speakerConnectorStyles.markerFill,
						fillOpacity: config.map.speakerConnectorStyles.markerOpacity,
						strokeColor: config.map.speakerConnectorStyles.markerBorderColor,
						strokeWeight: config.map.speakerConnectorStyles.markerBorderStrokeWeight,
						scale: config.map.speakerConnectorStyles.markerSize,
					}}
					zIndex={config.map.speakerConnectorStyles.markerZIndex}
					title={config.debugMode ? `Speaker ${s.data.id} Center: ${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}` : undefined}
				/>
			);

			return [polygon, marker];
		});

		// Second pass: create lines connecting child speakers to their parents
		const connectionLines = speakers.flatMap((s: any) => {
			const childCenter = speakerCenters[s.data.id];

			// Skip speakers with invalid centers or no parents
			if (childCenter.lat === 0 && childCenter.lng === 0 || !s.data.parents || s.data.parents.length === 0) {
				return [];
			}

			return s.data.parents.map((parentId: number) => {
				// Skip if parent is hidden or doesn't exist in our center map
				if (hideSpeakerPolygons.includes(parentId) || !speakerCenters[parentId]) {
					return null;
				}

				const parentCenter = speakerCenters[parentId];

				// Skip if parent has invalid center
				if (parentCenter.lat === 0 && parentCenter.lng === 0) {
					return null;
				}

				return (
					<Polyline
						key={`connection-${s.data.id}-${parentId}`}
						path={[childCenter, parentCenter]}
						options={{
							strokeColor: config.map.speakerConnectorStyles.connectorLineColor,
							strokeOpacity: config.map.speakerConnectorStyles.connectorLineOpacity,
							strokeWeight: config.map.speakerConnectorStyles.connectorLineWeight,
							clickable: false,
							zIndex: config.map.speakerConnectorStyles.connectorZIndex,
							// Apply dash pattern if configured (empty array means solid line)
							...(config.map.speakerConnectorStyles.connectorDashPattern.length > 0 && {
								strokeDashArray: config.map.speakerConnectorStyles.connectorDashPattern.join(' ')
							})
						}}
					/>
				);
			}).filter(Boolean); // Filter out null connections
		});

		// Combine all elements and set state
		setGoogleMapElements([...polygonsAndMarkers, ...connectionLines]);
	}, [roundware.mixer.speakerEngine?.speakers, hideSpeakerPolygons, options, getSpeakerFillColor]);

	useEffect(() => {
		// Update immediately on mount
		updatePolygons();
	}, [updatePolygons]);

	// Update polygons when speakers are updated (using timestamp)
	useEffect(() => {
		if (lastSpeakerUpdateTime) {
			updatePolygons();
		}
	}, [lastSpeakerUpdateTime, updatePolygons]);

	useEffect(() => {
		if (!Array.isArray(roundware.speakers())) {
			return;
		}

		if (roundware.mixer?.speakerEngine?.speakers) {
			roundware.mixer.speakerEngine.speakers.forEach((s: any) => {
				s.on('loaded', updatePolygons);
				s.on('unloaded', updatePolygons);
			});
		}

		// Trigger initial update
		updatePolygons();

		return () => {
			if (roundware.mixer?.speakerEngine?.speakers) {
				roundware.mixer.speakerEngine.speakers.forEach((s: any) => {
					s.off('loaded', updatePolygons);
					s.off('unloaded', updatePolygons);
				});
			}
		};
	}, [roundware.speakers(), roundware.mixer?.speakerEngine?.speakers, updatePolygons]);

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
			{googleMapElements.map((element, index) => 
				<React.Fragment key={index}>{element}</React.Fragment>
			)}
		</div>
	);
};

export default SpeakerPolygons;
