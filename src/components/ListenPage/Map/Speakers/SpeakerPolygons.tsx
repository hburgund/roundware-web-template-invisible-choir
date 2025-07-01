import { Polygon, PolygonProps } from '@react-google-maps/api';
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
import { updateSpeakerFillColor } from '@/utils/speakerApi';
// Import module augmentation to extend ISpeakerData with color fields
import '@/types/speaker-augmentation';

interface Props {}

const getColorForIndex = (index: number): string => {
	return colors[index % colors.length];
};

// Track speakers that are being processed to avoid duplicate PATCH requests
const speakersBeingPatched = new Set<number>();

const SpeakerPolygons = (props: Props) => {
	const { roundware, hideSpeakerPolygons, lastSpeakerUpdateTime } = useRoundware();

	const [options, setOptions] = useState<PolygonProps[`options`]>(speakerPolygonOptions);
	const [googleMapPolygonProps, setGoogleMapPolygonProps] = useState<PolygonProps[]>([]);

	/**
	 * Gets the fill color for a speaker, either from the database or randomly assigned
	 */
	const getSpeakerFillColor = useCallback(async (speaker: any, fallbackIndex: number): Promise<string> => {
		// Now speaker will have fill_color due to module augmentation
		
		// If speaker already has a fill_color, use it
		if (isValidColor(speaker.fill_color)) {
			return speaker.fill_color;
		}

		// If this speaker is already being processed, use fallback color to avoid duplicate requests
		if (speakersBeingPatched.has(speaker.id)) {
			return getColorForIndex(fallbackIndex);
		}

		// Speaker doesn't have a color, assign one randomly and save to database
		const randomColor = getRandomSpeakerColor();
		
		// Mark this speaker as being processed
		speakersBeingPatched.add(speaker.id);
		
		try {
			// Update the database with the new color
			await updateSpeakerFillColor(roundware, speaker.id, randomColor);
			
			// Update the local speaker data to avoid future requests
			speaker.fill_color = randomColor;
			
			if (config.debugMode) {
				console.log(`Assigned and saved color ${randomColor} to speaker ${speaker.id}`);
			}
		} catch (error) {
			console.error(`Failed to save color for speaker ${speaker.id}:`, error);
		} finally {
			// Remove from processing set
			speakersBeingPatched.delete(speaker.id);
		}

		return randomColor;
	}, [roundware]);

	const updatePolygons = useCallback(async () => {
		const speakers = roundware.mixer.speakerEngine?.speakers
			?.sort((a: any, b: any) => (a?.data.id > b?.data.id ? -1 : 1))
			?.filter(({ data: speaker }: any) => !!speaker.shape)
			?.filter((s: any) => !hideSpeakerPolygons.includes(s.data.id));

		if (!speakers) {
			setGoogleMapPolygonProps([]);
			return;
		}

		// Process speakers and get their colors
		const polygonProps = await Promise.all(
			speakers.map(async (s: any, index: number) => {
				// s.data now automatically has fill_color and border_color due to module augmentation
				
				// Get fill color (persistent or newly assigned)
				const fillColor = await getSpeakerFillColor(s.data, index);
				const baseFillColor = getBaseColor(fillColor);
				const fillOpacity = getFillOpacity(fillColor, speakerPolygonOptions?.fillOpacity || config.map.speakerDisplayDefaults?.fillOpacity || 0.25);

				// Handle border color
				const borderColor = s.data.border_color;
				const baseBorderColor = getBaseColor(borderColor);
				const strokeOpacity = getStrokeOpacity(borderColor, config.map.speakerDisplayDefaults?.strokeOpacity || 1);
				const strokeWeight = isValidColor(borderColor) ? (config.map.speakerDisplayDefaults?.strokeWeight || 2) : (speakerPolygonOptions?.strokeWeight || 0);

				const prop: PolygonProps & { key: string } = {
					path: polygonToGoogleMapPaths(s.data.shape!),
					options: {
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
					},
					key: s.data.id.toString(),
				};
				return prop;
			})
		);

		setGoogleMapPolygonProps(polygonProps);
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
			{Array.isArray(googleMapPolygonProps) && googleMapPolygonProps.map((p) => <Polygon {...p} />)}
		</div>
	);
};

export default SpeakerPolygons;
