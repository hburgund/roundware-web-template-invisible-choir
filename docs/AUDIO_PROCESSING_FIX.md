# Audio Processing Fix for Volume Jumps and Dips

## Problem Identified

Recordings were experiencing weird jumps and dips in volume, which was caused by browser audio processing being enabled by default. This included:

- **Auto Gain Control (AGC)** - Automatically adjusts microphone gain
- **Noise Suppression** - Filters out background noise
- **Echo Cancellation** - Removes echo and feedback
- **Google-specific audio processing** - Additional Chrome/Chromium-based processing

## Root Causes

1. **Inconsistent Audio Constraints**: Different recording components used different `getUserMedia` constraints
2. **Default Browser Processing**: Using `{ audio: true }` enables all browser audio processing
3. **Incomplete Constraints**: Some `getUserMedia` calls in looping recording only disabled `echoCancellation` but left other processing enabled
4. **Real-time Effects**: The app has a real-time audio processing system (currently disabled but could be re-enabled)

## Solution Implemented

### 1. Created Centralized Audio Constraints Utility

Added `getCleanAudioConstraints()` function in `src/utils/index.ts`:

```typescript
export const getCleanAudioConstraints = () => ({
  audio: {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    googEchoCancellation: false,
    googAutoGainControl: false,
    googNoiseSuppression: false,
    googHighpassFilter: false,
    googTypingNoiseDetection: false,
    googBeamforming: false,
    googArrayGeometry: false,
    googAudioMirroring: false,
    googDAEchoCancellation: false,
    googNoiseReduction: false
  }
});
```

### 2. Updated All Recording Components

Modified the following files to use clean audio constraints:

- `src/components/SpeakPage/CreateRecordingForm/LoopingRecording/useRecorder.ts`
- `src/components/SpeakPage/CreateRecordingForm/useCreateRecording.ts`
- `src/components/SpeakPage/CreateRecordingForm/LoopingRecording/components/JoinChoir.tsx`

### 3. Fixed Incomplete Constraints in Looping Recording

**Critical Fix**: Found that looping recording had some `getUserMedia` calls that only disabled `echoCancellation: false` but left other audio processing enabled:

```typescript
// BEFORE (incomplete - could cause volume issues):
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    echoCancellation: false,  // Only this was disabled!
  },
});

// AFTER (complete - all processing disabled):
const stream = await navigator.mediaDevices.getUserMedia(getCleanAudioConstraints());
```

This was likely the **main culprit** for volume jumps in looping recording, as `autoGainControl` and other processing were still enabled.

### 4. Benefits of These Changes

- **Consistent Audio Quality**: All recordings now use the same audio processing settings
- **No Volume Jumps**: Disabled AGC prevents automatic gain adjustments
- **No Noise Filtering**: Disabled noise suppression preserves original audio characteristics
- **No Echo Cancellation**: Prevents unwanted audio artifacts
- **Cross-browser Compatibility**: Includes both standard and Google-specific constraints

## Technical Details

### Standard Constraints
- `echoCancellation: false` - Disables echo cancellation
- `noiseSuppression: false` - Disables noise suppression
- `autoGainControl: false` - Disables automatic gain control

### Google-specific Constraints (Chrome/Chromium)
- `googEchoCancellation: false` - Chrome's echo cancellation
- `googAutoGainControl: false` - Chrome's auto gain control
- `googNoiseSuppression: false` - Chrome's noise suppression
- `googHighpassFilter: false` - Chrome's high-pass filter
- `googTypingNoiseDetection: false` - Chrome's typing noise detection
- `googBeamforming: false` - Chrome's beamforming
- `googArrayGeometry: false` - Chrome's array geometry processing
- `googAudioMirroring: false` - Chrome's audio mirroring
- `googDAEchoCancellation: false` - Chrome's double-talk echo cancellation
- `googNoiseReduction: false` - Chrome's noise reduction

## Testing Recommendations

1. **Test on different browsers**: Chrome, Firefox, Safari, Edge
2. **Test on different devices**: Desktop, mobile, tablet
3. **Test in different environments**: Quiet room, noisy environment
4. **Compare before/after**: Record the same audio with old vs new settings
5. **Check for side effects**: Ensure no new audio issues are introduced

## Future Considerations

- The real-time audio effects system (`useRealtimePlayback.ts`) is currently disabled but could be re-enabled if needed
- Consider adding audio quality settings to the config if users want to re-enable certain processing features
- Monitor browser compatibility as new audio processing features are added to browsers
