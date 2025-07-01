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
import { getRandomSpeakerColorPair } from "@/utils/colors";

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

  const draftRecording = useRoundwareDraft();
  const { tagLookup, roundware, updateSpeakers } = useRoundware();
  const history = useHistory();

  async function start() {
    if (!recordedAudioBlob) {
      return;
    }
    // stop the audio

    setStatus("submitting");

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
        setStatus("error");
      }
    } else {
      let speakerShape: Feature<MultiPolygon> | null = null;

      if (finalConfig.speak.speakerShape === "circle") {
        speakerShape = multiPolygon([
          circle([location.lng, location.lat], 10, {
            units: "meters",
          }).geometry.coordinates,
        ]);
      } else if (finalConfig.speak.speakerShape === "beechLeaf") {
        speakerShape = generateBeechLeafShape(location, {
          minSize: 10,
          maxSize: 30,
        });
      }

      if (!speakerShape) {
        throw new Error(
          "Speaker shape is not defined. Please check the config."
        );
      }

      const formData = new FormData();
      formData.append("activeyn", "true");
      formData.append("code", moment().format("DDMMYYHHmm"));
      formData.append("maxvolume", "1.0");
      formData.append("minvolume", "0.0");
      formData.append("shape", JSON.stringify(speakerShape.geometry));

      // Add random colors from config (fill and optionally border)
      const colorPair = getRandomSpeakerColorPair();
      formData.append("fill_color", colorPair.fill_color);
      if (colorPair.border_color) {
        formData.append("border_color", colorPair.border_color);
      }

      formData.append("file", recordedAudioBlob);
      formData.append("attenuation_distance", "5");
      formData.append("project_id", finalConfig.project.id.toString());
      if (baseSpeakers.length > 0) {
        baseSpeakers.forEach((speaker) => {
          formData.append("parents", speaker.id.toString());
        });
      }

      const response: { id: string } = await roundware.apiClient.post(
        "/speakers/",
        formData,
        {
          method: "POST",
          contentType: "multipart/form-data",
        }
      );

      console.info("Response: " + JSON.stringify(response, null, 2));

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

                console.info("Patch response:", patchResponse);
                console.info("Closest speaker shape updated successfully");
              } else {
                console.error("Failed to expand closestSpeaker shape");
              }
            })
          );
        } else {
          console.error("Invalid response or closestSpeaker data");
        }
      } catch (error) {
        console.error("Error updating closest speaker shape:", error);
      }

      if (!response) {
        setStatus("error");
        return;
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
        console.error("Failed to update speakers after recording submission:", error);
      }

      // Remove automatic navigation - let the user control when to proceed via the thank you dialog
      // history.push(
      //   `/listen?latitude=${location.lat}&longitude=${location.lng}`
      // );

      setStatus("submitted");
    }
  }

  return {
    status,
    start,
  };
};
