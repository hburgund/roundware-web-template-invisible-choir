import { Feature, MultiPolygon, multiPolygon, Polygon } from "@turf/helpers";
import { circle } from "@turf/turf";
import transformScale from "@turf/transform-scale";
import finalConfig from "@/config";
import { useRoundware, useRoundwareDraft } from "@/hooks/index";
import moment from "moment";
import { useState } from "react";
import { useHistory } from "react-router";
import { IAssetData } from "roundware-web-framework";
import { ITag } from "roundware-web-framework";
import { ISpeakerData } from "roundware-web-framework";
import { generateBeechLeafShape } from "@/utils/speakerShapes";
import { getNewSpeakerColorPair } from "@/utils/colors";

// Enhanced error types for better user feedback
interface SubmissionError {
  type: 'network' | 'server' | 'validation' | 'unknown';
  message: string;
  originalError?: any;
  retryable: boolean;
}

// Utility function for exponential backoff retry logic
const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await operation();
      
      // If we get here, the operation succeeded
      if (attempt > 0) {
        console.log(`Speaker creation succeeded on attempt ${attempt + 1}`);
      }
      
      return result;
    } catch (error) {
      lastError = error;
      
      console.log(`Speaker creation attempt ${attempt + 1} failed:`, error);
      
      // Don't retry on validation errors (4xx except 408, 429)
      if ((error as any)?.status && (error as any).status >= 400 && (error as any).status < 500 && 
          (error as any).status !== 408 && (error as any).status !== 429) {
        console.log(`Not retrying due to validation error (${(error as any).status})`);
        throw error;
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries - 1) {
        console.log(`All ${maxRetries} attempts failed, giving up`);
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Speaker creation attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

// Utility function to classify and format errors for user display
const classifyError = (error: any): SubmissionError => {
  const errorStatus = (error as any)?.status;
  const errorName = (error as any)?.name;
  const errorMessage = (error as any)?.message;
  
  // Network/connectivity errors (including RoundwareConnectionError)
  if (!errorStatus || errorName === 'TypeError' || errorName === 'RoundwareConnectionError' || 
      errorMessage?.includes('fetch') || errorMessage?.includes('unable to connect') ||
      errorMessage?.includes('network') || errorMessage?.includes('timeout')) {
    return {
      type: 'network',
      message: 'Unable to connect to the server. Please check your internet connection and try again.',
      originalError: error,
      retryable: true
    };
  }
  
  // Server errors (5xx) - these are retryable
  if (errorStatus >= 500) {
    return {
      type: 'server',
      message: 'The server is experiencing issues. Please try again in a few moments.',
      originalError: error,
      retryable: true
    };
  }
  
  // Client/validation errors (4xx) - most are NOT retryable
  if (errorStatus >= 400 && errorStatus < 500) {
    let message = 'There was an issue with your recording submission.';
    
    switch (errorStatus) {
      case 400:
        message = 'Your recording data appears to be invalid. Please try recording again.';
        break;
      case 401:
        message = 'You are not authorized to create speakers. Please refresh the page and try again.';
        break;
      case 403:
        message = 'You do not have permission to create speakers in this location.';
        break;
      case 408:
        message = 'The upload took too long. Please try again with a stable internet connection.';
        break;
      case 413:
        message = 'Your recording file is too large. Please try recording a shorter clip.';
        break;
      case 422:
        message = 'Your recording could not be processed. Please try recording again.';
        break;
      case 429:
        message = 'Too many requests. Please wait a moment before trying again.';
        break;
      default:
        message = `Upload failed (Error ${errorStatus}). Please try again.`;
    }
    
    // Only retry on timeout (408) and rate limit (429) errors
    const retryable = errorStatus === 408 || errorStatus === 429;
    
    return {
      type: 'validation',
      message,
      originalError: error,
      retryable
    };
  }
  
  // Unknown errors - assume retryable unless we can determine otherwise
  return {
    type: 'unknown',
    message: 'An unexpected error occurred. Please try again.',
    originalError: error,
    retryable: true
  };
};

// hook to handle saving of the recording to server
export const useSubmission = ({
  location,
  recordedAudioBlob,
  baseSpeakers,
}: {
  location: { lat: number; lng: number };
  recordedAudioBlob: Blob | null;
  baseSpeakers: ISpeakerData[];
}) => {
  const [status, setStatus] = useState<
    "idle" | "submitting" | "submitted" | "error"
  >("idle");
  
  // Enhanced error state with more detail for UI
  const [errorDetails, setErrorDetails] = useState<SubmissionError | null>(null);

  const draftRecording = useRoundwareDraft();
  const { tagLookup, roundware, updateSpeakers } = useRoundware();
  const history = useHistory();

  async function start() {
    if (!recordedAudioBlob) {
      return;
    }
    
    // Prevent multiple simultaneous submissions
    if (status === "submitting") {
      console.log("Submission already in progress, ignoring duplicate start() call");
      return;
    }
    
    // stop the audio

    setStatus("submitting");
    setErrorDetails(null);

    if (!finalConfig.speak.uploadAsSpeaker) {
      // upload as ASSET:

      const selected_tags = draftRecording.tags
        .map((tag) => tagLookup[tag])
        .filter((tag) => tag !== undefined);
      // include default speak tags
      const finalTags = selected_tags
        .map((t) => t?.tag_id)
        .filter((t) => t !== undefined) as number[];
      finalConfig.speak.defaultSpeakTags?.forEach((t) => {
        if (!finalTags.includes(t)) {
          finalTags.push(t);
        }
      });

      const tags = await roundware.apiClient.get<ITag[]>("/tags", {
        project_id: roundware.project.projectId,
      });

      const speakerTag = tags.find(
        // @ts-ignore
        (t) => t.value == selectedSpeakerId.current?.toString()
      )?.id as number;

      if (speakerTag) {
        finalTags.push(speakerTag);
      }

      const assetMeta = {
        longitude: location.lng,
        latitude: location.lat,
        ...(finalTags.length > 0 ? { tag_ids: finalTags } : {}),
      };
      const dateStr = new Date().toISOString();

      // Make an envelope to hold the uploaded assets.
      const envelope = await roundware.makeEnvelope();
      try {
        let asset: Partial<IAssetData> | null = null;
        // hold all promises for parallel execution
        const promises = [];
        // Add the audio asset.

        promises.push(
          (async () => {
            asset = await envelope.upload(
              recordedAudioBlob,
              dateStr + ".mp3",
              assetMeta
            );
          })()
        );
        await Promise.all(promises);
        setStatus("submitted");
        history.push(`/listen?eid=${envelope._envelopeId}`);
      } catch (err) {
        const errorInfo = classifyError(err);
        setErrorDetails(errorInfo);
        setStatus("error");
      }
    } else {
      try {
        let speakerShape: Feature<MultiPolygon> | null = null;

        if (finalConfig.speak.speakerShape === "circle") {
          speakerShape = multiPolygon([
            circle([location.lng, location.lat], 10, {
              units: "meters",
            }).geometry.coordinates,
          ]);
        } else if (finalConfig.speak.speakerShape === "beechLeaf") {
          speakerShape = generateBeechLeafShape(location, {
            minSize: 5,
            maxSize: 5,
          });
        }

        if (!speakerShape) {
          throw new Error(
            "Speaker shape is not defined. Please check the config."
          );
        }

        // Add cascading colors based on parent speakers (or random from config if no parents)
        const colorPair = getNewSpeakerColorPair(baseSpeakers);
        
        if (finalConfig.debugMode) {
          console.log("Speaker color selection:", {
            parentCount: baseSpeakers.length,
            parentColors: baseSpeakers.map(s => ({ id: s.id, fill_color: s.fill_color, border_color: s.border_color })),
            selectedColors: colorPair
          });
        }
        
        // Enhanced speaker creation with retry logic
        const response = await retryWithBackoff<{ id: string }>(async () => {
          console.log("Making speaker creation API call...");
          
          // Create fresh FormData for each attempt (FormData can be consumed after first use)
          const attemptFormData = new FormData();
          attemptFormData.append("activeyn", "true");
          attemptFormData.append("code", moment().format("DDMMYYHHmm"));
          attemptFormData.append("maxvolume", "1.0");
          attemptFormData.append("minvolume", "0.0");
          attemptFormData.append("shape", JSON.stringify(speakerShape.geometry));
          attemptFormData.append("fill_color", colorPair.fill_color);
          if (colorPair.border_color) {
            attemptFormData.append("border_color", colorPair.border_color);
          }
          attemptFormData.append("file", recordedAudioBlob);
          attemptFormData.append("attenuation_distance", "2");
          attemptFormData.append("project_id", finalConfig.project.id.toString());
          if (baseSpeakers.length > 0) {
            baseSpeakers.forEach((speaker) => {
              attemptFormData.append("parents", speaker.id.toString());
            });
          }
          
          const result: any = await roundware.apiClient.post(
            "/speakers/",
            attemptFormData,
            {
              method: "POST",
              contentType: "multipart/form-data",
            }
          );
          
          // Validate response structure
          if (!result || (typeof result.id !== 'string' && typeof result.id !== 'number')) {
            console.error("Invalid response structure:", result);
            throw new Error("Invalid response from server - missing speaker ID");
          }
          
          console.log("Speaker created successfully with ID:", result.id);
          return { id: result.id.toString() };
        }, 3, 5000);

        console.log("Speaker creation completed successfully:", JSON.stringify(response, null, 2));
        
        // Update parent speakers (this part can fail without breaking the main flow)
        try {
          if (response && baseSpeakers.length > 0) {
            await Promise.all(
              baseSpeakers.map(async (s) => {
                if (!s.shape) return;
                // Ensure closestSpeaker.shape is defined and valid
                const expandedShape = transformScale(
                  { type: "Feature", geometry: s.shape, properties: {} },
                  finalConfig.speak.speakerShapeScale
                ) as Feature<MultiPolygon>;

                if (expandedShape) {
                  // Patch the closest speaker's shape
                  const patchResponse = await roundware.apiClient.patch(
                    `/speakers/${s.id}/`,
                    {
                      shape: expandedShape.geometry,
                    }
                  );

                  console.info("Parent speaker updated:", patchResponse);
                } else {
                  console.error("Failed to expand parent speaker shape");
                }
              })
            );
          }
        } catch (error) {
          console.error("Error updating parent speaker shapes (non-critical):", error);
          // Don't fail the whole submission for parent speaker update errors
        }

        // Update speakers on the map to show the new speaker and modified parent speakers
        const speakerIdsToUpdate = [
          parseInt(response.id), // New speaker
          ...baseSpeakers.map(s => s.id) // Parent speakers that were modified
        ];
        
        console.log("Updating speakers after recording submission:", speakerIdsToUpdate);
        
        try {
          await updateSpeakers(speakerIdsToUpdate);
          console.log("Successfully updated speakers after recording submission");
        } catch (error) {
          console.error("Failed to update speakers after recording submission (non-critical):", error);
          // Don't fail the submission for speaker update errors
        }

        setStatus("submitted");
        
      } catch (error) {
        console.error("Speaker creation failed:", error);
        const errorInfo = classifyError(error);
        setErrorDetails(errorInfo);
        setStatus("error");
      }
    }
  }

  const reset = () => {
    setStatus("idle");
    setErrorDetails(null);
  };

  return {
    status,
    start,
    reset,
    errorDetails, // Expose detailed error info for UI
  };
};
