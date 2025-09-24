import { point } from "@turf/helpers";
import finalConfig from "@/config";
import { useRoundware } from "@/hooks/index";
import { useEffect, useState } from "react";
import { useLoop } from "./useLoop";
import { ISpeakerData } from "roundware-web-framework";

/**
 * Helper function to find the top ancestor speaker
 * 
 * This function finds speakers whose parent is NOT in the current group of overlapping speakers.
 * This identifies the "root" speakers in the current context.
 * 
 * @param speakers - Array of speaker objects with data.parents array
 * @returns The top ancestor speaker, or null if no speakers provided
 * 
 * Logic:
 * 1. For each speaker, check if any of its parents are in the current speaker group
 * 2. Select speakers whose parents are NOT in the group (these are the "roots")
 * 3. If multiple root speakers found, randomly select one
 * 4. Returns the selected top ancestor speaker
 */
const findTopAncestorSpeaker = (speakers: any[]): any => {
  if (speakers.length === 0) return null;
  if (speakers.length === 1) return speakers[0];

  // Get all speaker IDs in the current group for quick lookup
  const currentSpeakerIds = new Set(speakers.map(s => s.data?.id));

  // Find speakers whose parent is NOT in the current group
  const rootSpeakers = speakers.filter(speaker => {
    const speakerParents = speaker.data?.parents || [];
    
    // Check if any of this speaker's parents are in the current group
    const hasParentInGroup = speakerParents.some((parentId: number) => currentSpeakerIds.has(parentId));
    
    // Return true if this speaker has NO parents in the current group (it's a root)
    return !hasParentInGroup;
  });

  console.debug(`Top ancestor analysis: ${speakers.length} speakers (IDs: [${Array.from(currentSpeakerIds).join(', ')}]), found ${rootSpeakers.length} root speakers`);
  rootSpeakers.forEach((speaker, index) => {
    console.debug(`  Root speaker ${index + 1}: ID ${speaker.data?.id}, parents: [${speaker.data?.parents?.join(', ') || 'none'}]`);
  });

  // If there are multiple root speakers, randomly pick one
  if (rootSpeakers.length > 1) {
    const randomIndex = Math.floor(Math.random() * rootSpeakers.length);
    console.debug(`Multiple root speakers found, randomly selecting index ${randomIndex}`);
    return rootSpeakers[randomIndex];
  }

  return rootSpeakers[0] || null;
};

const getSpeakerAudioBuffer = async (
  uri: string,
  audioContext: AudioContext
) => {
  try {
    console.log('[getSpeakerAudioBuffer] Starting to load audio from:', uri);
    
    // Handle relative URIs by converting to absolute URLs for production
    let absoluteUri = uri;
    if (uri.startsWith('/') && !uri.startsWith('//')) {
      // This is a relative path, convert to absolute URL using the Roundware server
      absoluteUri = `${finalConfig.project.serverUrl}${uri}`;
      console.log('[getSpeakerAudioBuffer] Converted to absolute URI:', absoluteUri);
    }
    
    console.log('[getSpeakerAudioBuffer] Fetching audio data...');
    const response = await fetch(absoluteUri);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    console.log('[getSpeakerAudioBuffer] Converting to array buffer...');
    const arrayBuffer = await response.arrayBuffer();
    console.log('[getSpeakerAudioBuffer] Array buffer size:', arrayBuffer.byteLength);
    
    // Check if AudioContext is ready
    if (audioContext.state === 'suspended') {
      console.log('[getSpeakerAudioBuffer] AudioContext is suspended, attempting to resume...');
      try {
        await audioContext.resume();
        console.log('[getSpeakerAudioBuffer] AudioContext resumed successfully');
      } catch (error) {
        console.error('[getSpeakerAudioBuffer] Failed to resume AudioContext:', error);
        // Continue anyway - decodeAudioData might still work
      }
    }
    
    console.log('[getSpeakerAudioBuffer] Decoding audio data...');
    const buffer = await audioContext.decodeAudioData(arrayBuffer);
    console.log('[getSpeakerAudioBuffer] Audio decoded successfully, duration:', buffer.duration);
    
    return buffer;
  } catch (error) {
    console.error('[getSpeakerAudioBuffer] Error loading audio:', error);
    throw error;
  }
};

// Automatically discover all WAV files in the click track directory at build time
// Import all WAV files in the audio directory - Vite will handle the asset processing
const clickTrackModules = import.meta.glob('/src/assets/audio/*.wav', { eager: true });

const getClickTrackFiles = () => {
  try {
    console.debug(`Click track modules:`, clickTrackModules);
    
    // Extract the processed URLs from the imported modules
    const files = Object.entries(clickTrackModules).map(([path, module]) => {
      const filename = path.split('/').pop()!;
      const url = (module as any).default || (module as any);
      console.debug(`Click track file: ${filename} -> ${url}`);
      return {
        filename,
        url
      };
    });
    
    console.debug(`Discovered ${files.length} click track files:`, files);
    return files;
  } catch (error) {
    console.error('Could not auto-discover click track files:', error);
    return [];
  }
};

const getClickTrackBuffer = async (
  targetDuration: number,
  audioContext: AudioContext
): Promise<AudioBuffer | null> => {
  if (!finalConfig.speak.clickTrack.enabled) {
    return null;
  }
  
  const tolerance = 0.2; // 200ms tolerance
  
  // Get the click track files with their processed URLs
  const clickFiles = getClickTrackFiles();
  
  if (clickFiles.length === 0) {
    return null;
  }
  
  for (const { filename, url } of clickFiles) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        continue;
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = await audioContext.decodeAudioData(arrayBuffer);
      const clickDuration = buffer.duration;
      
      // Check if this click file duration matches our target (within tolerance)
      if (Math.abs(clickDuration - targetDuration) <= tolerance) {
        // If it's close enough, use it as-is or adjust slightly
        const adjustedBuffer = adjustClickTrackDuration(buffer, targetDuration, audioContext);
        return adjustedBuffer;
      }
    } catch (error) {
      console.debug(`Error loading click track ${filename}:`, error);
    }
  }
  
  return null;
};

const adjustClickTrackDuration = (
  clickBuffer: AudioBuffer,
  targetDuration: number,
  audioContext: AudioContext
): AudioBuffer => {
  const currentDuration = clickBuffer.duration;
  const tolerance = 0.2; // 200ms tolerance
  
  // If duration is close enough, return as-is
  if (Math.abs(currentDuration - targetDuration) <= tolerance) {
    return clickBuffer;
  }
  
  const sampleRate = clickBuffer.sampleRate;
  const targetSamples = Math.floor(targetDuration * sampleRate);
  const channels = clickBuffer.numberOfChannels;
  
  // Create new buffer with target duration
  const adjustedBuffer = audioContext.createBuffer(channels, targetSamples, sampleRate);
  
  for (let channel = 0; channel < channels; channel++) {
    const sourceData = clickBuffer.getChannelData(channel);
    const targetData = adjustedBuffer.getChannelData(channel);
    
    if (currentDuration > targetDuration) {
      // Truncate - copy only the beginning
      const sourceSamples = Math.floor(targetDuration * sampleRate);
      targetData.set(sourceData.subarray(0, sourceSamples));
    } else {
      // Extend - loop the audio to fill target duration
      let writePos = 0;
      while (writePos < targetSamples) {
        const remainingSamples = targetSamples - writePos;
        const copyLength = Math.min(sourceData.length, remainingSamples);
        targetData.set(sourceData.subarray(0, copyLength), writePos);
        writePos += copyLength;
      }
    }
  }
  
  return adjustedBuffer;
};

export const useBaseSpeakerAudio = (
  lat: number,
  lng: number,
  loop: ReturnType<typeof useLoop>
):
  | {
      baseSpeakers: ISpeakerData[];
      duration: number;
      baseLoop: AudioBuffer | null;
      isReady: true;
    }
  | {
      baseSpeakers: null;
      duration: null;
      baseLoop: null;
      isReady: false;
    } => {
  const { roundware, playingSpeakerIds } = useRoundware();

  const [baseSpeakers, setBaseSpeakers] = useState<ISpeakerData[]>([]);
  const [duration, setAudioDuration] = useState<number | null>(null);
  const [baseLoopWithClick, setBaseLoopWithClick] = useState<AudioBuffer | null>(null);
  const [baseLoopWithoutClick, setBaseLoopWithoutClick] = useState<AudioBuffer | null>(null);

  // Playing state is now managed by the shared context

  useEffect(() => {
    console.log('[useBaseSpeakerAudio] useEffect triggered with lat:', lat, 'lng:', lng);
    console.log('[useBaseSpeakerAudio] roundware.mixer exists:', !!roundware.mixer);
    console.log('[useBaseSpeakerAudio] roundware.speakers().length:', roundware.speakers().length);
    console.log('[useBaseSpeakerAudio] roundware.mixer.speakerEngine exists:', !!roundware.mixer?.speakerEngine);
    console.log('[useBaseSpeakerAudio] roundware.mixer.speakerEngine.speakers.length:', roundware.mixer?.speakerEngine?.speakers?.length);
    
    if (!roundware.mixer) {
      console.log('[useBaseSpeakerAudio] No roundware mixer available');
      return;
    }
    
    console.log('[useBaseSpeakerAudio] Starting audio preparation...');
    
    try {
      console.log('[useBaseSpeakerAudio] About to call roundware.mixer.initContext()');
      roundware.mixer.initContext();
      console.log('[useBaseSpeakerAudio] roundware.mixer.initContext() completed successfully');
    } catch (error) {
      console.error('[useBaseSpeakerAudio] Failed to init mixer context:', error);
      return;
    }
    
    if (!roundware.speakers().length) {
      console.log('[useBaseSpeakerAudio] No speakers available');
      return;
    }

    if (!roundware.mixer.speakerEngine?.speakers?.length) {
      console.log('[useBaseSpeakerAudio] No speaker engine speakers available');
      return;
    }

    console.log('[useBaseSpeakerAudio] Creating listener point...');
    const listenerPoint = point([lng, lat]);
    console.log('[useBaseSpeakerAudio] Listener point created:', listenerPoint);

    try {
      console.log('[useBaseSpeakerAudio] About to call updateParams...');
      roundware.mixer.speakerEngine.updateParams({
        listenerPoint,
      });
      console.log('[useBaseSpeakerAudio] updateParams completed successfully');
    } catch (error) {
      console.error('[useBaseSpeakerAudio] Failed to update speaker engine params:', error);
      return;
    }

    console.log('[useBaseSpeakerAudio] Filtering speakers...');
    const sts = roundware.mixer.speakerEngine.speakers.filter((st) => {
      return (
        st.outerBoundaryContains(listenerPoint) ||
        st.attenuationShapeContains(listenerPoint)
      );
    });

    console.log('[useBaseSpeakerAudio] Found', sts.length, 'speakers at location');

    try {
      console.log('[useBaseSpeakerAudio] About to call calculateVolumesByLocation...');
      roundware.mixer.speakerEngine.calculateVolumesByLocation();
      console.log('[useBaseSpeakerAudio] calculateVolumesByLocation completed successfully');
    } catch (error) {
      console.error('[useBaseSpeakerAudio] Failed to calculate volumes:', error);
      return;
    }

    console.log('[useBaseSpeakerAudio] Selecting base speakers...');
    let baseSpeakersTemp: any[];
    
    switch (finalConfig.speak.baseRecordingLoopSelectionMethod) {
      case "all":
        // Use the same playingSpeakerIds state that SpeakerPolygons uses
        console.debug(`Base loop selection: "all" - found ${playingSpeakerIds.size} currently playing speakers (IDs: [${Array.from(playingSpeakerIds).join(', ')}])`);
        console.debug(`Base loop selection: "all" - available speakers at location: ${sts.length} (IDs: [${sts.map(s => s.data.id).join(', ')}])`);
        
        // Filter to only currently playing speakers
        let playingSpeakers = sts.filter(speaker => 
          playingSpeakerIds.has(speaker.data.id)
        );
        
        console.debug(`Base loop selection: "all" - filtered to ${playingSpeakers.length} playing speakers at location`);
        
        // If no playing speakers found via event state, try direct audio element check as fallback
        if (playingSpeakers.length === 0 && roundware.mixer?.speakerEngine?.speakers) {
          console.debug(`Base loop selection: "all" - no playing speakers via event state, trying direct audio element check...`);
          
          const directPlayingSpeakers = sts.filter(speaker => {
            const speakerEngineSpeaker = roundware.mixer.speakerEngine.speakers.find((se: any) => se.data.id === speaker.data.id);
            if (speakerEngineSpeaker?.player?.audio) {
              const isPlaying = !speakerEngineSpeaker.player.audio.paused && !speakerEngineSpeaker.player.audio.ended;
              console.debug(`Speaker ${speaker.data.id} direct check: paused=${speakerEngineSpeaker.player.audio.paused}, ended=${speakerEngineSpeaker.player.audio.ended}, isPlaying=${isPlaying}`);
              return isPlaying;
            }
            return false;
          });
          
          if (directPlayingSpeakers.length > 0) {
            playingSpeakers = directPlayingSpeakers;
            console.debug(`Base loop selection: "all" - found ${playingSpeakers.length} playing speakers via direct audio check`);
          }
        }
        
        if (playingSpeakers.length > 0) {
          baseSpeakersTemp = playingSpeakers;
          console.debug(`Base loop selection: "all" - using ${playingSpeakers.length} currently playing speakers`);
        } else {
          // Fallback to topAncestor if no speakers are playing
          const topAncestor = findTopAncestorSpeaker(sts);
          baseSpeakersTemp = topAncestor ? [topAncestor] : sts;
          console.warn(`Base loop selection: "all" - no speakers currently playing, falling back to topAncestor: ${topAncestor?.data?.id}, using ${baseSpeakersTemp.length} speakers`);
        }
        break;
      case "topAncestor":
        const topAncestor = findTopAncestorSpeaker(sts);
        baseSpeakersTemp = topAncestor ? [topAncestor] : sts;
        console.debug(`Base loop selection: "topAncestor" - found top ancestor: ${topAncestor?.data?.id}, using ${baseSpeakersTemp.length} speakers`);
        if (!topAncestor && sts.length > 0) {
          console.warn(`No top ancestor found, falling back to first available speaker`);
          baseSpeakersTemp = [sts[0]];
        }
        break;
      case "oldest":
      default:
        baseSpeakersTemp = [roundware.mixer.speakerEngine.latestBaseTrack];
        console.debug(`Base loop selection: "oldest" - using latest base track`);
        break;
    }

    if (!baseSpeakersTemp.length) {
      console.error('[useBaseSpeakerAudio] No base speakers selected');
      return;
    }

    console.log('[useBaseSpeakerAudio] Starting async audio preparation with', baseSpeakersTemp.length, 'speakers');
    console.log('[useBaseSpeakerAudio] About to enter async function...');

    (async () => {
      console.log('[useBaseSpeakerAudio] Async function started');
      try {
        // Ensure AudioContext is ready for mobile Safari
        console.log('[useBaseSpeakerAudio] Checking AudioContext state:', loop.audioContext.current.state);
        if (loop.audioContext.current.state === 'suspended') {
          console.log('[useBaseSpeakerAudio] AudioContext is suspended, attempting to resume...');
          try {
            await loop.audioContext.current.resume();
            console.log('[useBaseSpeakerAudio] AudioContext resumed successfully');
          } catch (error) {
            console.error('[useBaseSpeakerAudio] Failed to resume AudioContext:', error);
            // Continue anyway - some operations might still work
          }
        }

        let finalBuffer: AudioBuffer;
        let bufferWithClick: AudioBuffer | null = null;
        let bufferWithoutClick: AudioBuffer | null = null;

        if (baseSpeakersTemp.length > 1) {
          console.log('[useBaseSpeakerAudio] Loading multiple speaker buffers...');
          
          // Load all speaker audio buffers
          const speakerBuffers = await Promise.all(
            baseSpeakersTemp.map(async (st: any, index: number) => {
              try {
                const uri = (st as { uri: string }).uri;
                console.log(`[useBaseSpeakerAudio] Loading speaker ${index + 1}/${baseSpeakersTemp.length}:`, uri);
                
                const buffer = await getSpeakerAudioBuffer(uri, loop.audioContext.current);
                const volume = (
                  st as {
                    volumeByLocation: (arg0: any) => number;
                  }
                ).volumeByLocation(listenerPoint.geometry);
                
                console.log(`[useBaseSpeakerAudio] Speaker ${index + 1} loaded successfully, volume:`, volume);
                
                return {
                  buffer,
                  volume,
                  type: 'speaker' as const,
                };
              } catch (error) {
                console.error(`[useBaseSpeakerAudio] Failed to load speaker ${index + 1}:`, error);
                throw error;
              }
            })
          );

          console.log('[useBaseSpeakerAudio] All speaker buffers loaded, processing...');

          // Load click track buffer if enabled
          let clickTrackBuffer: { buffer: AudioBuffer; volume: number; type: 'click' } | null = null;
          if (finalConfig.speak.clickTrack.enabled) {
            try {
              console.log('[useBaseSpeakerAudio] Loading click track...');
              const clickBuffer = await getClickTrackBuffer(
                speakerBuffers[0].buffer.duration,
                loop.audioContext.current
              );
              if (clickBuffer) {
                // Use configurable balance ratio for click track volume
                const clickVolume = finalConfig.speak.clickTrack.volume * finalConfig.speak.clickTrack.balanceRatio;
                
                clickTrackBuffer = {
                  buffer: clickBuffer,
                  volume: clickVolume,
                  type: 'click' as const,
                };
                console.log('[useBaseSpeakerAudio] Click track loaded successfully');
              }
            } catch (error) {
              console.error(`Error loading click track:`, error);
            }
          }

          // Create version without click track (just speakers, no click track)
          console.log('[useBaseSpeakerAudio] Creating buffer without click...');
          const bufferWithoutClick = speakerBuffers.reduce(
            (acc: AudioBuffer, { buffer, volume }: any) => {
              const ratio = volume / speakerBuffers.reduce((sum, { volume }) => sum + volume, 0);
              const normalizedRatio = Math.max(0.1, Math.min(1.0, ratio * 5));
              
              const mixed = mix(acc, buffer, (a: number, b: number) => {
                return a + b * normalizedRatio;
              });
              return mixed;
            },
            loop.audioContext.current.createBuffer(
              speakerBuffers[0].buffer.numberOfChannels,
              speakerBuffers[0].buffer.length,
              speakerBuffers[0].buffer.sampleRate
            )
          );

          // Create version with click track
          console.log('[useBaseSpeakerAudio] Creating buffer with click...');
          const allAudioSources = clickTrackBuffer 
            ? [...speakerBuffers, clickTrackBuffer]
            : speakerBuffers;

          const totalVolume = allAudioSources.reduce(
            (acc: number, { volume }: any) => acc + volume,
            0
          );

          const bufferWithClick = allAudioSources.reduce(
            (acc: AudioBuffer, { buffer, volume }: any) => {
              const ratio = volume / totalVolume;
              const normalizedRatio = Math.max(0.1, Math.min(1.0, ratio * 5));
              
              const mixed = mix(acc, buffer, (a: number, b: number) => {
                return a + b * normalizedRatio;
              });
              return mixed;
            },
            loop.audioContext.current.createBuffer(
              1, // Force mono for looping recording
              allAudioSources[0].buffer.length,
              allAudioSources[0].buffer.sampleRate
            )
          );

          // Store both versions
          setBaseLoopWithClick(bufferWithClick);
          setBaseLoopWithoutClick(bufferWithoutClick);
          
          // Use the version with click for the main buffer (for recording)
          finalBuffer = bufferWithClick;

        } else {
          console.log('[useBaseSpeakerAudio] Loading single speaker buffer...');
          
          // Single speaker case - create both with and without click track
          const speakerUri = (baseSpeakersTemp[0] as any as { uri: string }).uri;
          console.log('[useBaseSpeakerAudio] Loading speaker URI:', speakerUri);
          
          const speakerBuffer = await getSpeakerAudioBuffer(speakerUri, loop.audioContext.current);
          console.log('[useBaseSpeakerAudio] Single speaker buffer loaded successfully');
          
          // Create version without click track (balanceRatio = 0.0)
          // Create a copy of the speaker buffer to avoid modifying the original
          const speakerBufferCopy1 = loop.audioContext.current.createBuffer(
            1, // Force mono for looping recording
            speakerBuffer.length,
            speakerBuffer.sampleRate
          );
          // Copy the speaker buffer data and convert to mono
          const copyData = speakerBufferCopy1.getChannelData(0);
          if (speakerBuffer.numberOfChannels === 1) {
            // Already mono, just copy
            const originalData = speakerBuffer.getChannelData(0);
            copyData.set(originalData);
          } else {
            // Convert stereo to mono by averaging channels
            const leftData = speakerBuffer.getChannelData(0);
            const rightData = speakerBuffer.getChannelData(1);
            for (let i = 0; i < speakerBuffer.length; i++) {
              copyData[i] = (leftData[i] + rightData[i]) / 2;
            }
          }
          
          bufferWithoutClick = speakerBufferCopy1;
          if (finalConfig.speak.clickTrack.enabled) {
            try {
              console.log('[useBaseSpeakerAudio] Loading click track for single speaker...');
              const clickTrackBuffer = await getClickTrackBuffer(
                speakerBuffer.duration,
                loop.audioContext.current
              );
              if (clickTrackBuffer) {
                // Use balanceRatio = 0.0 to effectively silence the click track
                bufferWithoutClick = mix(speakerBufferCopy1, clickTrackBuffer, 0.0);
                console.log('[useBaseSpeakerAudio] Click track mixed into buffer without click');
              }
            } catch (error) {
              console.error(`Error creating version without click track:`, error);
            }
          }
          
          // Create version with click track (speaker audio + click track)
          // Create another copy of the speaker buffer
          const speakerBufferCopy2 = loop.audioContext.current.createBuffer(
            1, // Force mono for looping recording
            speakerBuffer.length,
            speakerBuffer.sampleRate
          );
          // Copy the speaker buffer data and convert to mono
          const copyData2 = speakerBufferCopy2.getChannelData(0);
          if (speakerBuffer.numberOfChannels === 1) {
            // Already mono, just copy
            const originalData = speakerBuffer.getChannelData(0);
            copyData2.set(originalData);
          } else {
            // Convert stereo to mono by averaging channels
            const leftData = speakerBuffer.getChannelData(0);
            const rightData = speakerBuffer.getChannelData(1);
            for (let i = 0; i < speakerBuffer.length; i++) {
              copyData2[i] = (leftData[i] + rightData[i]) / 2;
            }
          }
          
          bufferWithClick = speakerBufferCopy2;
          if (finalConfig.speak.clickTrack.enabled) {
            try {
              const clickTrackBuffer = await getClickTrackBuffer(
                speakerBuffer.duration,
                loop.audioContext.current
              );
              if (clickTrackBuffer) {
                // Use configurable balance ratio for click track mixing
                bufferWithClick = mix(speakerBufferCopy2, clickTrackBuffer, finalConfig.speak.clickTrack.balanceRatio);
                console.log('[useBaseSpeakerAudio] Click track mixed into buffer with click');
              }
            } catch (error) {
              console.error(`Error adding click track:`, error);
            }
          }
          
          // Store both versions
          setBaseLoopWithClick(bufferWithClick);
          setBaseLoopWithoutClick(bufferWithoutClick);
          
          // Use the version with click for the main buffer (for recording)
          finalBuffer = bufferWithClick;
        }

        console.log('[useBaseSpeakerAudio] Audio preparation complete, setting buffers...');

        // Use the local buffer variables directly instead of waiting for state updates
        if (bufferWithClick && bufferWithoutClick) {
          loop.setSpeakerBuffers(bufferWithClick, bufferWithoutClick);
          console.log('[useBaseSpeakerAudio] Speaker buffers set successfully');
        } else {
          // Fallback for backward compatibility
          loop.speakerAudioBuffer.current = finalBuffer;
          console.log('[useBaseSpeakerAudio] Using fallback speaker buffer');
        }

        setBaseSpeakers(baseSpeakersTemp.map((s: any) => s?.data as ISpeakerData));
        loop.setIsLoading(false);
        setAudioDuration(finalBuffer.duration);
        
        console.log('[useBaseSpeakerAudio] Audio preparation completed successfully');
      } catch (error) {
        console.error('[useBaseSpeakerAudio] Error during audio preparation:', error);
        // Set loading to false even on error to prevent infinite loading
        loop.setIsLoading(false);
      }
    })();
  }, [lat, lng, roundware]);

  if (baseSpeakers.length === 0 || duration == null) {
    return {
      baseSpeakers: null,
      duration: null,
      baseLoop: null,
      isReady: false,
    };
  }

  return {
    baseSpeakers,
    duration,
    baseLoop: baseLoopWithClick,
    isReady: true,
  };
};

function mix(
  bufferA: AudioBuffer,
  bufferB: AudioBuffer,
  ratio?:
    | number
    | ((a: number, b: number, i: number, channel: number) => number),
  offset?: number
): AudioBuffer {
  if (ratio == null) ratio = 0.5;
  var fn =
    ratio instanceof Function
      ? ratio
      : function (a: number, b: number) {
          return a * (1 - (ratio as number)) + b * (ratio as number);
        };

  if (offset == null) offset = 0;
  else if (offset < 0) offset += bufferA.length;

  for (var channel = 0; channel < bufferA.numberOfChannels; channel++) {
    var aData = bufferA.getChannelData(channel);
    var bData = bufferB.getChannelData(channel);

    for (
      var i = offset, j = 0;
      i < bufferA.length && j < bufferB.length;
      i++, j++
    ) {
      aData[i] = fn.call(bufferA, aData[i], bData[j], j, channel);
    }
  }

  return bufferA;
}
