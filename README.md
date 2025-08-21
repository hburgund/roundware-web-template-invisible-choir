# Environment Setup

Create or open `.env`:

```
VITE_GOOGLE_MAPS_API_KEY='put your real google maps api key in .env.local'
VITE_GOOGLE_ANALYTICS_ID='put your real google analytics api key in .env.local'
PORT=1234
```

# Roundware Configuration

Open [`src/config.json`](src/config.json)

# Development

`npm start`

# Developing with Framework

```
cd roundware-web-framework
npm run watch

cd roundware-web-template
sudo npm link ../roundware-web-frameowrk
npm start
```

# Build

```
npm run build
```

# Audio Processing Minimization

This app includes comprehensive audio processing minimization features to prevent unwanted audio processing in headphones, external microphones, and other audio devices.

## Features

- **Comprehensive Audio Constraints**: Disables all browser-level audio processing (AGC, noise suppression, echo cancellation)
- **Cross-Browser Compatibility**: Includes constraints for Chrome, Firefox, Safari, and Edge
- **Real-time Level Monitoring**: Monitors audio levels to avoid triggering external AGC
- **Adaptive Gain Control**: Automatically adjusts levels to stay in optimal ranges
- **Conservative Gain Strategy**: Starts with low gain to avoid hot levels
- **Device-Specific Optimizations**: Minimizes on-board processing in external devices

## Configuration

Enable audio processing minimization in your config:

```json
{
  "speak": {
    "audioProcessingMinimization": {
      "enabled": true,
      "enableLevelMonitoring": true,
      "enableAdaptiveGain": true,
      "targetLevel": 100,
      "conservativeGain": 0.3
    }
  }
}
```

## Testing

Use the built-in test utilities to validate audio processing minimization:

```javascript
// In browser console
await window.audioTestUtils.testAudioProcessingMinimization();
await window.audioTestUtils.monitorAudioLevels(10000);
await window.audioTestUtils.generateAudioTestReport();
```

## Documentation

- [Audio Processing Minimization Guide](docs/AUDIO_PROCESSING_MINIMIZATION.md) - Comprehensive guide to all features
- [Audio Processing Fix](docs/AUDIO_PROCESSING_FIX.md) - Original fix for volume jumps and dips
