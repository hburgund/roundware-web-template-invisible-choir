import moment from 'moment';
import * as React from 'react';
import { useEffect, useMemo, useReducer, useState } from 'react';

import RoundwareContext, { IRoundwareContext } from '../context/RoundwareContext';
import useDebounce from '../hooks/useDebounce';
import { useDeviceID } from '../hooks/useDeviceID';

import config from '@/config';
import Roundware, { Coordinates, GeoListenMode, GeoListenModeType, IRoundwareConstructorOptions, IAssetData } from 'roundware-web-framework/dist/index';

import { ITagLookup } from '@/types/index';
interface PropTypes {
	children: React.ReactNode;
}

const RoundwareProvider = (props: PropTypes) => {
	const [roundware, setRoundware] = useState<Roundware>({
		uiConfig: {
			speak: [],
		},
		speakers: () => [],
	} as unknown as Roundware);
	const [assetsReady, setAssetsReady] = useState<IRoundwareContext[`assetsReady`]>(false);
	const [beforeDateFilter, setBeforeDateFilter] = useState<IRoundwareContext[`beforeDateFilter`]>(new Date());
	const [afterDateFilter, setAfterDateFilter] = useState<IRoundwareContext[`afterDateFilter`]>(null);
	const [userFilter, setUserFilter] = useState<IRoundwareContext[`userFilter`]>('');
	const [selectedAsset, selectAsset] = useState<IRoundwareContext[`selectedAsset`]>(null);
	const [selectedTags, setSelectedTags] = useState<IRoundwareContext[`selectedTags`]>(null);
	const [descriptionFilter, setDescriptionFilter] = useState<IRoundwareContext[`descriptionFilter`]>(null);
	const debouncedDescriptionFilter = useDebounce(descriptionFilter, 800);
	const [sortField, setSortField] = useState<IRoundwareContext[`sortField`]>({ name: 'created', asc: false });
	const [assetPageIndex, setAssetPageIndex] = useState(0);
	const [assetsPerPage, setAssetsPerPage] = useState(10000);
	const [tagLookup, setTagLookup] = useState<IRoundwareContext[`tagLookup`]>({});
	const [filteredAssets, setFilteredAssets] = useState<IAssetData[]>([]);
	const deviceId = useDeviceID();
	const [assetPageNonMemoized, setAssetPage] = useState<IRoundwareContext[`assetPage`]>([]);
	const assetPage = useMemo(() => assetPageNonMemoized, [assetPageNonMemoized]);
	const [playingAssets, setPlayingAssets] = useState<IRoundwareContext[`playingAssets`]>([]);

	const [hideSpeakerPolygons, setHideSpeakerPolygons] = useState<IRoundwareContext[`hideSpeakerPolygons`]>(config.features.speakerToggleIds?.[0] ? [config.features.speakerToggleIds?.[0]] : []);
	const [lastSpeakerUpdateTime, setLastSpeakerUpdateTime] = useState<Date>(new Date());
	const [sessionCreatedSpeakerIds, setSessionCreatedSpeakerIds] = useState<IRoundwareContext[`sessionCreatedSpeakerIds`]>([]);
	const [playingSpeakerIds, setPlayingSpeakerIds] = useState<IRoundwareContext[`playingSpeakerIds`]>(new Set());

	const [, forceUpdate] = useReducer((x) => !x, false);

	const updatePlaying = (assets: IAssetData[] | undefined) => {
		const pa: IAssetData[] = Array.from(roundware?.mixer?.playlist?.trackMap.values() || []).filter((a) => a != null) as IAssetData[];
		setPlayingAssets(pa || []);
		console.log(`update playing: `, pa);
	};

	const sortAssets = (assets: IAssetData[]) => {
		const sort_value = sortField.asc ? 1 : -1;

		const sortEntries = (a: IAssetData, b: IAssetData) => {
			if (a[sortField.name]! > b[sortField.name]!) {
				return sort_value;
			}
			if (a[sortField.name]! < b[sortField.name]!) {
				return -Math.abs(sort_value);
			}
			return 0;
		};
		const sortedAssets = [...assets];
		sortedAssets.sort(sortEntries);
		return sortedAssets;
	};

	useEffect(() => {
		const sortedAssets = sortAssets(filteredAssets);
		if (sortedAssets.length < assetPageIndex * assetsPerPage) {
			setAssetPageIndex(0);
			return;
		}
		const page: IAssetData[] = sortedAssets.slice(assetPageIndex * assetsPerPage, assetPageIndex * assetsPerPage + assetsPerPage);
		setAssetPage(page);
		if (roundware.assetData) {
			setAssetsReady(true);
		}
	}, [filteredAssets, assetPageIndex, assetsPerPage, sortField.name, sortField.asc]);

	useEffect(() => {
		if (!roundware?.uiConfig?.speak) {
			return;
		}
		let tag_lookup: ITagLookup = {};
		roundware.uiConfig.speak.forEach((group) =>
			group.display_items.forEach((tag) => {
				tag_lookup[tag.id] = tag;
			})
		);
		setTagLookup(tag_lookup);
	}, [roundware?.uiConfig && roundware?.uiConfig?.speak]);

	const filterAssets = (asset_data: IAssetData[]) => {
		return asset_data.filter((asset) => {
			// show the asset, unless a filter returns 'false'

			if (config.map.assetTypeDisplay.includes(asset.media_type as 'audio' | 'photo' | 'text') == false) {
				return false;
			}

			// filter by tags first
			let filteredByTag = false;
			const tag_filter_groups = Object.entries(selectedTags || {});
			tag_filter_groups.forEach(([_filter_group, tags]: [_filter_group: string, tags: number[]]) => {
				if (filteredByTag) {
					// if we've already filtered out this asset based on another tag group, stop thinking about it
					return;
				}
				if (tags.length) {
					const hasMatch = tags.some((tag_id: number) => asset.tag_ids!.indexOf(tag_id) !== -1);
					if (!hasMatch) {
						filteredByTag = true;
					}
				}
			});
			if (filteredByTag) {
				return false;
			}
			// then filter by user
			if (userFilter.length) {
				let user_str = 'anonymous';
				if (asset.user) {
					user_str = asset.user && `${asset.user.username} ${asset.user.email}`;
				}
				const user_match = user_str.indexOf(userFilter) !== -1;
				if (!user_match) {
					return false;
				}
			}
			// then filter by start and end dates
			if (afterDateFilter && beforeDateFilter) {
				const dateMatch = asset.created! <= beforeDateFilter.toISOString() && asset.created! >= afterDateFilter.toISOString() ? true : false;

				if (!dateMatch) {
					return false;
				}
			}

			if (descriptionFilter) {
				const descMatch = asset.description?.toLowerCase().indexOf(descriptionFilter.toLowerCase()) !== -1;

				if (!descMatch) return false;
			}
			return true;
		});
	};

	/**
	 * Gets existing speaker group assignments from the current speaker engine.
	 * This preserves the original group logic from roundware-web-framework.
	 * Returns a Map where keys are speaker IDs and values are group IDs.
	 */
	const getExistingSpeakerGroups = (): Map<number, number> => {
		const groupMap = new Map<number, number>();
		
		if (roundware?.mixer?.speakerEngine?.speakers) {
			roundware.mixer.speakerEngine.speakers.forEach(track => {
				if (track.data && track.data.id && track.groupId !== undefined) {
					groupMap.set(track.data.id, track.groupId);
				}
			});
		}
		
		if (config.debugMode) {
			console.log('Existing speaker groups preserved:', Array.from(groupMap.entries()));
		}
		
		return groupMap;
	};

	// tells the provider to update assetData dependencies with the roundware _assetData source
	const updateAssets: IRoundwareContext[`updateAssets`] = (assetData) => {
		const filteredAssets = filterAssets(assetData || roundware.assetData || []);
		setFilteredAssets(filteredAssets);
	};

	// tells the provider to update specific speakers or all speakers
	/**
	 * Updates speaker data and refreshes the audio engine to reflect changes in speaker geometry/properties.
	 * Can be called with specific speaker IDs (for immediate updates after recording submission) 
	 * or without IDs (for periodic updates to catch changes from other users).
	 * Uses surgical speaker track replacement to ensure spatial audio calculations use updated data.
	 * Now properly calculates speaker groups based on parent/child relationships for synchronization.
	 */
	const updateSpeakers: IRoundwareContext[`updateSpeakers`] = async (speakerIds) => {
		try {
			let newSpeakers: any[] = [];
			let updatedSpeakers: any[] = [];
			
			if (speakerIds && speakerIds.length > 0) {
				// Targeted update: fetch specific speakers that were just updated
				if (config.debugMode) {
					console.log(`Updating specific speakers: ${speakerIds.join(', ')}`);
					console.log(`Current speakers count before update: ${Array.isArray(roundware.speakers()) ? roundware.speakers().length : 'N/A'}`);
				}
				
				const speakerPromises = speakerIds.map(async (id) => {
					try {
						if (!roundware?.apiClient) {
							throw new Error('API client not available');
						}
						return await roundware.apiClient.get(`/speakers/${id}/`, {
							project_id: roundware.project.projectId,
						});
					} catch (error) {
						console.error(`Failed to fetch speaker ${id}:`, error);
						return null;
					}
				});

				const fetchedSpeakers = await Promise.all(speakerPromises);
				const validSpeakers = fetchedSpeakers.filter(Boolean);

				if (validSpeakers.length === 0) {
					console.warn('No valid speakers received from API');
					return;
				}

				// Update the underlying speaker data in roundware.speakers() array
				const currentSpeakers = roundware.speakers();
				
				if (!Array.isArray(currentSpeakers)) {
					console.error('Current speakers is not an array, cannot update');
					return;
				}
				
				// Separate new vs existing speakers for proper handling
				validSpeakers.forEach((updatedSpeaker: any) => {
					if (!updatedSpeaker || !updatedSpeaker.id) {
						console.warn('Invalid speaker data received, skipping');
						return;
					}
					const existingIndex = currentSpeakers.findIndex((s) => s.id === updatedSpeaker.id);
					if (existingIndex !== -1) {
						// Update existing speaker
						currentSpeakers[existingIndex] = updatedSpeaker;
						updatedSpeakers.push(updatedSpeaker);
					} else {
						// Add new speaker
						currentSpeakers.push(updatedSpeaker);
						newSpeakers.push(updatedSpeaker);
						
						// Track newly created speakers in current session
						setSessionCreatedSpeakerIds(prev => {
							const newIds = [...prev, updatedSpeaker.id];
							if (config.debugMode) {
								console.log(`Tracking newly created speaker ${updatedSpeaker.id} in session. Total new speakers: ${newIds.length}`);
							}
							return newIds;
						});
					}
				});

			} else {
				// Periodic update: fetch all speakers and compare with current ones
				try {
					const allSpeakers = await roundware.apiClient.get('/speakers/', {
						project_id: roundware.project.projectId,
						activeyn: true,
					});

					if (config.debugMode) {
						console.log('Fetched all speakers for comparison:', Array.isArray(allSpeakers) ? allSpeakers.length : 0);
					}

					if (!Array.isArray(allSpeakers)) {
						console.warn('Invalid speakers data from API');
						return;
					}

					const currentSpeakers = roundware.speakers();
					
					if (!Array.isArray(currentSpeakers)) {
						if (config.debugMode) {
							console.warn('Current speakers is not an array, skipping comparison');
						}
						return;
					}
					
					// Check for new speakers
					newSpeakers = allSpeakers.filter((fetchedSpeaker: any) => {
						if (!fetchedSpeaker || !fetchedSpeaker.id) return false;
						
						return !currentSpeakers.find((current) => current.id === fetchedSpeaker.id);
					});
					
					// Check for updated speakers (compare shapes or other properties)
					updatedSpeakers = allSpeakers.filter((fetchedSpeaker: any) => {
						if (!fetchedSpeaker || !fetchedSpeaker.id) return false;
						
						const current = currentSpeakers.find((c) => c.id === fetchedSpeaker.id);
						if (!current) return false;
						
						// Compare shape data (main thing that gets updated)
						try {
							return JSON.stringify(current.shape) !== JSON.stringify(fetchedSpeaker.shape);
						} catch (error) {
							if (config.debugMode) {
								console.warn(`Error comparing shapes for speaker ${fetchedSpeaker.id}:`, error);
							}
							return false;
						}
					});

					if (newSpeakers.length === 0 && updatedSpeakers.length === 0) {
						// No changes detected
						return;
					}

					if (config.debugMode) {
						console.log(`Found ${newSpeakers.length} new speakers and ${updatedSpeakers.length} updated speakers`);
					}
					
					// Update the underlying speaker data
					[...newSpeakers, ...updatedSpeakers].forEach((speaker: any) => {
						const existingIndex = currentSpeakers.findIndex((s) => s.id === speaker.id);
						if (existingIndex !== -1) {
							// Update existing speaker
							currentSpeakers[existingIndex] = speaker;
						} else {
							// Add new speaker
							currentSpeakers.push(speaker);
						}
					});

				} catch (error) {
					console.error('Failed to fetch speakers for periodic update:', error);
					return;
				}
			}

			// Surgical approach: update existing speakers, add new speakers to correct groups
			if (roundware.mixer?.speakerEngine && (newSpeakers.length > 0 || updatedSpeakers.length > 0)) {
				const speakerEngine = roundware.mixer.speakerEngine;
				
				// Helper function to find the correct group ID for a new speaker based on its parents
				const findGroupIdForNewSpeaker = (speakerData: any): number => {
					if (!speakerData.parents || !Array.isArray(speakerData.parents) || speakerData.parents.length === 0) {
						// No parents - create its own group
						return speakerData.id;
					}
					
					// Find the group ID of the first parent that exists in the speaker engine
					for (const parentId of speakerData.parents) {
						const parentTrack = speakerEngine.speakers.find((track: any) => track.data.id === parentId);
						if (parentTrack && parentTrack.groupId !== undefined) {
							if (config.debugMode) {
								console.log(`New speaker ${speakerData.id} joining group ${parentTrack.groupId} from parent ${parentId}`);
							}
							return parentTrack.groupId;
						}
					}
					
					// Fallback: if no parent found in engine, use speaker's own ID
					if (config.debugMode) {
						console.log(`New speaker ${speakerData.id} parents not found in engine, creating new group`);
					}
					return speakerData.id;
				};
				
				// Handle updated speakers - just update their data, preserve group ID and buffers
				if (updatedSpeakers.length > 0) {
					if (config.debugMode) {
						console.log(`Updating ${updatedSpeakers.length} existing speakers in engine`);
					}
					
					updatedSpeakers.forEach((updatedSpeaker: any) => {
						const speakerIndex = speakerEngine.speakers.findIndex(
							(s: any) => s.data.id === updatedSpeaker.id
						);
						
						if (speakerIndex >= 0) {
							const existingTrack = speakerEngine.speakers[speakerIndex];
							
							if (config.debugMode) {
								console.log(`Updating speaker ${updatedSpeaker.id} data, preserving group ${existingTrack.groupId}`);
							}
							
							// Store the current buffer and group state before updating
							const wasBufferLoaded = !!existingTrack.buffer;
							const currentBuffer = existingTrack.buffer;
							const currentRequest = existingTrack.request;
							const currentGroupId = existingTrack.groupId;
							
							// Get the SpeakerTrack constructor from the existing instance
							const SpeakerTrack = Object.getPrototypeOf(existingTrack).constructor;
							
							// Create new instance with updated data but preserve group ID
							const newSpeakerTrack = new SpeakerTrack({
								data: updatedSpeaker,
								audioContext: existingTrack.audioContext || speakerEngine.audioContext,
								config: existingTrack.config || {},
								groupId: currentGroupId // Preserve existing group ID
							});
							
							// Restore buffer if it existed
							if (wasBufferLoaded && currentBuffer) {
								newSpeakerTrack.buffer = currentBuffer;
								newSpeakerTrack.request = currentRequest;
								if (config.debugMode) {
									console.log(`Restored buffer to updated speaker ${updatedSpeaker.id}`);
								}
							}
							
							// Replace with the new track
							speakerEngine.speakers[speakerIndex] = newSpeakerTrack;
						} else {
							console.warn(`Could not find speaker ${updatedSpeaker.id} in engine to update`);
						}
					});
				}
				
				// Handle new speakers - add them to the correct group based on parent relationships
				if (newSpeakers.length > 0) {
					if (config.debugMode) {
						console.log(`Adding ${newSpeakers.length} new speakers to audio engine`);
					}
					
					// Get existing speaker tracks for reference
					const existingSpeakerTracks = speakerEngine.speakers || [];
					
					if (existingSpeakerTracks.length > 0) {
						// Use existing speaker track as template
						const templateTrack = existingSpeakerTracks[0];
						const SpeakerTrack = Object.getPrototypeOf(templateTrack).constructor;
						
						// Create SpeakerTrack instances for new speakers with correct group IDs
						const newSpeakerTracks = newSpeakers.map((data: any) => {
							const groupId = findGroupIdForNewSpeaker(data);
							
							return new SpeakerTrack({
								data,
								audioContext: speakerEngine.audioContext,
								config: roundware.mixer.mixParams.speakerConfig!,
								groupId: groupId,
							});
						});
						
						// Add new speaker tracks to the engine
						speakerEngine.speakers.push(...newSpeakerTracks);
						
						if (config.debugMode) {
							console.log(`Successfully added ${newSpeakerTracks.length} speaker tracks to engine`);
						}
					} else {
						console.warn('No existing speaker tracks found to use as template for new speakers');
					}
				}
				
				// Force spatial audio recalculation after updates
				try {
					// First, recalculate volumes for all speakers
					if (typeof (speakerEngine as any).calculateVolumesByLocation === 'function') {
						(speakerEngine as any).calculateVolumesByLocation();
						if (config.debugMode) {
							console.log('Called calculateVolumesByLocation() on speaker engine');
						}
					}
					
					// Then trigger updateParams() with current listener location to force full recalculation
					if (typeof (speakerEngine as any).updateParams === 'function' && (speakerEngine as any).mixParams) {
						const currentMixParams = (speakerEngine as any).mixParams;
						if (currentMixParams) {
							(speakerEngine as any).updateParams(currentMixParams);
							if (config.debugMode) {
								console.log('Called updateParams() on speaker engine to force spatial recalculation');
							}
						}
					}
				} catch (engineError) {
					console.error('Speaker engine spatial recalculation failed:', engineError);
				}
				
				if (config.debugMode) {
					console.log(`Speaker update completed. New speakers: ${newSpeakers.length}, Updated speakers: ${updatedSpeakers.length}`);
					console.log(`Total speakers in engine after update: ${speakerEngine.speakers.length}`);
					console.log(`Total speakers in roundware.speakers() after update: ${roundware.speakers().length}`);
				}
			}

			// Update timestamp for all updates that have changes
			if (newSpeakers.length > 0 || updatedSpeakers.length > 0) {
				setLastSpeakerUpdateTime(new Date());
			}
			
			// Always trigger a force update to ensure UI components re-render
			forceUpdate();
		} catch (error) {
			console.error('Failed to update speakers:', error);
			forceUpdate();
		}
	};

	useEffect(() => {
		if (roundware?.assetData) {
			const filteredAssets = filterAssets(roundware.assetData);
			setFilteredAssets(filteredAssets);
		}
	}, [roundware?.assetData, selectedTags, userFilter, afterDateFilter, beforeDateFilter, debouncedDescriptionFilter]);

	const selectTags: IRoundwareContext[`selectTags`] = (tags, group) => {
		setSelectedTags((prev) => {
			const group_key = group.group_short_name!;
			const newFilters = prev ? { ...prev } : {};
			let listenTagIds: number[] = [];
			if (tags == null && newFilters[group_key]) {
				delete newFilters[group_key];
			} else {
				newFilters[group_key] = tags!;
			}

			Object.keys(newFilters).map(function (key) {
				listenTagIds.push(...newFilters[key]);
			});

			roundware.mixer.updateParams({ listenTagIds: listenTagIds });
			roundware.events?.logEvent(`filter_stream`, {
				tag_ids: listenTagIds,
			});
			return newFilters;
		});
	};

	// when this provider is loaded, initialize roundware via api
	useEffect(() => {
		const project_id = config.project.id;
		const server_url = config.project.apiUrl;
		console.log(config.project);
		// maybe we build the site with a default listener location,
		// otherwise we go to null island

		// location from url params take precendence;
		const searchParams = new URLSearchParams(location.search);

		const urlLatitude = searchParams.get('latitude');
		const urlLongitude = searchParams.get('longitude');
		const initial_loc = {
			latitude: parseFloat(typeof urlLatitude == 'string' ? urlLatitude : (config.project.initialLocation.latitude || 0).toString()),
			longitude: parseFloat(typeof urlLongitude == 'string' ? urlLongitude : (config.project.initialLocation.longitude || 0).toString()),
		};

		const roundwareOptions: IRoundwareConstructorOptions = {
			deviceId: deviceId,
			serverUrl: server_url,
			projectId: project_id,
			geoListenMode: GeoListenMode.DISABLED,
			speakerFilters: { activeyn: true },
			assetFilters: { submitted: true },
			listenerLocation: initial_loc,
			assetUpdateInterval: 30 * 1000,

			apiClient: undefined!,
			keepPausedAssets: config.listen.keepPausedAssets == true,
			speakerConfig: config.listen.speaker,
		};
		const roundware = new Roundware(roundwareOptions);

		roundware.connect().then(() => {
			// set the initial listener location to the project default
			if (!searchParams.has('latitude')) {
				// and when url params are not passed
				roundware.updateLocation(roundware.project.location);
			}
			roundware.onUpdateLocation = forceUpdate;
			roundware.onUpdateAssets = updateAssets;
			roundware.onPlayAssets = updatePlaying;
			setRoundware(roundware);
		});
	}, []);

	useEffect(() => {
		if (roundware.project && typeof roundware.loadAssetPool == 'function') {
			roundware?.loadAssetPool().then((data) => {
				setAssetsReady(true);
			});
		}
	}, [roundware?.project]);

	// Log original speaker groups when speaker engine is first available
	useEffect(() => {
		if (roundware?.mixer?.speakerEngine?.speakers && Array.isArray(roundware.mixer.speakerEngine.speakers) && roundware.mixer.speakerEngine.speakers.length > 0) {
			if (config.debugMode) {
				console.log('=== ORIGINAL SPEAKER GROUPS (before recalculation) ===');
				
				// Log raw speaker data with parent relationships
				const speakersData = roundware.speakers();
				console.log('Raw speaker data from API:', speakersData.map(s => ({
					id: s.id,
					parents: s.parents || 'none',
					// Include any other relevant fields you want to see
				})));
				
				// Log original group IDs from speaker engine
				const originalGroups = roundware.mixer.speakerEngine.speakers.map(track => ({
					speakerId: track.data.id,
					originalGroupId: track.groupId,
					hasParents: track.data.parents ? track.data.parents.length > 0 : false,
					parents: track.data.parents || []
				}));
				console.log('Original speaker engine group assignments:', originalGroups);
				
				// Group by original group ID to see the structure
				const groupedByOriginalId = new Map();
				originalGroups.forEach(speaker => {
					if (!groupedByOriginalId.has(speaker.originalGroupId)) {
						groupedByOriginalId.set(speaker.originalGroupId, []);
					}
					groupedByOriginalId.get(speaker.originalGroupId).push(speaker.speakerId);
				});
				console.log('Original groups structure:', Array.from(groupedByOriginalId.entries()));
				console.log('=== END ORIGINAL SPEAKER GROUPS ===');
			}
		}
	}, [roundware?.mixer?.speakerEngine?.speakers]);

	// Set up periodic speaker updates using configurable interval
	// This helps catch speakers added by other users
	useEffect(() => {
		if (!roundware?.project) return;

		const interval = setInterval(() => {
			// Only update speakers if we have an active connection and speakers loaded
			if (roundware && Array.isArray(roundware.speakers())) {
				if (config.debugMode) {
					console.log('Periodic speaker update check...');
				}
				updateSpeakers();
			}
		}, config.listen.speakerUpdateInterval);

		return () => clearInterval(interval);
	}, [roundware?.project]);
	
	// Reset session tracking when project changes or component unmounts
	useEffect(() => {
		return () => {
			// Clear session tracking when unmounting
			setSessionCreatedSpeakerIds([]);
		};
	}, [roundware?.project]);

	const geoListenMode = (roundware?.mixer && roundware?.mixer?.mixParams?.geoListenMode) || GeoListenMode?.DISABLED;
	const setGeoListenMode = (modeName: GeoListenModeType) => {
		roundware.enableGeolocation(modeName);
		let prom: Promise<Coordinates | void>;
		// console.log(`roundware.mixer.mixParams.geoListenMode: ${roundware.mixer.mixParams.geoListenMode}`);
		if (modeName === GeoListenMode.AUTOMATIC) {
			if (roundware.mixer) {
				roundware.mixer.updateParams({
					maxDist: roundware.project.recordingRadius,
					recordingRadius: roundware.project.recordingRadius,
				});
			}
		} else if (modeName === GeoListenMode.MANUAL) {
			// set maxDist to value calculated from range circle overlay
			prom = new Promise<void>((resolve, reject) => {
				resolve();
			});
			prom.then(forceUpdate);
		}
	};

	const resetFilters = () => {
		setAfterDateFilter(null);
		setBeforeDateFilter(null);
		setDescriptionFilter(null);
		setSelectedTags(null);
	};
	
	const clearSessionCreatedSpeakers = () => {
		setSessionCreatedSpeakerIds([]);
	};

	// Set up event listeners for playing state tracking (shared across components)
	useEffect(() => {
		if (!roundware.mixer?.speakerEngine) return;

		const speakerEngine = roundware.mixer.speakerEngine;

		// Listen to the main event that tells us which tracks are playing
		const handlePlayingTracksUpdated = (playingTracks: (number | null)[]) => {
			const playingIds = new Set(playingTracks.filter(id => id !== null) as number[]);
			setPlayingSpeakerIds(playingIds);
		};

		// Listen to individual speaker events for immediate feedback
		const handleSpeakerPlaying = (speakerId: number) => {
			setPlayingSpeakerIds(prev => new Set(Array.from(prev).concat(speakerId)));
		};

		const handleSpeakerFinished = (speakerId: number) => {
			setPlayingSpeakerIds(prev => {
				const newSet = new Set(prev);
				newSet.delete(speakerId);
				return newSet;
			});
		};

		// Set up event listeners
		speakerEngine.on('playingTracksUpdated', handlePlayingTracksUpdated);

		// Set up individual speaker event listeners and store references for cleanup
		const speakerEventHandlers: Array<{
			speaker: any;
			playingHandler: () => void;
			finishedHandler: () => void;
			abortedHandler: () => void;
		}> = [];

		speakerEngine.speakers?.forEach((speaker: any) => {
			const playingHandler = () => handleSpeakerPlaying(speaker.data.id);
			const finishedHandler = () => handleSpeakerFinished(speaker.data.id);
			const abortedHandler = () => handleSpeakerFinished(speaker.data.id);

			speaker.on('playing', playingHandler);
			speaker.on('finished', finishedHandler);
			speaker.on('aborted', abortedHandler);

			speakerEventHandlers.push({
				speaker,
				playingHandler,
				finishedHandler,
				abortedHandler,
			});
		});

		return () => {
			// Clean up event listeners
			speakerEngine.off('playingTracksUpdated', handlePlayingTracksUpdated);
			speakerEventHandlers.forEach(({ speaker, playingHandler, finishedHandler, abortedHandler }) => {
				speaker.off('playing', playingHandler);
				speaker.off('finished', finishedHandler);
				speaker.off('aborted', abortedHandler);
			});
		};
	}, [roundware.mixer?.speakerEngine]);

	return (
		<RoundwareContext.Provider
			value={{
				roundware,
				// everything from the state
				tagLookup,
				sortField,
				selectedTags,
				selectedAsset,
				beforeDateFilter,
				afterDateFilter,
				assetPageIndex,
				assetsPerPage,
				geoListenMode,
				userFilter,
				playingAssets,
				descriptionFilter,
				// state modification functions
				selectAsset,
				selectTags,
				setUserFilter,
				setBeforeDateFilter,
				setAfterDateFilter,
				setAssetPageIndex,
				setAssetsPerPage,
				setSortField,
				forceUpdate,
				setGeoListenMode,
				updateAssets,
				updateSpeakers,
				setDescriptionFilter,
				resetFilters,
				// computed properties
				assetPage,
				assetsReady,
				hideSpeakerPolygons,
				setHideSpeakerPolygons,
				lastSpeakerUpdateTime,
				sessionCreatedSpeakerIds,
				setSessionCreatedSpeakerIds,
				clearSessionCreatedSpeakers,
				playingSpeakerIds,
				setPlayingSpeakerIds,
			}}
		>
			{props.children}
		</RoundwareContext.Provider>
	);
};

export default RoundwareProvider;
