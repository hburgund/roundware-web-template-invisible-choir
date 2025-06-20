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
	 * Implements surgical speaker track replacement to ensure spatial audio calculations use updated data.
	 */
	const updateSpeakers: IRoundwareContext[`updateSpeakers`] = async (speakerIds) => {
		try {
			if (speakerIds && speakerIds.length > 0) {
				if (config.debugMode) {
					console.log(`Updating specific speakers: ${speakerIds.join(', ')}`);
				}
				// Fetch the updated speakers from the API
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

				const updatedSpeakers = await Promise.all(speakerPromises);
				const validSpeakers = updatedSpeakers.filter(Boolean);

				if (validSpeakers.length > 0) {
					// Manually update the speaker data in the roundware.speakers() array
					const currentSpeakers = roundware.speakers();
					
					if (!Array.isArray(currentSpeakers)) {
						console.error('Current speakers is not an array, cannot update');
						return;
					}
					
					validSpeakers.forEach((updatedSpeaker: any) => {
						if (!updatedSpeaker || !updatedSpeaker.id) {
							console.warn('Invalid speaker data received, skipping');
							return;
						}
						const existingIndex = currentSpeakers.findIndex((s) => s.id === updatedSpeaker.id);
						if (existingIndex !== -1) {
							// Update existing speaker
							currentSpeakers[existingIndex] = updatedSpeaker;
						} else {
							// Add new speaker
							currentSpeakers.push(updatedSpeaker);
						}
					});

					// Trigger a re-initialization of the speaker engine if it exists
					if (roundware.mixer?.speakerEngine) {
						try {
							// Re-initialize the speaker engine with updated speakers
							roundware.mixer.speakerEngine.speakers = [];
							await roundware.activateMixer();
							if (config.debugMode) {
								console.log('Successfully reinitialized mixer with updated speakers');
							}
						} catch (error) {
							console.error('Failed to reinitialize speaker engine:', error);
						}
					}
				} else {
					console.warn('No valid speakers received from API');
				}
			} else {
				// Periodic update: since server doesn't support date filtering yet,
				// we'll fetch all speakers and compare with current ones
				try {
					const allSpeakers = await roundware.apiClient.get('/speakers/', {
						project_id: roundware.project.projectId,
						activeyn: true,
					});

					if (config.debugMode) {
						console.log('Fetched all speakers for comparison:', Array.isArray(allSpeakers) ? allSpeakers.length : 0);
					}

					if (Array.isArray(allSpeakers)) {
						const currentSpeakers = roundware.speakers();
						
						if (!Array.isArray(currentSpeakers)) {
							if (config.debugMode) {
								console.warn('Current speakers is not an array, skipping comparison');
							}
							return;
						}
						
						// Check if there are any differences (new speakers or shape changes)
						let hasChanges = false;
						
						// Check for new speakers
						const newSpeakers = allSpeakers.filter((fetchedSpeaker: any) => {
							if (!fetchedSpeaker || !fetchedSpeaker.id) return false;
							
							// Validate that the new speaker has valid geometry
							if (!fetchedSpeaker.shape || !fetchedSpeaker.shape.coordinates) {
								console.warn(`New speaker ${fetchedSpeaker.id} from API has invalid geometry, skipping`);
								return false;
							}
							
							return !currentSpeakers.find((current) => current.id === fetchedSpeaker.id);
						});
						
						// Check for updated speakers (compare shapes or other properties)
						const updatedSpeakers = allSpeakers.filter((fetchedSpeaker: any) => {
							if (!fetchedSpeaker || !fetchedSpeaker.id) return false;
							
							// Validate that the fetched speaker has valid geometry
							if (!fetchedSpeaker.shape || !fetchedSpeaker.shape.coordinates) {
								console.warn(`Speaker ${fetchedSpeaker.id} from API has invalid geometry, skipping`);
								return false;
							}
							
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

						if (newSpeakers.length > 0 || updatedSpeakers.length > 0) {
							hasChanges = true;
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

							// Now we need to update the speaker engine for audio playback using the surgical approach
							if (roundware.mixer?.speakerEngine) {
								const speakerEngine = roundware.mixer.speakerEngine;
								try {
									// Handle new speakers - add SpeakerTrack instances without disrupting existing ones
									if (newSpeakers.length > 0) {
										if (config.debugMode) {
											console.log(`Adding ${newSpeakers.length} new speakers to audio engine`);
										}
										
										try {
											// Import SpeakerTrack and SpeakerUtils (these are internal to roundware framework)
											const { SpeakerTrack, SpeakerUtils } = (speakerEngine as any).constructor;
											
											// Get all current speaker data for group calculation
											const allSpeakerData = [
												...currentSpeakers,
												...speakerEngine.speakers.map((s: any) => s.data)
											];
											
											// Create SpeakerTrack instances for new speakers
											const newSpeakerTracks = newSpeakers.map((data: any) => {
												const groupId = SpeakerUtils.getRootForSpeaker(data, allSpeakerData);
												return new SpeakerTrack({
													data,
													audioContext: speakerEngine.audioContext,
													config: roundware.mixer.mixParams.speakerConfig!,
													groupId,
												});
											});
											
											// Add new speaker tracks to the engine
											speakerEngine.speakers.push(...newSpeakerTracks);
											
											// Update groups mapping for new speakers
											newSpeakerTracks.forEach((speaker: any) => {
												if (!speakerEngine.group.has(speaker.groupId)) {
													speakerEngine.group.set(speaker.groupId, null);
												}
											});
											
											if (config.debugMode) {
												console.log(`Successfully added ${newSpeakerTracks.length} speaker tracks to engine`);
											}
										} catch (error) {
											console.error('Failed to add new speakers to audio engine:', error);
										}
									}

									// Handle updated speakers - update their data in existing SpeakerTrack instances
									if (updatedSpeakers.length > 0) {
										if (config.debugMode) {
											console.log(`Updating ${updatedSpeakers.length} existing speakers in engine`);
										}
										updatedSpeakers.forEach((updatedSpeaker: any) => {
											const engineSpeaker = speakerEngine.speakers.find(
												(s: any) => s.data.id === updatedSpeaker.id
											);
											
											if (engineSpeaker) {
												if (config.debugMode) {
													console.log(`Updating speaker ${updatedSpeaker.id} data in engine`);
													console.log('Old speaker shape:', JSON.stringify(engineSpeaker.data.shape));
													console.log('New speaker shape:', JSON.stringify(updatedSpeaker.shape));
												}
												
												// Nuclear option: Try to completely replace the SpeakerTrack instance
												const speakerIndex = speakerEngine.speakers.findIndex((s: any) => s.data.id === updatedSpeaker.id);
												
												try {
													// Get the SpeakerTrack constructor and dependencies from the existing instance
													const audioContext = engineSpeaker.audioContext || (speakerEngine as any).audioContext;
													const speakerConfig = engineSpeaker.config || {};
													const groupId = engineSpeaker.groupId;
													
													// Validate speaker geometry before creating new instance
													if (!updatedSpeaker.shape || !updatedSpeaker.shape.coordinates) {
														console.error(`Speaker ${updatedSpeaker.id} has invalid geometry, skipping update`);
														return;
													}
													
													// Try to access the SpeakerTrack constructor
													const SpeakerTrack = Object.getPrototypeOf(engineSpeaker).constructor;
													
													// Create new instance with updated data
													const newSpeakerTrack = new SpeakerTrack({
														data: updatedSpeaker,
														audioContext,
														config: speakerConfig,
														groupId
													});
													
													// Replace the old instance in the speakers array
													if (speakerIndex >= 0) {
														speakerEngine.speakers[speakerIndex] = newSpeakerTrack;
														if (config.debugMode) {
															console.log(`Successfully replaced entire SpeakerTrack instance for speaker ${updatedSpeaker.id}`);
														}
													}
													
												} catch (constructorError) {
													if (config.debugMode) {
														console.log('Could not create new SpeakerTrack instance, falling back to data update:', constructorError);
													}
													
													// Fallback: Force update all possible data references
													try {
														engineSpeaker.data = JSON.parse(JSON.stringify(updatedSpeaker));
														if ((engineSpeaker as any).originalData) {
															(engineSpeaker as any).originalData = JSON.parse(JSON.stringify(updatedSpeaker));
														}
														if ((engineSpeaker as any)._data) {
															(engineSpeaker as any)._data = JSON.parse(JSON.stringify(updatedSpeaker));
														}
														if (config.debugMode) {
															console.log('Fallback data update completed for speaker:', updatedSpeaker.id);
														}
													} catch (fallbackError) {
														console.error(`Failed to update speaker ${updatedSpeaker.id} data:`, fallbackError);
													}
												}
												
												// Force spatial audio recalculation using the engine's actual methods
												try {
													// Validate all speaker geometries before attempting spatial calculations
													const hasInvalidGeometry = speakerEngine.speakers.some((speaker: any) => {
														return !speaker.data?.shape || !speaker.data.shape.coordinates;
													});
													
													if (hasInvalidGeometry) {
														console.warn('Detected speakers with invalid geometry, skipping spatial recalculation to prevent errors');
														return;
													}
													
													// First, recalculate volumes for all speakers
													if (typeof (speakerEngine as any).calculateVolumesByLocation === 'function') {
														try {
															(speakerEngine as any).calculateVolumesByLocation();
															if (config.debugMode) {
																console.log('Called calculateVolumesByLocation() on speaker engine');
															}
														} catch (calcError) {
															console.error('Error in calculateVolumesByLocation:', calcError);
															// Continue with other recalculation methods even if this fails
														}
													}
													
													// Then trigger updateParams() with current listener location to force full recalculation
													if (typeof (speakerEngine as any).updateParams === 'function' && (speakerEngine as any).mixParams) {
														// Get current mix params and trigger updateParams to force spatial recalculation
														const currentMixParams = (speakerEngine as any).mixParams;
														if (currentMixParams) {
															try {
																(speakerEngine as any).updateParams(currentMixParams);
																if (config.debugMode) {
																	console.log('Called updateParams() on speaker engine to force spatial recalculation');
																}
															} catch (updateError) {
																console.error('Error in updateParams:', updateError);
																// Continue with individual speaker updates even if this fails
															}
														}
													}
													
													// Force immediate volume updates for currently playing tracks
													const playingTracks = (speakerEngine as any).playingTracks;
													if (Array.isArray(playingTracks)) {
														playingTracks.forEach((trackId: number | null) => {
															if (trackId !== null) {
																try {
																	const speaker = (speakerEngine as any).getSpeakerTrackById(trackId);
																	if (speaker && (speakerEngine as any).listenerPoint) {
																		// Validate speaker geometry before attempting volume calculation
																		if (!speaker.data?.shape || !speaker.data.shape.coordinates) {
																			console.warn(`Speaker ${trackId} has invalid geometry, skipping volume update`);
																			return;
																		}
																		
																		// Force recalculate volume for this specific speaker
																		if (typeof speaker.volumeByLocation === 'function') {
																			const listenerPoint = (speakerEngine as any).listenerPoint;
																			const newVolume = speaker.volumeByLocation(listenerPoint);
																			speaker.calculatedVolume = newVolume;
																			
																			if (config.debugMode) {
																				console.log('Listener point:', JSON.stringify(listenerPoint));
																				console.log('Speaker shape being used for calculation:', JSON.stringify(speaker.data.shape));
																				console.log(`Recalculated volume for playing speaker ${trackId}: ${newVolume}`);
																			}
																			
																			// Apply the new volume immediately to playing audio
																			if (typeof speaker.fadeBufferSourceToVolume === 'function') {
																				speaker.fadeBufferSourceToVolume(newVolume);
																				if (config.debugMode) {
																					console.log(`Applied new volume ${newVolume} to playing speaker ${trackId}`);
																					console.log(`Speaker ${trackId} bufferSourcePlaying:`, speaker.bufferSourcePlaying);
																					console.log(`Speaker ${trackId} current volume:`, speaker.calculatedVolume);
																				}
																			}
																		}
																	}
																} catch (speakerError) {
																	console.error(`Failed to update volume for playing speaker ${trackId}:`, speakerError);
																}
															}
														});
													}
												} catch (engineError) {
													console.error('Speaker engine spatial recalculation failed:', engineError);
												}
											}
										});
									}
									
								} catch (error) {
									console.error('Failed to update speaker engine surgically:', error);
									if (config.debugMode) {
										console.log('Note: SpeakerTrack/SpeakerUtils may not be accessible. Falling back to basic data updates.');
									}
									
									// Fallback: at least update the data for existing speakers if surgical approach fails
									if (updatedSpeakers.length > 0) {
										updatedSpeakers.forEach((updatedSpeaker: any) => {
											try {
												const engineSpeaker = speakerEngine.speakers.find(
													(s: any) => s.data.id === updatedSpeaker.id
												);
												
												if (engineSpeaker) {
													if (config.debugMode) {
														console.log(`Fallback: Updating speaker ${updatedSpeaker.id} data`);
													}
													engineSpeaker.data = updatedSpeaker;
												}
											} catch (fallbackError) {
												console.error(`Failed fallback update for speaker ${updatedSpeaker.id}:`, fallbackError);
											}
										});
									}
								}
							}
						}

						// Only update timestamp if we actually processed some speakers
						if (hasChanges) {
							setLastSpeakerUpdateTime(new Date());
						}
					}
									} catch (error) {
						console.error('Failed to fetch speakers for periodic update:', error);
					}
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
			}}
		>
			{props.children}
		</RoundwareContext.Provider>
	);
};

export default RoundwareProvider;
