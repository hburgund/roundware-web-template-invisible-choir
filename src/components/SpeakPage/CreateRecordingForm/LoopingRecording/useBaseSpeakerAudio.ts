import { point } from "@turf/helpers";
import finalConfig from "@/config";
import { useRoundware } from "@/hooks/index";
import { useEffect, useState } from "react";
import { useLoop } from "./useLoop";
import { ISpeakerData } from "roundware-web-framework";

const getSpeakerAudioBuffer = async (
  uri: string,
  audioContext: AudioContext
) => {
  const response = await fetch(uri);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = await audioContext.decodeAudioData(arrayBuffer);
  return buffer;
};

// Automatically discover all WAV files in the click track directory at build time
const getClickTrackFiles = () => {
  try {
    // Use Vite's import.meta.glob to find all .wav files in the audio directory
    const audioFiles = import.meta.glob('/src/assets/audio/*.wav', { eager: false });
    
    // Extract just the filenames from the full paths
    return Object.keys(audioFiles).map(path => path.split('/').pop()!);
  } catch (error) {
    console.debug('Could not auto-discover click track files, using fallback list:', error);
    // Fallback to manual list if import.meta.glob fails
    return ['click-84.wav'];
  }
};

const getClickTrackBuffer = async (
  targetDuration: number,
  audioContext: AudioContext
): Promise<AudioBuffer | null> => {
  if (!finalConfig.speak.clickTrack.enabled) return null;
  
  const clickDirectory = finalConfig.speak.clickTrack.directory;
  const tolerance = 0.2; // 200ms tolerance
  
  // Automatically discover all WAV files in the directory
  const clickFiles = getClickTrackFiles();
  console.debug(`Available click track files:`, clickFiles);
  
  for (const filename of clickFiles) {
    try {
      const clickFilePath = `${clickDirectory}${filename}`;
      console.debug(`Trying click track: ${clickFilePath}`);
      
      const response = await fetch(clickFilePath);
      if (!response.ok) continue;
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = await audioContext.decodeAudioData(arrayBuffer);
      const clickDuration = buffer.duration;
      
      console.debug(`Click file ${filename}: ${clickDuration}s, target: ${targetDuration}s`);
      
      // Check if this click file duration matches our target (within tolerance)
      if (Math.abs(clickDuration - targetDuration) <= tolerance) {
        console.debug(`Found matching click track: ${filename} (${clickDuration}s ≈ ${targetDuration}s)`);
        
        // If it's close enough, use it as-is or adjust slightly
        return adjustClickTrackDuration(buffer, targetDuration, audioContext);
      }
    } catch (error) {
      console.debug(`Failed to load ${filename}:`, error);
      continue;
    }
  }
  
  console.debug(`No click track found matching ${targetDuration}s duration (±${tolerance}s) from ${clickFiles.length} available files`);
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
  
  console.debug(`Adjusted click track from ${currentDuration}s to ${targetDuration}s`);
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
      isReady: true;
    }
  | {
      baseSpeakers: null;
      duration: null;
      isReady: false;
    } => {
  const { roundware } = useRoundware();

  const [baseSpeakers, setBaseSpeakers] = useState<ISpeakerData[]>([]);

  const [duration, setAudioDuration] = useState<number | null>(null);

  useEffect(() => {
    if (!roundware.mixer) return;
    roundware.mixer.initContext();
    if (!roundware.speakers().length) return;

    if (!roundware.mixer.speakerEngine?.speakers?.length) return;

    const listenerPoint = point([lng, lat]);

    roundware.mixer.speakerEngine.updateParams({
      listenerPoint,
    });

    const sts = roundware.mixer.speakerEngine.speakers.filter((st) => {
      return (
        st.outerBoundaryContains(listenerPoint) ||
        st.attenuationShapeContains(listenerPoint)
      );
    });

    roundware.mixer.speakerEngine.calculateVolumesByLocation();

    let baseSpeakersTemp =
      finalConfig.speak.baseRecordingLoopSelectionMethod === "all"
        ? sts
        : [roundware.mixer.speakerEngine.latestBaseTrack];

    (async () => {
      let finalBuffer: AudioBuffer;

      if (baseSpeakersTemp.length > 1) {
        const audioBuffers = await Promise.all(
          baseSpeakersTemp.map(async (st: any) => {
            return {
              buffer: await getSpeakerAudioBuffer(
                (
                  st as {
                    uri: string;
                  }
                ).uri,
                loop.audioContext.current
              ),
              volume: (
                st as {
                  volumeByLocation: (arg0: any) => number;
                }
              ).volumeByLocation(listenerPoint.geometry),
            };
          })
        );

        const totalVolume = audioBuffers.reduce(
          (acc: number, { volume }: any) => acc + volume,
          0
        );

        // mix the audio buffers based on volume of each speaker
        finalBuffer = audioBuffers.reduce(
          (acc: AudioBuffer, { buffer, volume }: any) => {
            const ratio = volume / totalVolume;
            console.debug(`Mixing volume ${volume} buffer with ratio:`, ratio);
            const mixed = mix(acc, buffer, (a: number, b: number) => {
              return a * 1 + b * (ratio as number);
            });
            return mixed;
          },
          // create an empty buffer with the same length and sample rate as the first buffer
          loop.audioContext.current.createBuffer(
            audioBuffers[0].buffer.numberOfChannels,
            audioBuffers[0].buffer.length,
            audioBuffers[0].buffer.sampleRate
          )
        );
      } else {
        finalBuffer = await getSpeakerAudioBuffer(
          (
            baseSpeakersTemp[0] as any as {
              uri: string;
            }
          ).uri,
          loop.audioContext.current
        );
      }

      // Add click track to the base loop
      const clickTrackBuffer = await getClickTrackBuffer(
        finalBuffer.duration,
        loop.audioContext.current
      );
      
      if (clickTrackBuffer) {
        console.debug(`Adding click track to base loop (volume: ${finalConfig.speak.clickTrack.volume})`);
        finalBuffer = mix(finalBuffer, clickTrackBuffer, finalConfig.speak.clickTrack.volume);
      }

      loop.speakerAudioBuffer.current = finalBuffer;

      setBaseSpeakers(baseSpeakersTemp.map((s: any) => s?.data as ISpeakerData));
      loop.setIsLoading(false);
      setAudioDuration(finalBuffer.duration);
    })();
  }, [lat, lng, roundware]);

  if (baseSpeakers.length === 0 || duration == null) {
    return {
      baseSpeakers: null,
      duration: null,
      isReady: false,
    };
  }
  console.debug("baseSpeakers", baseSpeakers);
  return {
    baseSpeakers,
    duration,
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
