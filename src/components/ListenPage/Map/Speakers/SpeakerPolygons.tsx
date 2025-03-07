import { Polygon, PolygonProps, Marker } from '@react-google-maps/api';
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useRoundware } from '@/hooks';
import { speakerPolygonColors as colors, speakerPolygonOptions } from '@/styles/speaker';
import { polygonToGoogleMapPaths } from '@/utils';
import CustomMapControl from '../CustomControl';
import config from '@/config';
import { ISpeakerData } from 'roundware-web-framework';
import * as turf from '@turf/turf';

interface Props {}

const getColorForIndex = (index: number): string => {
    return colors[index % colors.length];
};

const getRandomPulseDuration = () => Math.random() * (8000 - 3000) + 3000;

const SpeakerPolygons = (props: Props) => {
    const { roundware, hideSpeakerPolygons } = useRoundware();
    const [options, setOptions] = useState<PolygonProps['options']>(speakerPolygonOptions);
    const [fillOpacities, setFillOpacities] = useState<{ [key: number]: number }>({});
    const polygonPulseDurations = useRef<{ [key: number]: number }>({});

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

    // Calculate center of polygon using turf
    const calculatePolygonCenter = (shape: any) => {
        try {
            // The shape is already a GeoJSON object
            if (shape && shape.type === 'MultiPolygon' && Array.isArray(shape.coordinates)) {
                // Use turf directly with the GeoJSON
                const center = turf.centroid(shape);

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

                    return {
                        lat: sumLat / polygon.length,
                        lng: sumLng / polygon.length
                    };
                }

                return { lat: 0, lng: 0 };
            } catch (fallbackError) {
                console.error("Fallback center calculation failed:", fallbackError);
                return { lat: 0, lng: 0 };
            }
        }
    };

    const googleMapPolygonProps = useMemo(() => {
        if (!Array.isArray(roundware.speakers())) return [];

        return roundware
            .speakers()
            ?.sort((a, b) => (a?.id > b?.id ? -1 : 1))
            ?.filter((speaker): speaker is ISpeakerData & Required<Pick<ISpeakerData, 'shape'>> => !!speaker.shape)
            ?.filter((s) => !hideSpeakerPolygons.includes(s.id))
            .flatMap((s, index) => {
                const path = polygonToGoogleMapPaths(s.shape);
                const center = calculatePolygonCenter(s.shape);

                // Skip creating markers with invalid centers
                if (center.lat === 0 && center.lng === 0) {
                    return [
                        <Polygon
                            path={path}
                            options={{
                                ...options,
                                fillColor: getColorForIndex(index),
                                strokeColor: getColorForIndex(index),
                                fillOpacity: fillOpacities[s.id] || 0.6,
                            }}
                            key={`polygon-${s.id}`}
                        />
                    ];
                }

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
                    <Marker
                        key={`center-${s.id}`}
                        position={center}
                        icon={{
                            path: window.google.maps.SymbolPath.CIRCLE,
                            scale: 3,
                            fillColor: "#FFFFFF",
                            fillOpacity: 1,
                            strokeWeight: 0,
                            strokeColor: "#000000"
                        }}
                    />
                ];
            });
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
