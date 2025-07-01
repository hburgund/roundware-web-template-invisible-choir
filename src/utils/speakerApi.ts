import Roundware from 'roundware-web-framework';

/**
 * Updates a speaker's fill color via PATCH API with retry logic
 * @param roundware - The Roundware instance
 * @param speakerId - ID of the speaker to update
 * @param fillColor - The fill color to set
 * @returns Promise that resolves when the update is complete
 */
export async function updateSpeakerFillColor(
  roundware: Roundware,
  speakerId: number,
  fillColor: string
): Promise<void> {
  const maxRetries = 1;
  let attempts = 0;

  const attemptPatch = async (): Promise<void> => {
    try {
      const response = await roundware.apiClient.patch(
        `/speakers/${speakerId}/`,
        { fill_color: fillColor }
      );
      console.info(`Successfully updated speaker ${speakerId} fill_color to ${fillColor}:`, response);
    } catch (error) {
      attempts++;
      console.error(`Failed to update speaker ${speakerId} fill_color (attempt ${attempts}):`, error);
      
      if (attempts <= maxRetries) {
        console.info(`Retrying speaker ${speakerId} color update...`);
        await attemptPatch();
      } else {
        console.error(`Giving up on updating speaker ${speakerId} fill_color after ${attempts} attempts`);
        // Don't throw - we want the app to continue working even if color persistence fails
      }
    }
  };

  await attemptPatch();
}

/**
 * Updates a speaker's colors via PATCH API with retry logic
 * @param roundware - The Roundware instance
 * @param speakerId - ID of the speaker to update
 * @param colors - Object containing fill_color and/or border_color
 * @returns Promise that resolves when the update is complete
 */
export async function updateSpeakerColors(
  roundware: Roundware,
  speakerId: number,
  colors: { fill_color?: string; border_color?: string }
): Promise<void> {
  const maxRetries = 1;
  let attempts = 0;

  const attemptPatch = async (): Promise<void> => {
    try {
      const response = await roundware.apiClient.patch(
        `/speakers/${speakerId}/`,
        colors
      );
      console.info(`Successfully updated speaker ${speakerId} colors:`, colors, response);
    } catch (error) {
      attempts++;
      console.error(`Failed to update speaker ${speakerId} colors (attempt ${attempts}):`, error);
      
      if (attempts <= maxRetries) {
        console.info(`Retrying speaker ${speakerId} colors update...`);
        await attemptPatch();
      } else {
        console.error(`Giving up on updating speaker ${speakerId} colors after ${attempts} attempts`);
        // Don't throw - we want the app to continue working even if color persistence fails
      }
    }
  };

  await attemptPatch();
} 