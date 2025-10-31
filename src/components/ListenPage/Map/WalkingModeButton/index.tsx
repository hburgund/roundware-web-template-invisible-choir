import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import MapIcon from '@mui/icons-material/Map';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Fab } from '@mui/material';
import Button from '@mui/material/Button';
import { useGoogleMap } from '@react-google-maps/api';
import clsx from 'clsx';
import PermissionDeniedDialog from '@/components/elements/PermissionDeniedDialog';
import config from '@/config';
import { useURLSync } from '@/context/URLContext';
import { isEqual } from 'lodash';
import { useEffect, useState } from 'react';
import { isAndroid, isIOS } from 'react-device-detect';
import { GeoListenMode } from 'roundware-web-framework/dist/index';
import { useRoundware } from '../../../../hooks';
import messages from '../../../../locales/en_US.json';
import ListenerLocationMarker from './ListenerLocationMarker';

interface WalkingModeButtonProps {
	welcomeAudioCompleted?: boolean;
}

const walkingModeButton = ({ welcomeAudioCompleted = true }: WalkingModeButtonProps) => {
	const { roundware, forceUpdate, geoListenMode, setGeoListenMode } = useRoundware();

	if (!roundware?.project) return null;
	const [busy, setBusy] = useState(false);
	const map = useGoogleMap();
	const { params, deleteFromURL } = useURLSync();

	const loc = roundware.listenerLocation;
	const lat = loc && loc.latitude;
	const lng = loc && loc.longitude;
	const center = { lat: lat!, lng: lng! };
	const ready = typeof lat === 'number' && typeof lng === 'number';

	const isMobile = isAndroid || isIOS;
	// when the listenerLocation is updated, center the map
	useEffect(() => {
		if (ready) {
			const c = map?.getCenter();
			if (!c) return;
			if (!center) return;
			if (center.lat !== c?.lat() || center.lng !== c?.lng()) {
				map?.panTo(center);
				console.log('new location provided by framework');
			}
		}
	}, [lat, lng]);

	const availableListenModesArray = config.listen.availableListenModes;

	const displayListenModeButton = availableListenModesArray == 'device' || availableListenModesArray.length == 2 ? true : false;

	// set default GeoListenMode
	useEffect(() => {
		if (!map) return;
		
		// Defer location permission request until welcome audio completes
		if (!welcomeAudioCompleted) {
			console.log('Welcome audio not completed yet, deferring location permission request');
			return;
		}
		
		// Check if we're already in the correct mode to avoid unnecessary switching
		const shouldBeInWalkingMode = availableListenModesArray == 'device' ? isMobile : availableListenModesArray[0] !== 'map';
		const isCurrentlyInWalkingMode = geoListenMode === GeoListenMode.AUTOMATIC;
		const isCurrentlyInMapMode = geoListenMode === GeoListenMode.MANUAL;
		
		// If we're already in the correct mode, don't switch
		if (shouldBeInWalkingMode && isCurrentlyInWalkingMode) {
			console.log('Already in walking mode, skipping initialization');
			return;
		}
		
		if (!shouldBeInWalkingMode && isCurrentlyInMapMode) {
			console.log('Already in map mode, skipping initialization');
			return;
		}
		
		if (availableListenModesArray == 'device') {
			console.log(`default based on screen width [${isMobile ? `Mobile` : `Desktop`}]`);
			isMobile ? enterWalkingMode() : enterMapMode();
		} else if (availableListenModesArray[0] == 'map') {
			console.log('default to map mode');
			enterMapMode();
		} else {
			console.log('default to walking mode');
			enterWalkingMode();
		}
	}, [isMobile, map, geoListenMode, availableListenModesArray, welcomeAudioCompleted]);

	const enterMapMode = () => {
		if (!map) return;
		console.log('switching to map mode');
		// zoom out
		map.setZoom(Number(params.get('zoom') || config.map.zoom.low.toString()));

		// enable map panning and remove zoom restrictions
		map.setOptions({ 
			gestureHandling: 'cooperative',
			minZoom: undefined,
			maxZoom: undefined
		});
		// stop listening for location updates
		setGeoListenMode(GeoListenMode.MANUAL);
		// update text instructions?
		roundware.events?.logEvent(`change_listen_mode`, {
			data: `listen_mode: map`,
		});
	};

	const [walkingModeStatus, setWalkingModeStatus] = useState('');
	const [walkingModeErrorMessage, setWalkingModeErrorMessage] = useState<null | { title: string; message: string }>(null);

	const enableWalkingMode = () => {
		if (!map) return console.log('map not available yet!');
		console.log('switching to walking mode');
		// disable map panning
		map.setOptions({ 
			gestureHandling: 'none',
			minZoom: config.map.zoom.walkingMin,
			maxZoom: config.map.zoom.walking
		});
		// zoom in
		map.setZoom(config.map.zoom.walking);
		// determine user location and listen for updates
		setGeoListenMode(GeoListenMode.AUTOMATIC);
		roundware.events?.logEvent(`change_listen_mode`, {
			data: `listen_mode: walking`,
		});
	};

	const enterWalkingMode = async () => {
		// will check if eligible to enter walking mode
		if (!map) return;

		// browser doesn't support geolocation
		if (!navigator.geolocation) {
			setWalkingModeStatus('error');
			setWalkingModeErrorMessage(messages.errors.walkingModeNotSupported);
			enterMapMode();
		} else {
			// Check location permission status using the proper API when available
			try {
				if (navigator.permissions && navigator.permissions.query) {
					const permissionStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
					if (permissionStatus.state === 'granted') {
						console.log('Location permission already granted, proceeding to walking mode');
						enableWalkingMode();
						return;
					}
					if (permissionStatus.state === 'denied') {
						// Safari/iOS can report denied before prompting; allow manual request
						const userAgent = navigator.userAgent || '';
						const isSafariLike = /safari/i.test(userAgent) && !/chrome|crios|android/i.test(userAgent);
						if (isIOS || isSafariLike) {
							console.log('Permissions API reports denied on Safari/iOS; showing permission dialog for manual request');
							setWalkingModeStatus('locating');
							return;
						}
						setWalkingModeStatus('error');
						setWalkingModeErrorMessage(messages.errors.permissionDenied);
						enterMapMode();
						return;
					}
				}
				// Permission is prompt/unknown or Permissions API not conclusive: show allow dialog
				console.log('Location permission not determined, showing permission dialog');
				setWalkingModeStatus('locating');
			} catch (error) {
				// Fallback for browsers that don't support permissions API
				console.log('Permissions API not supported or failed, showing permission dialog');
				setWalkingModeStatus('locating');
			}
		}
	};

	// Simple helper to add timeout and retries around the framework's initial geolocation
	const withTimeout = async <T,>(promise: Promise<T>, ms: number): Promise<T> => {
		return await new Promise<T>((resolve, reject) => {
			const id = setTimeout(() => reject({ code: 3, message: 'timeout' }), ms);
			promise.then((v) => { clearTimeout(id); resolve(v); })
			       .catch((e) => { clearTimeout(id); reject(e); });
		});
	};

	// Fallback: call browser geolocation directly with high accuracy and long timeout
	const getCurrentPositionFallback = async (): Promise<{ latitude: number; longitude: number }> => {
		return await new Promise((resolve, reject) => {
			if (!navigator.geolocation) return reject({ code: 2, message: 'Geolocation unsupported' });
			navigator.geolocation.getCurrentPosition(
				(pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
				(err) => reject(err),
				{ enableHighAccuracy: true, timeout: 60000, maximumAge: 0 }
			);
		});
	};

	const requestLocationPermission = async () => {
		try {
			// Feature-detect Permissions API but do not rely on it to gate the request
			try {
				if (navigator.permissions && navigator.permissions.query) {
					await navigator.permissions.query({ name: 'geolocation' as PermissionName });
				}
			} catch (_) {
				// ignore permissions API errors; proceed to request
			}
			// Always enable geolocation on user gesture; safe if already granted
			console.log('Requesting location permission');
			roundware.geoPosition.enable();

			// wait for user location with extended timeout and retries
			let location;
			try {
				location = await withTimeout(roundware.geoPosition.waitForInitialGeolocation(), 30000);
			} catch (err1) {
				console.warn('Initial geolocation attempt timed out/failed, retrying...', err1);
				try {
					location = await withTimeout(roundware.geoPosition.waitForInitialGeolocation(), 30000);
				} catch (err2) {
					console.warn('Second geolocation attempt timed out/failed, final retry...', err2);
					location = await withTimeout(roundware.geoPosition.waitForInitialGeolocation(), 30000);
				}
			}

			// not need to check if user location is within bounds
			if (config.map.bounds == 'none') {
				setWalkingModeStatus('eligible');
				enableWalkingMode();
				return;
			}

			// need to ensure user is within map bounds
			const userlatlng = new google.maps.LatLng(location.latitude!, location.longitude!);

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
			// within map bounds
			if (!bounds || bounds.contains(userlatlng)) {
				setWalkingModeStatus('eligible');
				enableWalkingMode();
			} else {
				// not within map bounds
				setWalkingModeStatus('error');
				setWalkingModeErrorMessage(messages.errors.outOfRange);
				enterMapMode();
			}
		} catch (e: any) {
			// switch to map mode in case error
			setWalkingModeStatus('error');
			// Pre-check environment issues
			if (typeof window !== 'undefined' && !window.isSecureContext) {
				setWalkingModeErrorMessage((messages as any).errors?.insecureContext || messages.errors.failedToDetermineLocation);
				enterMapMode();
				return;
			}
			if (typeof navigator !== 'undefined' && 'onLine' in navigator && (navigator as any).onLine === false) {
				setWalkingModeErrorMessage((messages as any).errors?.offline || messages.errors.failedToDetermineLocation);
				enterMapMode();
				return;
			}

			// @see https://developer.mozilla.org/en-US/docs/Web/API/GeolocationPositionError
			switch (e?.code) {
				case 1:
					// permission denied
					setWalkingModeErrorMessage(messages.errors.permissionDenied);
					break;
				case 2:
					// position unavailable
					setWalkingModeErrorMessage((messages as any).errors?.positionUnavailable || messages.errors.failedToDetermineLocation);
					break;
				case 3:
					// timeout: attempt high-accuracy fallback once more before failing
					try {
						setWalkingModeStatus('locating');
						const pos = await getCurrentPositionFallback();
						// seed roundware with initial location and proceed
						roundware.updateLocation({ latitude: pos.latitude, longitude: pos.longitude });
						setWalkingModeStatus('eligible');
						enableWalkingMode();
						return;
					} catch (fallbackErr) {
						setWalkingModeErrorMessage((messages as any).errors?.geolocationTimeout || messages.errors.failedToDetermineLocation);
					}
					break;
				default:
					console.error('Geolocation error:', e?.code, e?.message || e);
					setWalkingModeErrorMessage(messages.errors.failedToDetermineLocation);
					break;
			}

			enterMapMode();
		}
	};

	const toggleWalkingMode = async () => {
		setBusy(true);
		if (geoListenMode === GeoListenMode.AUTOMATIC && map !== null) {
			enterMapMode();
		} else if ([GeoListenMode.MANUAL, GeoListenMode.DISABLED].includes(geoListenMode) && map !== null) {
			await enterWalkingMode();
		}
		if (roundware.mixer) {
			const trackIds = Object.keys(roundware.mixer?.playlist?.trackIdMap || {}).map((id) => parseInt(id));
			trackIds.forEach((audioTrackId) => roundware.mixer.skipTrack(audioTrackId));
		}
		setBusy(false);
	};

	return (
		<div>
			<Dialog 
				open={walkingModeStatus === 'locating'} 
				classes={{
					paper: 'location-permission-dialog'
				}}
			>
				<DialogTitle>Invisible Choir needs access</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Enabling location is necessary to participate fully in the artwork experience. Your location data won't be saved or shared.
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button variant="outlined" onClick={() => {
						setWalkingModeStatus('error');
						setWalkingModeErrorMessage(messages.errors.permissionDenied);
						enterMapMode();
					}}>Block</Button>
					<Button variant="contained" onClick={() => {
						requestLocationPermission();
					}}>Allow</Button>
				</DialogActions>
			</Dialog>

			{/* permission denied dialog */}
			<PermissionDeniedDialog open={walkingModeStatus === 'error' && isEqual(walkingModeErrorMessage, messages.errors.permissionDenied)} onClose={() => setWalkingModeStatus('')} functionality={'location'} onTryAgain={requestLocationPermission} />
			<Dialog open={(walkingModeStatus === 'error' && !isEqual(walkingModeErrorMessage, messages.errors.permissionDenied)) || walkingModeStatus === 'out-of-range'}>
				<DialogTitle>{walkingModeErrorMessage?.title}</DialogTitle>
				<DialogContent>
					<DialogContentText>{walkingModeErrorMessage?.message}</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setWalkingModeStatus('')}>OK</Button>
				</DialogActions>
			</Dialog>
			<Fab 
				title={geoListenMode == GeoListenMode.AUTOMATIC ? `Enter Map Mode` : `Enter Walking Mode`} 
				className={clsx("map-button", displayListenModeButton ? null : "hidden")} 
				color="secondary"
				disabled={busy} 
				onClick={toggleWalkingMode}
			>
				{geoListenMode === GeoListenMode.AUTOMATIC ? <MapIcon /> : <DirectionsWalkIcon />}
			</Fab>
			{geoListenMode === GeoListenMode.AUTOMATIC ? <ListenerLocationMarker /> : null}
		</div>
	);
};

export default walkingModeButton;
