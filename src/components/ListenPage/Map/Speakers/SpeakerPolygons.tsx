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

/**
 * Calculate curved connection path points using arc or bezier approach with organic variations
 */
const calculateCurvedPoints = (start: google.maps.LatLngLiteral, end: google.maps.LatLngLiteral, curveIntensityConfig: number | [number, number], connectionId: string): google.maps.LatLngLiteral[] => {
	// Get curve configuration
	const curveType = config.map.speakerConnectorStyles.curveType;
	
	// Determine curve intensity from config (single value or random from range)
	let curveIntensity: number;
	if (Array.isArray(curveIntensityConfig)) {
		const [min, max] = curveIntensityConfig;
		curveIntensity = min + Math.random() * (max - min);
	} else {
		curveIntensity = curveIntensityConfig;
	}

	// If curve intensity is 0, return straight line
	if (curveIntensity === 0) {
		return [start, end];
	}

	const points: google.maps.LatLngLiteral[] = [];
	
	// Check if organic variations are enabled
	const organicVariations = config.map.speakerConnectorStyles.organicVariations !== false;
	const noiseIntensity = config.map.speakerConnectorStyles.noiseIntensity || 0.1;

	// Add slight randomness to number of points for organic feel (15-25 points) if variations enabled
	const basePoints = 20;
	const pointVariation = organicVariations ? Math.floor(Math.random() * 10) - 5 : 0; // -5 to +5 or 0
	const numPoints = Math.max(15, Math.min(25, basePoints + pointVariation));

	// Calculate distance for determining control point offset
	const latDiff = end.lat - start.lat;
	const lngDiff = end.lng - start.lng;
	const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

	// Perpendicular offset direction (rotate 90 degrees)
	const offsetLat = -lngDiff;
	const offsetLng = latDiff;

	// Normalize the offset vector
	const offsetLength = Math.sqrt(offsetLat * offsetLat + offsetLng * offsetLng);
	if (offsetLength === 0) {
		// Points are the same, return straight line
		return [start, end];
	}
	
	const normalizedOffsetLat = offsetLat / offsetLength;
	const normalizedOffsetLng = offsetLng / offsetLength;

	// Create a consistent random seed based on connection ID for deterministic but varied results
	const seed = connectionId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
	const seededRandom = (index: number) => {
		// Simple seeded random function for consistent results across renders
		const x = Math.sin(seed + index) * 10000;
		return x - Math.floor(x);
	};

	if (curveType === "bezier") {
		// Bezier curve implementation
		return calculateBezierCurve(start, end, curveIntensity, connectionId, numPoints, distance, normalizedOffsetLat, normalizedOffsetLng, seededRandom, organicVariations, noiseIntensity);
	} else {
		// Arc curve implementation (existing logic)
		return calculateArcCurve(start, end, curveIntensity, numPoints, distance, normalizedOffsetLat, normalizedOffsetLng, seededRandom, organicVariations, noiseIntensity);
	}
};

/**
 * Calculate bezier curve points with S-curve and wavy variations
 */
const calculateBezierCurve = (
	start: google.maps.LatLngLiteral, 
	end: google.maps.LatLngLiteral, 
	curveIntensity: number,
	connectionId: string,
	numPoints: number,
	distance: number,
	normalizedOffsetLat: number,
	normalizedOffsetLng: number,
	seededRandom: (index: number) => number,
	organicVariations: boolean,
	noiseIntensity: number
): google.maps.LatLngLiteral[] => {
	const points: google.maps.LatLngLiteral[] = [];
	
	// Get bezier configuration
	const waveIntensityConfig = config.map.speakerConnectorStyles.bezier?.waveIntensity || 0.3;
	const asymmetry = config.map.speakerConnectorStyles.bezier?.asymmetry || 0;
	const complexity = config.map.speakerConnectorStyles.bezier?.complexity || "simple";
	const waveAmplitude = config.map.speakerConnectorStyles.bezier?.waveAmplitude || 0;

	// Determine wave intensity
	let waveIntensity: number;
	if (Array.isArray(waveIntensityConfig)) {
		const [min, max] = waveIntensityConfig;
		// Only use random range if organic variations are enabled, otherwise use minimum value
		waveIntensity = organicVariations ? min + seededRandom(10) * (max - min) : min;
	} else {
		waveIntensity = waveIntensityConfig;
	}

	// Create control points for S-curve
	// Control point 1 at 1/3 along the line
	const cp1t = 1/3;
	const cp1BaseLat = start.lat + cp1t * (end.lat - start.lat);
	const cp1BaseLng = start.lng + cp1t * (end.lng - start.lng);
	
	// Control point 2 at 2/3 along the line  
	const cp2t = 2/3;
	const cp2BaseLat = start.lat + cp2t * (end.lat - start.lat);
	const cp2BaseLng = start.lng + cp2t * (end.lng - start.lng);

	// Apply S-curve offsets (opposite directions for serpentine effect)
	let cp1Offset = waveIntensity * distance * curveIntensity;
	let cp2Offset = -waveIntensity * distance * curveIntensity; // Opposite direction

	// Apply asymmetry only if organic variations are enabled AND asymmetry > 0
	if (organicVariations && asymmetry > 0) {
		const asymmetryFactor = 1 + (seededRandom(11) - 0.5) * asymmetry;
		cp1Offset *= asymmetryFactor;
		cp2Offset *= (2 - asymmetryFactor); // Inverse relationship
	}

	// Random curve direction only if organic variations enabled
	if (organicVariations && seededRandom(12) > 0.5) {
		cp1Offset *= -1;
		cp2Offset *= -1;
	}

	// Calculate control point positions
	const cp1Lat = cp1BaseLat + normalizedOffsetLat * cp1Offset;
	const cp1Lng = cp1BaseLng + normalizedOffsetLng * cp1Offset;
	const cp2Lat = cp2BaseLat + normalizedOffsetLat * cp2Offset;
	const cp2Lng = cp2BaseLng + normalizedOffsetLng * cp2Offset;

	// Generate bezier curve points
	for (let i = 0; i <= numPoints; i++) {
		const t = i / numPoints;
		const oneMinusT = 1 - t;
		const oneMinusTCubed = oneMinusT * oneMinusT * oneMinusT;
		const oneMinusTSquared = oneMinusT * oneMinusT;
		const tSquared = t * t;
		const tCubed = t * t * t;

		// Cubic bezier formula: (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
		let lat = oneMinusTCubed * start.lat + 
				 3 * oneMinusTSquared * t * cp1Lat + 
				 3 * oneMinusT * tSquared * cp2Lat + 
				 tCubed * end.lat;
		
		let lng = oneMinusTCubed * start.lng + 
				 3 * oneMinusTSquared * t * cp1Lng + 
				 3 * oneMinusT * tSquared * cp2Lng + 
				 tCubed * end.lng;

		// Add wavy complexity if enabled
		if (complexity === "wavy" && organicVariations && waveAmplitude > 0) {
			const waveFrequency = 2; // Number of small waves along the curve
			const scaledWaveAmplitude = waveAmplitude * waveIntensity * distance;
			const wave = Math.sin(Math.PI * t * waveFrequency + seededRandom(i + 20) * Math.PI) * scaledWaveAmplitude;
			
			lat += normalizedOffsetLat * wave;
			lng += normalizedOffsetLng * wave;
		}

		// Add organic noise if enabled and noise intensity > 0
		if (organicVariations && noiseIntensity > 0) {
			const noiseFrequency = 3;
			const noise = Math.sin(Math.PI * t * noiseFrequency + seededRandom(i + 30) * Math.PI * 2) * noiseIntensity;
			const noiseOffset = noise * waveIntensity * distance * 0.1;
			
			lat += normalizedOffsetLat * noiseOffset;
			lng += normalizedOffsetLng * noiseOffset;
		}
		
		// Add jitter only if organic variations enabled and noise intensity > 0 (using noise as proxy for wanting randomness)
		if (organicVariations && noiseIntensity > 0) {
			lat += (seededRandom(i + 100) - 0.5) * 0.05 * waveIntensity * distance;
			lng += (seededRandom(i + 200) - 0.5) * 0.05 * waveIntensity * distance;
		}

		points.push({ lat, lng });
	}

	return points;
};

/**
 * Calculate simple arc curve points (original arc implementation)
 */
const calculateArcCurve = (
	start: google.maps.LatLngLiteral,
	end: google.maps.LatLngLiteral,
	curveIntensity: number,
	numPoints: number,
	distance: number,
	normalizedOffsetLat: number,
	normalizedOffsetLng: number,
	seededRandom: (index: number) => number,
	organicVariations: boolean,
	noiseIntensity: number
): google.maps.LatLngLiteral[] => {
	const points: google.maps.LatLngLiteral[] = [];

	// Random curve direction (some curves go left, some right) - only if organic variations enabled
	const curveDirection = organicVariations && seededRandom(0) > 0.5 ? -1 : 1;

	// Add some randomness to the curve intensity for more organic feel - only if variations enabled
	const intensityVariation = organicVariations ? 0.3 : 0; // 30% variation or none
	const randomIntensityMultiplier = 1 + (seededRandom(1) - 0.5) * intensityVariation;
	const finalCurveIntensity = curveIntensity * randomIntensityMultiplier * curveDirection;

	// Calculate points using simple arc with sine function for height plus organic variations
	for (let i = 0; i <= numPoints; i++) {
		const t = i / numPoints;
		
		// Base position along the straight line
		const baseLat = start.lat + t * (end.lat - start.lat);
		const baseLng = start.lng + t * (end.lng - start.lng);
		
		// Primary arc height using sine function
		let height = Math.sin(Math.PI * t) * finalCurveIntensity * distance * 0.5;
		
		// Add subtle organic noise to the curve - only if variations enabled
		if (organicVariations) {
			const noiseFrequency = 3; // Multiple small variations along the curve
			const noise = Math.sin(Math.PI * t * noiseFrequency + seededRandom(i + 2) * Math.PI * 2) * noiseIntensity;
			height += noise * Math.abs(finalCurveIntensity) * distance * 0.1;
		}
		
		// Add very subtle random jitter to each point for more organic feel - only if variations enabled
		const jitterLat = organicVariations ? (seededRandom(i + 100) - 0.5) * 0.05 * Math.abs(finalCurveIntensity) * distance : 0;
		const jitterLng = organicVariations ? (seededRandom(i + 200) - 0.5) * 0.05 * Math.abs(finalCurveIntensity) * distance : 0;
		
		// Apply perpendicular offset for main curve
		const lat = baseLat + normalizedOffsetLat * height + jitterLat;
		const lng = baseLng + normalizedOffsetLng * height + jitterLng;
		
		points.push({ lat, lng });
	}

	return points;
};

const SpeakerPolygons = (props: Props) => {
	const { roundware, hideSpeakerPolygons, lastSpeakerUpdateTime, sessionCreatedSpeakerIds, clearSessionCreatedSpeakers, playingSpeakerIds } = useRoundware();
	const [options, setOptions] = useState<PolygonProps[`options`]>(speakerPolygonOptions);
	const [googleMapElements, setGoogleMapElements] = useState<React.ReactElement[]>([]);
	const [debugTestSpeakerId, setDebugTestSpeakerId] = useState<number | null>(null);
	
	// Debug state for real-time testing
	const [debugColors, setDebugColors] = useState({
		strokeColor: config.map.sessionCreatedSpeakerDefaults?.strokeColor ?? "#0000FF",
		innerStrokeColor: config.map.sessionCreatedSpeakerDefaults?.innerStrokeColor ?? "#FFFFFF",
	});
	
	// Track which speakers are recent (based on creation time)
	const [recentSpeakerIds, setRecentSpeakerIds] = useState<Set<number>>(new Set());
	
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

	/**
	 * Calculate and update the set of recent speakers based on update time
	 */
	const updateRecentSpeakers = useCallback(() => {
		console.log('🔄 updateRecentSpeakers called');
		if (!roundware.speakers || !Array.isArray(roundware.speakers())) {
			console.log('❌ No speakers available or not an array');
			return;
		}

		const speakers = roundware.speakers();
		const recentCount = config.map.recentSpeakerCount || 0;
		console.log('📊 Starting recent speakers calculation with', speakers.length, 'total speakers');
		
		// Filter speakers with valid created timestamps and sort by creation time (newest first)
		const speakersWithValidCreated = speakers
			.filter(speaker => speaker.created && !isNaN(new Date(speaker.created).getTime()))
			.sort((a, b) => new Date(b.created!).getTime() - new Date(a.created!).getTime());

		// Take the most recent speakers
		const recentSpeakers = speakersWithValidCreated.slice(0, recentCount);
		const recentIds = new Set(recentSpeakers.map(speaker => speaker.id));

		// Debug logging for recent speakers
		console.log('=== RECENT SPEAKERS DEBUG ===');
		console.log(`Total speakers: ${speakers.length}`);
		console.log(`Speakers with valid created timestamps: ${speakersWithValidCreated.length}`);
		console.log(`Recent count setting: ${recentCount}`);
		console.log('All speakers with timestamps (sorted newest first):');
		speakersWithValidCreated.forEach((speaker, index) => {
			console.log(`  ${index + 1}. ID: ${speaker.id}, Created: ${speaker.created}, Date: ${new Date(speaker.created!).toISOString()}`);
		});
		console.log('Selected recent speakers:');
		recentSpeakers.forEach((speaker, index) => {
			console.log(`  ${index + 1}. ID: ${speaker.id}, Created: ${speaker.created}`);
		});
		console.log('Recent speaker IDs set:', Array.from(recentIds));
		console.log('=== END RECENT SPEAKERS DEBUG ===');

		setRecentSpeakerIds(recentIds);
	}, [roundware.speakers]);

	const updatePolygons = useCallback(() => {
		const speakers = roundware.mixer.speakerEngine?.speakers
			?.filter(({ data: speaker }: any) => !!speaker.shape)
			?.filter((s: any) => !hideSpeakerPolygons.includes(s.data.id))
			?.sort((a: any, b: any) => {
				// Sort by created timestamp (most recent first), fallback to ID for speakers without timestamps
				const aCreated = a?.data?.created ? new Date(a.data.created).getTime() : 0;
				const bCreated = b?.data?.created ? new Date(b.data.created).getTime() : 0;
				
				// If both have valid timestamps, sort by timestamp (newest first)
				if (aCreated > 0 && bCreated > 0) {
					return bCreated - aCreated;
				}
				
				// If only one has a timestamp, prioritize it
				if (aCreated > 0 && bCreated === 0) return -1;
				if (bCreated > 0 && aCreated === 0) return 1;
				
				// If neither has a timestamp, fallback to ID sorting
				return (a?.data.id > b?.data.id ? -1 : 1);
			});

		if (!speakers) {
			setGoogleMapElements([]);
			return;
		}

		// Debug logging for speaker sorting
		if (config.debugMode) {
			console.log(`🗂️ Speaker sorting order (most recent first):`);
			speakers.forEach((s: any, index: number) => {
				const created = s.data.created ? new Date(s.data.created).toISOString() : 'no timestamp';
				const hasCreatedTimestamp = s.data.created && !isNaN(new Date(s.data.created).getTime());
				const zIndex = hasCreatedTimestamp ? (10 + index) : 'undefined';
				console.log(`  ${index + 1}. ID: ${s.data.id}, Created: ${created}, Z-Index: ${zIndex}`);
			});
		}

		// Create a map of speaker IDs to their center positions for easy lookup
		const speakerCenters: { [key: number]: google.maps.LatLngLiteral } = {};
		speakers.forEach((s: any) => {
			speakerCenters[s.data.id] = calculatePolygonCenter(s.data.shape);
		});

		// First pass: create polygons and center markers
		const polygonsAndMarkers = speakers.flatMap((s: any, index: number) => {
			// Calculate z-index based on sort order (most recent = highest z-index)
			// Newest speakers (index 0, 1, 2...) get highest z-index values
			// Oldest speakers get lower z-index values
			const baseZIndex = 10;
			const calculatedZIndex = baseZIndex + (speakers.length - 1 - index);
			// Get fill color (from server or config fallback)
			const fillColor = getSpeakerFillColor(s.data, index);
			const baseFillColor = getBaseColor(fillColor);
			const fillOpacity = getFillOpacity(fillColor, speakerPolygonOptions?.fillOpacity || config.map.speakerDisplayDefaults?.fillOpacity || 0.25);

			// Handle border color
			const borderColor = s.data.border_color;
			const baseBorderColor = getBaseColor(borderColor);
			const strokeOpacity = getStrokeOpacity(borderColor, config.map.speakerDisplayDefaults?.strokeOpacity || 1);
			const strokeWeight = isValidColor(borderColor) ? (config.map.speakerDisplayDefaults?.strokeWeight || 2) : (config.map.speakerDisplayDefaults?.strokeWeight || 2);
			

			// Check if this is a newly created speaker in the current session
			const isNewlyCreated = sessionCreatedSpeakerIds.includes(s.data.id) || s.data.id === debugTestSpeakerId;
			
			// Check if this speaker is currently playing
			const isPlaying = playingSpeakerIds.has(s.data.id);
			
			// Check if this speaker is recent (based on update time)
			const isRecent = recentSpeakerIds.has(s.data.id);
			
			// Check if this speaker is in the alwaysOnWhenAvailable list
			const isAlwaysOn = config.listen.speaker.alwaysOnWhenAvailable?.includes(s.data.id) || false;
			
			// Apply special styling for newly created speakers
			const finalStrokeOpacity = isNewlyCreated 
				? (config.map.sessionCreatedSpeakerDefaults?.strokeOpacity ?? 1.0)
				: strokeOpacity;
			const finalStrokeWeight = isNewlyCreated 
				? (config.map.sessionCreatedSpeakerDefaults?.strokeWeight ?? Math.max(strokeWeight * 2, 4))
				: strokeWeight;
			// Use calculated z-index based on creation time, but give priority to: newly created > playing > others
			// If speaker has no created timestamp, use undefined (default behavior)
			// Always preserve original z-index for alwaysOnWhenAvailable speakers
			const hasCreatedTimestamp = s.data.created && !isNaN(new Date(s.data.created).getTime());
			let finalZIndex;
			if (isAlwaysOn) {
				// Preserve original z-index for alwaysOnWhenAvailable speakers
				// Always use the calculated z-index based on creation time, regardless of playing status
				finalZIndex = hasCreatedTimestamp ? calculatedZIndex : undefined;
			} else if (isNewlyCreated) {
				finalZIndex = 2500; // Highest priority for newly created speakers
			} else if (isPlaying) {
				finalZIndex = 2000; // High priority for playing speakers
			} else {
				finalZIndex = hasCreatedTimestamp ? calculatedZIndex : undefined;
			}
			
			// Debug logging for speaker styling decisions
			if (isRecent || isPlaying || isNewlyCreated || isAlwaysOn || config.debugMode) {
				const originalZIndex = hasCreatedTimestamp ? calculatedZIndex : 'undefined';
				console.log(`🎨 Speaker ${s.data.id} styling: newlyCreated=${isNewlyCreated}, playing=${isPlaying}, recent=${isRecent}, alwaysOn=${isAlwaysOn}, created=${s.data.created}, originalZIndex=${originalZIndex}, finalZIndex=${finalZIndex}, sortIndex=${index}`);
			}
			
			// Special debug logging for alwaysOn speakers
			if (isAlwaysOn) {
				console.log(`🔧 AlwaysOn Speaker ${s.data.id}: isPlaying=${isPlaying}, isAlwaysOn=${isAlwaysOn}, finalZIndex=${finalZIndex}, calculatedZIndex=${calculatedZIndex}`);
			}
			const finalFillOpacity = isNewlyCreated 
				? (config.map.sessionCreatedSpeakerDefaults?.fillOpacity ?? fillOpacity)
				: fillOpacity;
			const finalStrokeColor = isNewlyCreated 
				? (debugColors.strokeColor) // Use debug colors for real-time testing
				: (baseBorderColor || baseFillColor || getColorForIndex(index));
			
			// Apply styling with priority: newlyCreated > playing > recent > default
			let finalPlayingStrokeOpacity = finalStrokeOpacity;
			let finalPlayingStrokeWeight = finalStrokeWeight;
			let finalPlayingFillOpacity = finalFillOpacity;
			let finalPlayingStrokeColor = finalStrokeColor;
			let finalPlayingFillColor = baseFillColor || getColorForIndex(index);
			
			// Handle fillColor for newly created speakers with null handling
			if (isNewlyCreated) {
				// Only apply fillColor if it's not null in config
				if (config.map.sessionCreatedSpeakerDefaults?.fillColor !== null) {
					finalPlayingFillColor = config.map.sessionCreatedSpeakerDefaults?.fillColor ?? finalPlayingFillColor;
				}
			}
			
			if (!isNewlyCreated) {
				if (isPlaying) {
					// Apply playing speaker styles (highest priority after newly created)
					// Only apply values if they're not null in config
					if (config.map.playingSpeakerDefaults?.strokeOpacity !== null) {
						finalPlayingStrokeOpacity = config.map.playingSpeakerDefaults?.strokeOpacity ?? finalPlayingStrokeOpacity;
					}
					if (config.map.playingSpeakerDefaults?.strokeWeight !== null) {
						finalPlayingStrokeWeight = config.map.playingSpeakerDefaults?.strokeWeight ?? finalPlayingStrokeWeight;
					}
					if (config.map.playingSpeakerDefaults?.fillOpacity !== null) {
						finalPlayingFillOpacity = config.map.playingSpeakerDefaults?.fillOpacity ?? finalPlayingFillOpacity;
					}
					if (config.map.playingSpeakerDefaults?.strokeColor !== null) {
						finalPlayingStrokeColor = config.map.playingSpeakerDefaults?.strokeColor ?? finalPlayingStrokeColor;
					}
					if (config.map.playingSpeakerDefaults?.fillColor !== null) {
						finalPlayingFillColor = config.map.playingSpeakerDefaults?.fillColor ?? finalPlayingFillColor;
					}
				} else if (isRecent) {
					// Apply recent speaker styles (second priority)
					// Only apply values if they're not null in config
					if (config.map.recentSpeakerDefaults?.strokeOpacity !== null) {
						finalPlayingStrokeOpacity = config.map.recentSpeakerDefaults?.strokeOpacity ?? finalPlayingStrokeOpacity;
					}
					if (config.map.recentSpeakerDefaults?.strokeWeight !== null) {
						finalPlayingStrokeWeight = config.map.recentSpeakerDefaults?.strokeWeight ?? finalPlayingStrokeWeight;
					}
					if (config.map.recentSpeakerDefaults?.fillOpacity !== null) {
						finalPlayingFillOpacity = config.map.recentSpeakerDefaults?.fillOpacity ?? finalPlayingFillOpacity;
					}
					if (config.map.recentSpeakerDefaults?.fillColor !== null) {
						finalPlayingFillColor = config.map.recentSpeakerDefaults?.fillColor ?? finalPlayingFillColor;
					}
					if (config.map.recentSpeakerDefaults?.strokeColor !== null) {
						finalPlayingStrokeColor = config.map.recentSpeakerDefaults?.strokeColor ?? finalPlayingStrokeColor;
					}
				} else {
					// Apply non-playing speaker styles (default)
					// Only apply values if they're not null in config AND database doesn't specify alpha
					const hasDatabaseAlpha = borderColor && borderColor.length === 9; // RGBA format
					if (config.map.nonPlayingSpeakerDefaults?.strokeOpacity !== null && !hasDatabaseAlpha) {
						finalPlayingStrokeOpacity = config.map.nonPlayingSpeakerDefaults?.strokeOpacity ?? finalPlayingStrokeOpacity;
					}
					if (config.map.nonPlayingSpeakerDefaults?.strokeWeight !== null) {
						finalPlayingStrokeWeight = config.map.nonPlayingSpeakerDefaults?.strokeWeight ?? finalPlayingStrokeWeight;
					}
					if (config.map.nonPlayingSpeakerDefaults?.fillOpacity !== null) {
						finalPlayingFillOpacity = config.map.nonPlayingSpeakerDefaults?.fillOpacity ?? finalPlayingFillOpacity;
					}
					if (config.map.nonPlayingSpeakerDefaults?.strokeColor !== null) {
						finalPlayingStrokeColor = config.map.nonPlayingSpeakerDefaults?.strokeColor ?? finalPlayingStrokeColor;
					}
					if (config.map.nonPlayingSpeakerDefaults?.fillColor !== null) {
						finalPlayingFillColor = config.map.nonPlayingSpeakerDefaults?.fillColor ?? finalPlayingFillColor;
					}
				}
			}
			
			if (config.debugMode && isNewlyCreated) {
				console.log(`Applying special styling to newly created speaker ${s.data.id}:`, {
					strokeOpacity: finalStrokeOpacity,
					strokeWeight: finalStrokeWeight,
					zIndex: finalZIndex,
					fillOpacity: finalFillOpacity,
					strokeColor: finalStrokeColor
				});
			}

			const path = polygonToGoogleMapPaths(s.data.shape);
			const center = speakerCenters[s.data.id];

			
			// Create main polygon
			const polygon = (
				<Polygon
					key={`polygon-${s.data.id}`}
					path={path}
					options={{
						...options,
						fillColor: finalPlayingFillColor,
						fillOpacity: finalPlayingFillOpacity,
						strokeColor: finalPlayingStrokeColor,
						strokeOpacity: finalPlayingStrokeOpacity,
						strokeWeight: finalPlayingStrokeWeight,
						zIndex: finalZIndex,
						// Handle speakers without loaded audio buffer
						...(!s.buffer
							? {
									fillOpacity: 0,
									strokeOpacity: finalPlayingStrokeOpacity,
									strokeWeight: finalPlayingStrokeWeight,
									strokeColor: finalPlayingStrokeColor,
							  }
							: {}),
					}}
				/>
			);

			// Create additional stroke layers for newly created speakers
			let additionalStrokes: React.ReactElement[] = [];
			if (isNewlyCreated) {
				// Inner stroke (thinner, different color)
				const innerStroke = (
					<Polygon
						key={`inner-stroke-${s.data.id}`}
						path={path}
						options={{
							fillOpacity: 0, // No fill
							strokeColor: debugColors.innerStrokeColor, // Use debug colors
							strokeOpacity: config.map.sessionCreatedSpeakerDefaults?.innerStrokeOpacity ?? 0.8,
							strokeWeight: Math.max(1, Math.floor(finalStrokeWeight / 2)), // Half the outer stroke weight
							zIndex: (finalZIndex || 0) + 1, // Above the main polygon
						}}
					/>
				);
				
				// Outer glow effect (very thin, semi-transparent)
				const outerGlowColor = config.map.sessionCreatedSpeakerDefaults?.outerGlowColor === "auto" 
					? finalStrokeColor 
					: (config.map.sessionCreatedSpeakerDefaults?.outerGlowColor ?? finalStrokeColor);
				const outerGlow = (
					<Polygon
						key={`outer-glow-${s.data.id}`}
						path={path}
						options={{
							fillOpacity: 0, // No fill
							strokeColor: outerGlowColor,
							strokeOpacity: config.map.sessionCreatedSpeakerDefaults?.outerGlowOpacity ?? 0.3,
							strokeWeight: finalStrokeWeight + 2, // Slightly larger than main stroke
							zIndex: (finalZIndex || 0) - 1, // Below the main polygon
						}}
					/>
				);
				
				additionalStrokes = [innerStroke, outerGlow];
			}

			// Skip creating markers with invalid centers
			if (center.lat === 0 && center.lng === 0) {
				return [polygon, ...additionalStrokes];
			}

			// Create center marker
			const marker = (
				<Marker
					key={`center-${s.data.id}`}
					position={center}
					icon={{
						path: google.maps.SymbolPath.CIRCLE,
						fillColor: config.map.speakerConnectorStyles.markers.fill === "auto" 
							? (baseFillColor || getColorForIndex(index))
							: config.map.speakerConnectorStyles.markers.fill,
						fillOpacity: config.map.speakerConnectorStyles.markers.opacity,
						strokeColor: config.map.speakerConnectorStyles.markers.borderColor,
						strokeWeight: config.map.speakerConnectorStyles.markers.borderWeight,
						scale: config.map.speakerConnectorStyles.markers.size,
					}}
					zIndex={config.map.speakerConnectorStyles.markers.zIndex}
					title={config.debugMode ? `Speaker ${s.data.id} Center: ${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}` : undefined}
				/>
			);

			return [polygon, marker, ...additionalStrokes];
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

				// Calculate curved connection path points
				const curvedPathPoints = calculateCurvedPoints(childCenter, parentCenter, config.map.speakerConnectorStyles.curveIntensity, `connection-${s.data.id}-${parentId}`);

				return (
					<Polyline
						key={`connection-${s.data.id}-${parentId}`}
						path={curvedPathPoints}
						options={{
							strokeColor: config.map.speakerConnectorStyles.lines.color,
							strokeOpacity: config.map.speakerConnectorStyles.lines.opacity,
							strokeWeight: config.map.speakerConnectorStyles.lines.weight,
							clickable: false,
							zIndex: config.map.speakerConnectorStyles.lines.zIndex,
						}}
					/>
				);
			}).filter(Boolean); // Filter out null connections
		});

		// Combine all elements and set state
		setGoogleMapElements([...polygonsAndMarkers, ...connectionLines]);
	}, [roundware.mixer.speakerEngine?.speakers, hideSpeakerPolygons, options, getSpeakerFillColor, sessionCreatedSpeakerIds, debugTestSpeakerId, debugColors.strokeColor, playingSpeakerIds, recentSpeakerIds]);

	/**
	 * Debug function to randomly select a nearby speaker for testing
	 */
	const selectRandomNearbySpeaker = useCallback(() => {
		if (!roundware.mixer?.mixParams?.listenerPoint) {
			console.warn('No listener location available for debug speaker selection');
			return;
		}

		const speakers = roundware.mixer.speakerEngine?.speakers
			?.filter(({ data: speaker }: any) => !!speaker.shape)
			?.filter((s: any) => !hideSpeakerPolygons.includes(s.data.id))
			?.filter((s: any) => !sessionCreatedSpeakerIds.includes(s.data.id)); // Don't select already selected speakers

		if (!speakers || speakers.length === 0) {
			console.warn('No available speakers for debug selection');
			return;
		}

		// Calculate distances to listener and sort by proximity
		const listenerPoint = roundware.mixer.mixParams.listenerPoint;
		const speakersWithDistance = speakers.map((s: any) => {
			const center = calculatePolygonCenter(s.data.shape);
			const distance = Math.sqrt(
				Math.pow(center.lat - listenerPoint.geometry.coordinates[1], 2) + 
				Math.pow(center.lng - listenerPoint.geometry.coordinates[0], 2)
			);
			return { speaker: s, distance, center };
		});

		// Sort by distance and take the closest one
		speakersWithDistance.sort((a, b) => a.distance - b.distance);
		const closestSpeaker = speakersWithDistance[0];

		if (closestSpeaker) {
			setDebugTestSpeakerId(closestSpeaker.speaker.data.id);
			console.log(`Debug: Selected speaker ${closestSpeaker.speaker.data.id} at distance ${closestSpeaker.distance.toFixed(4)}`);
		}
	}, [roundware.mixer?.mixParams?.listenerPoint, roundware.mixer.speakerEngine?.speakers, hideSpeakerPolygons, sessionCreatedSpeakerIds]);

	// Clear debug test speaker
	const clearDebugTestSpeaker = useCallback(() => {
		setDebugTestSpeakerId(null);
		console.log('Debug: Cleared test speaker selection');
	}, []);

	// Get current listener location for debugging
	const getCurrentListenerLocation = useCallback(() => {
		const listenerPoint = roundware.mixer?.mixParams?.listenerPoint;
		if (listenerPoint) {
			const lat = listenerPoint.geometry.coordinates[1];
			const lng = listenerPoint.geometry.coordinates[0];
			console.log(`Debug: Current listener location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
			return { lat, lng };
		}
		return null;
	}, [roundware.mixer?.mixParams?.listenerPoint]);

	// Show available speakers for debugging
	const showAvailableSpeakers = useCallback(() => {
		const speakers = roundware.mixer.speakerEngine?.speakers
			?.filter(({ data: speaker }: any) => !!speaker.shape)
			?.filter((s: any) => !hideSpeakerPolygons.includes(s.data.id));

		if (speakers && speakers.length > 0) {
			console.log(`Debug: ${speakers.length} available speakers:`, speakers.map((s: any) => ({
				id: s.data.id,
				hasShape: !!s.data.shape,
				isHidden: hideSpeakerPolygons.includes(s.data.id),
				isSessionSpeaker: sessionCreatedSpeakerIds.includes(s.data.id)
			})));
		} else {
			console.log('Debug: No available speakers found');
		}
	}, [roundware.mixer.speakerEngine?.speakers, hideSpeakerPolygons, sessionCreatedSpeakerIds]);

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

	// Update recent speakers when speakers are updated
	useEffect(() => {
		console.log('🎯 useEffect triggered for recent speakers update, lastSpeakerUpdateTime:', lastSpeakerUpdateTime);
		updateRecentSpeakers();
	}, [lastSpeakerUpdateTime, updateRecentSpeakers]);

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

	// Handle playing state tracking - now using shared state from context
	useEffect(() => {
		// Trigger visual update when playing state changes
		updatePolygons();
	}, [playingSpeakerIds, updatePolygons]);

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
					
					<div>
						<p>New Speakers: {sessionCreatedSpeakerIds.length}</p>
						<button onClick={() => clearSessionCreatedSpeakers()}>Clear</button>
					</div>
					
					<div>
						<p>New Speaker Stroke Color:</p>
						<input 
							type="color" 
							value={debugColors.strokeColor}
							onChange={(e) => {
								setDebugColors(prev => ({ ...prev, strokeColor: e.target.value }));
								console.log("Stroke color changed to:", e.target.value);
							}}
						/>
						<div style={{ 
							width: '20px', 
							height: '20px', 
							backgroundColor: debugColors.strokeColor, 
							border: '1px solid #ccc',
							display: 'inline-block',
							marginLeft: '10px'
						}}></div>
					</div>
					
					<div>
						<p>Inner Stroke Color:</p>
						<input 
							type="color" 
							value={debugColors.innerStrokeColor}
							onChange={(e) => {
								setDebugColors(prev => ({ ...prev, innerStrokeColor: e.target.value }));
								console.log("Inner stroke color changed to:", e.target.value);
							}}
						/>
						<div style={{ 
							width: '20px', 
							height: '20px', 
							backgroundColor: debugColors.innerStrokeColor, 
							border: '1px solid #ccc',
							display: 'inline-block',
							marginLeft: '10px'
						}}></div>
					</div>
					
					<div>
						<p>Debug Colors:</p>
						<button onClick={() => {
							setDebugColors({
								strokeColor: config.map.sessionCreatedSpeakerDefaults?.strokeColor ?? "#0000FF",
								innerStrokeColor: config.map.sessionCreatedSpeakerDefaults?.innerStrokeColor ?? "#FFFFFF",
							});
							console.log("Debug colors reset to config defaults");
						}}>Reset to Config</button>
					</div>

					<div>
						<p>Debug Test Speaker:</p>
						<button onClick={selectRandomNearbySpeaker}>Select Random Nearby</button>
						<button onClick={clearDebugTestSpeaker}>Clear Debug</button>
						<button onClick={getCurrentListenerLocation}>Show Listener Location</button>
						<button onClick={showAvailableSpeakers}>Show Available Speakers</button>
						{debugTestSpeakerId && (
							<>
								<p>Selected Speaker: {debugTestSpeakerId}</p>
								<p style={{ fontSize: '12px', color: '#666' }}>
									This speaker will now display with session speaker styling
								</p>
							</>
						)}
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