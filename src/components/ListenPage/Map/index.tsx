import makeStyles from '@mui/styles/makeStyles';
import { GoogleMap, Marker } from '@react-google-maps/api';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Coordinates } from 'roundware-web-framework';
import { useRoundware } from '../../../hooks';
import { RoundwareMapStyle } from '../../../styles/map-style';
import AssetLayer from './AssetLayer';
import AssetLoadingOverlay from './AssetLoadingOverlay';
import RangeCircleOverlay from './RangeCircleOverlay';
import WalkingModeButton from './WalkingModeButton';
import config from '@/config';
import SpeakerPolygons from './Speakers/SpeakerPolygons';
import SpeakerReplayButton from './Speakers/SpeakerReplayButton';
import CollectiveSpeakerLoadingIndicator from './Speakers/CollectiveSpeakerLoadingIndicator';
import { useURLSync } from '@/context/URLContext';
import ShareDialog from '@/components/App/ShareDialog';
import ResetButton from './ResetButton';
import SpeakerImages from './Speakers/SpeakerImages';
import SpeakerToggle from '../SpeakerToggle';
import PlaybackInfoOverlay from '../PlaybackInfoOverlay';
import OutOfRangeMessage from './OutOfRangeMessage';
import { Box, Button, Fab, Fade, Skeleton, Stack, Tooltip} from '@mui/material';
import { GraphicEq} from '@mui/icons-material';
import AddLoopVoiceButton from './AddLoopVoiceButton';
import { GeoListenMode } from 'roundware-web-framework';
import MapControlIcons from './MapControlIcons';
import { isAndroid, isIOS } from 'react-device-detect';
import FloorplanOverlay from './FloorplanOverlay';

const useStyles = makeStyles((theme) => {
	return {
		roundwareMap: {
			flexGrow: 1,
		},
	};
});

interface RoundwareMapProps {
	googleMapsApiKey: string;
	className: string;
	buttonText?: string;
	welcomeAudioCompleted?: boolean;
}
const RoundwareMap = (props: RoundwareMapProps) => {
	const classes = useStyles();
	const { roundware, forceUpdate } = useRoundware();
	const [map, setMap] = useState<google.maps.Map | undefined>();
	const [showLaunch, setShowLaunch] = useState(true);

	// Add debug overlay
	useEffect(() => {
		if (config.debugMode) {
			const debugInfo = document.createElement('div');
			debugInfo.style.cssText = `
				position: fixed; 
				bottom: 10px; 
				right: 10px; 
				background: rgba(0, 0, 0, 0.7); 
				color: white; 
				padding: 10px; 
				border-radius: 4px;
				z-index: 9999;
				font-size: 10px;
				font-family: monospace;
			`;
			debugInfo.innerHTML = `
				Framework: LOCAL<br>
				GeoMode: ${roundware.mixer?.mixParams?.geoListenMode || 'UNKNOWN'}<br>
				Time: ${new Date().toLocaleTimeString()}<br>
				Location: ${roundware.listenerLocation?.latitude?.toFixed(4)}, ${roundware.listenerLocation?.longitude?.toFixed(4)}
			`;
			debugInfo.id = 'debug-overlay';
			document.body.appendChild(debugInfo);

			// Update every second
			const interval = setInterval(() => {
				if (debugInfo.parentNode) {
					debugInfo.innerHTML = `
						Framework: LOCAL<br>
						GeoMode: ${roundware.mixer?.mixParams?.geoListenMode || 'UNKNOWN'}<br>
						Time: ${new Date().toLocaleTimeString()}<br>
						Location: ${roundware.listenerLocation?.latitude?.toFixed(4)}, ${roundware.listenerLocation?.longitude?.toFixed(4)}
					`;
				}
			}, 1000);

			return () => {
				clearInterval(interval);
				if (debugInfo.parentNode) {
					debugInfo.parentNode.removeChild(debugInfo);
				}
			};
		}
	}, [roundware.mixer?.mixParams?.geoListenMode, roundware.listenerLocation]);
	const [hasShownTooltip, setHasShownTooltip] = useState(false);
	const isMountedRef = useRef(true);
	const isMobile = isAndroid || isIOS;

	const tooltipProps = {
		open: isMobile ? (hasShownTooltip && showLaunch) : undefined,
		disableFocusListener: isMobile,
		disableHoverListener: isMobile,
		disableTouchListener: isMobile,
	};

	// Track mounted state for cleanup
	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
		};
	}, []);

	// show tooltip on mobile devices
	useEffect(() => {
		const hasShownTooltipBefore = localStorage.getItem('hasShownTooltip');
		
		if ((isAndroid || isIOS) && showLaunch && !hasShownTooltip && !hasShownTooltipBefore) {
			setHasShownTooltip(true);
			localStorage.setItem('hasShownTooltip', 'true');
		}
	}, [showLaunch]);

	const { deleteFromURL } = useURLSync();
	const updateListenerLocation = (newLocation?: Coordinates) => {
		if (!map) {
			return;
		}
		let location = newLocation;
		if (!location) {
			const center = map.getCenter();
			location = { latitude: center!.lat(), longitude: center!.lng() };
		}
		deleteFromURL([`longitude`, `latitude`]);

		roundware.updateLocation(location!);
		console.log('updated location on framework', location);
	};

	// Use prop for button text, default to "PLAY"
	const buttonText = props.buttonText || 'PLAY';

	const onLoad = (map: google.maps.Map) => {
		let restriction;
		if (config.map.bounds != 'none') {
			let bounds: google.maps.LatLngBounds;

			if (config.map.bounds == 'auto') {
				const {
					southwest: { latitude: swLat, longitude: swLng },
					northeast: { latitude: neLat, longitude: neLng },
				} = roundware.getMapBounds();

				bounds = new google.maps.LatLngBounds({ lat: swLat!, lng: swLng! }, { lat: neLat!, lng: neLng! });
			} else {
				const { swLat, swLng, neLat, neLng } = config.map.boundsPoints;
				bounds = new google.maps.LatLngBounds({ lat: swLat!, lng: swLng! }, { lat: neLat!, lng: neLng! });
			}
			restriction = {
				latLngBounds: bounds,
				strictBounds: false,
			};
		}

		const styledMapType = new google.maps.StyledMapType(RoundwareMapStyle, { name: 'Street Map' });
		map.mapTypes.set('styled_map', styledMapType);
		const searchParams = new URLSearchParams(window.location.search);
		const urlLatitude = searchParams.get('latitude');
		const urlLongitude = searchParams.get('longitude');
		const urlZoom = searchParams.get('zoom');
		map.setOptions({
			center: {
				lat: parseFloat(typeof urlLatitude == 'string' ? urlLatitude : roundware?.project?.location?.latitude!?.toString()),
				lng: parseFloat(typeof urlLongitude == 'string' ? urlLongitude : roundware?.project?.location?.longitude!?.toString()),
			},
			zoom: parseInt(typeof urlZoom == 'string' ? urlZoom : config.map.zoom.low.toString()),
			disableDefaultUI: true, // Disable all default UI controls
			zoomControl: true, // Re-enable only the zoom control
			draggable: true,
			draggableCursor: null,
			zoomControlOptions: {
				style: google.maps.ZoomControlStyle.SMALL,
				position: google.maps.ControlPosition.RIGHT_CENTER,
			},
			mapTypeId: 'styled_map',
			restriction,
		});
		map.addListener('zoom_changed', () => {
			const currentZoom = map.getZoom();
			const paramZoom = new URLSearchParams(window.location.search).get('zoom');
			if (paramZoom) {
				if (Number(currentZoom) != Number(paramZoom)) {
					map.setZoom(Number(paramZoom));
				}
			}
			deleteFromURL('zoom');
		});

		if (isMountedRef.current) {
			setMap(map);
		}
	};

	const handleLaunch = () => {
		if (isMountedRef.current) {
			setShowLaunch(false);
		}
		
		// Start audio playback when launch overlay disappears
		if (!roundware.mixer || !roundware.mixer?.playlist) {
			roundware.activateMixer({ geoListenMode: GeoListenMode.MANUAL }).then(() => {
				if (roundware && roundware.uiConfig && roundware.uiConfig.listen && roundware.uiConfig.listen[0]) {
					const listen_tags = roundware.uiConfig.listen[0].display_items.map((i) => i.tag_id);
					roundware.mixer.updateParams({
						listenerLocation: roundware.listenerLocation,
						minDist: 0,
						maxDist: 0,
						recordingRadius: 0,
						listenTagIds: listen_tags,
					});
					roundware.mixer.toggle();
					forceUpdate();
				}
			});
		} else {
			roundware.mixer.toggle();
			forceUpdate();
		}
	};

	return (
		<>
			{roundware.project ? (
				<>
					<AssetLoadingOverlay />
					<GoogleMap mapContainerClassName={classes.roundwareMap + ' ' + props.className} onZoomChanged={updateListenerLocation} onDragEnd={updateListenerLocation} onLoad={onLoad}>
						<MapControlIcons />
						{map && (
							<FloorplanOverlay 
								map={map} 
								useProjectLocation={true}
							/>
						)}
						<AssetLayer updateLocation={updateListenerLocation} />
						<RangeCircleOverlay updateLocation={updateListenerLocation} />
						{map && <WalkingModeButton welcomeAudioCompleted={props.welcomeAudioCompleted} />}
						{config.features.speakerToggleIds?.length > 0 && <SpeakerToggle />}
						{config.map.speakerDisplay == 'polygons' && <SpeakerPolygons />}
						{config.map.speakerDisplay == 'images' && <SpeakerImages />}
						<CollectiveSpeakerLoadingIndicator />
						{!config.listen.speaker.loop && <SpeakerReplayButton />}
						<ShareDialog />
						<ResetButton updateLocation={updateListenerLocation} />
						<PlaybackInfoOverlay />
						{config.map.showBoundsMarkers && roundware && (
							<Marker
								position={{
									lat: roundware.getMapBounds().northeast.latitude!,
									lng: roundware.getMapBounds().northeast.longitude!,
								}}
							/>
						)}

						{config.map.showBoundsMarkers && roundware && (
							<Marker
								position={{
									lat: roundware.getMapBounds().southwest.latitude!,
									lng: roundware.getMapBounds().southwest.longitude!,
								}}
							/>
						)}

						<OutOfRangeMessage />
							
						<AddLoopVoiceButton showLaunch={showLaunch} />

						<Fade in={showLaunch} timeout={1000}>
							<Box
								display="flex"
								alignItems="center"
								justifyContent="center"
								position="absolute"
								width="100%"
								height="100%"
								sx={{ 
									'& .MuiFab-root': { width: 120, height: 120 },
									pointerEvents: 'none'
								}}>
								<Box sx={{ position: 'relative' }}>
									<Skeleton
										variant="circular"
										animation="pulse"
										sx={{
											position: 'absolute',
											width: 160,
											height: 160,
											top: '50%',
											left: '50%',
											transform: 'translate(-50%, -50%)',
											bgcolor: 'secondary.main'
										}}
									/>
									<Tooltip 
										title={`TAP ${buttonText} TO LISTEN TO CHOIR`} 
										arrow 
										placement="bottom"
										{...tooltipProps}
									>
										<Fab 
											size="large" 
											color="secondary"
											onClick={handleLaunch}
											sx={{ pointerEvents: 'auto' }}
										>
											<Stack alignItems="center" spacing={2} sx={{ color: 'primary.main' }}>
												<GraphicEq fontSize="large" color="primary" />
												{buttonText}
											</Stack>
										</Fab>
									</Tooltip>
								</Box>
							</Box>
						</Fade>
					</GoogleMap>
				</>
			) : null}
		</>
	);
};

export default RoundwareMap;
