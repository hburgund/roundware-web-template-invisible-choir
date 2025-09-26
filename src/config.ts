import configJSON from "@/config.json";
import { IConfig } from "@/configTypes";
import { merge } from "lodash";

// this config object can be overridden by config.json
// Refer the type object below for info and comments on each config option
let config: IConfig = {
  locale: "en",
  debugMode: false,

  project: {
    apiUrl: "https://dev.roundware.com/api/2",
    serverUrl: "https://dev.roundware.com/",
    id: 1,
    initialLocation: {
      latitude: 21.1458,
      longitude: 79.0882,
    },
  },

  listen: {
    availableListenModes: "device",
    keepPausedAssets: true,
    geoListenMode: "device",
    autoplay: false,
    speakerUpdateInterval: 30000,
    speaker: {
      mode: "progressive-sync-basePlusMax5Random",
      loop: true,
      acceptableDelayMs: 50,
      syncCheckInterval: 2500,
      replaceWithNoneProbability: 0.0,
      loopPointUpdateProbability: 0.7,
      slotConsiderationProbability: 0.5,
      speakerRotationProbability: 0.8,
      prefetchDistanceMeters: 5,
      // loopFractions: [1/8, 1/4, 1/2, 5/8, 3/4, 1/1, 1/1, 1/1, 1/1, 1/2, 1/2],
      loopFractions: [
        // 1/8,
        // 1/4,1/4,1/4,1/4,
        // 1/2,1/2,1/2,1/2,
        1/1,1/1,1/1,1/1,1/1,1/1,1/1,1/1,
        // -1/1,
        // -1/2,
        // -1/8,
        // -1/4,
      ],
      effects: {
        delayTimeInMs: 250,
        feedback: 0.2,
        wetDryRatio: 0.3,
        reverbRoomSize: 0.6,
        reverbDamping: 0.3,
        pan: [-0.8, -0.4, 0.4, 0.8],
      },
      // Variant URI configuration for speaker audio variants
      minVariantLoops: 2, // Minimum loops per variant (default: 2)
      maxVariantLoops: 3, // Maximum loops per variant (default: 4)
      variantCrossfadeDurationMs: 1000, // Crossfade duration in milliseconds (default: 1000)
      newSpeakerFadeInDurationMs: 2000,
      alwaysOnWhenAvailable: [393],
    },

    skipDuration: 5,
  },

  speak: {
    allowPhotos: true,
    allowText: true,
    allowSpeakTags: false,
    defaultSpeakTags: [],
    recordingMethod: "looping",
    uploadAsSpeaker: true,
    baseRecordingLoopSelectionMethod: "all", // "all" | "oldest" | "topAncestor"
    speakerShape: "beechLeaf",
    speakerShapeScale: 1.00,
    beatsPerLoop: 8,
    clickTrack: {
      enabled: true,
      volume: 1.0,
      balanceRatio: 0.8, // Ratio for balancing click track against speaker audio (0.0 = no click, 1.0 = full click)
    },
    micRecordingEffects: false, // Disable real-time effects during recording for better reliability

    /** volume levels for looping recording review stage */
    loopingRecordingVolumes: {
      baseLoopVolume: 0.2,    // Lower base loop volume for review
      userRecordingVolume: 1.0, // Higher user recording volume for review
    },

    /** effects for looping recording playback review stage */
    loopingRecordingPlaybackEffects: {
      enabled: true,
      compression: {
        threshold: -20,    // Significant compression to level out auto-gain issues
        knee: 20,
        ratio: 12,         // High ratio for aggressive compression
        attack: 0.01,      // Fast attack
        release: 0.25,     // Moderate release
      },
      delay: {
        time: 0.0,         // No delay - turn off entirely
        feedback: 0.0,     // No feedback
        wetDryRatio: 0.0,  // No wet signal - delay completely off
      },
      reverb: {
        gain: 0.3,         // Moderate reverb for ambience
        decayTime: 0.2,    // 1 second decay
        roomSize: 0.4,     // Smaller room size to minimize click track weirdness
        damping: 1.0,      // Higher damping to reduce click track weirdness
        wetDryRatio: 0.3,  // Low wet/dry ratio to minimize click track weirdness
      },
    },

    // === ADVANCED AUDIO PROCESSING MINIMIZATION ===
    // These settings help minimize on-board processing in headphones and external mics
    audioProcessingMinimization: {
      enabled: true,                    // Enable comprehensive audio processing minimization
      enableLevelMonitoring: true,      // Monitor audio levels to avoid triggering external AGC
      enableAdaptiveGain: true,         // Automatically adjust gain to stay in "safe zone"
      targetLevel: 0.3,                 // Target audio level (0-1 scale, 0.3 = 30%) to avoid external processing
      levelTolerance: 0.15,             // Acceptable range around target level (0.15 = 15%)
      conservativeGain: 0.3,            // Initial gain setting to avoid hot levels
      sampleRate: 48000,                // Higher sample rate for better quality
      sampleSize: 24,                   // Higher bit depth if supported
      channelCount: 1,                  // Mono recording to avoid stereo processing
      latencyHint: 'balanced',          // Minimal buffering
      validateConstraints: true,        // Validate that constraints are being applied (debug only)
    },
  },

  map: {
    infoWindowItems: {
      available: [
        "date",
        "tags",
        "description",
        "audio",
        "photo",
        "text",
        "actions",
      ],
      actionItems: ["like", "flag", "show"],
    },

    zoom: {
      high: 22,
      low: 20,
      walking: 22,
    },
    speakerDisplay: "polygons",
    speakerPolygonColors: [
      ["#7F1D1D", "#B45309"],
      ["#059669", "#065F46"],
    ],
    speakerDisplayDefaults: {
      strokeWeight: 2,
      strokeOpacity: 0.5,
      fillOpacity: 0.25,
    },
    // Styling for newly created speakers in current session
    sessionCreatedSpeakerDefaults: {
      strokeWeight: 3,
      strokeOpacity: 1.0,
      fillOpacity: 0.4,
      strokeColor: "#00FFB7", // Blue color for new speakers
      fillColor: "#72A603", // Blue fill color for new speakers
      // Enhanced visual effects
      innerStrokeColor: "#FFFFFF", // White inner stroke
      innerStrokeOpacity: 0.0,
      outerGlowColor: "auto", // "auto" uses strokeColor, or specify hex color
      outerGlowOpacity: 0.3,
    },
    // Styling for speakers that are currently playing audio
    playingSpeakerDefaults: {
      strokeWeight: 1,
      strokeOpacity: 0.7,
      fillOpacity: 0.4, // More opaque when playing
      strokeColor: "#065F46",
      fillColor: "#ADD96A",
    },
    // Styling for speakers that are not currently playing
    nonPlayingSpeakerDefaults: {
      strokeWeight: 0, // No border for non-playing speakers
      strokeOpacity: 0,
      fillOpacity: 0.1, // More transparent when not playing
      fillColor: null, // Keep original fill color (no change)
      strokeColor: null, // Keep original stroke color (no change)
    },
    // Styling for recently created speakers (based on creation time)
    recentSpeakerDefaults: {
      strokeWeight: 1, // No border for recent speakers
      strokeOpacity: 0.6,
      fillOpacity: 0.5, // Higher opacity for recent speakers
      fillColor: "#E68E00", // Grey fill color for recent speakers
      strokeColor: "#E68E00", // Black border (for future use)
    },
    // Number of most recent speakers to highlight
    recentSpeakerCount: 5,
    speakerConnectorStyles: {
      // === CURVE BEHAVIOR (applies to both arc and bezier) ===
      curveType: "bezier",
      curveIntensity: [0.05, 0.5],
      organicVariations: true,
      noiseIntensity: 0.0,

      // === BEZIER-SPECIFIC SETTINGS ===
      bezier: {
        controlPoints: 2,
        waveIntensity: [0.2, 0.6],
        asymmetry: 0,
        complexity: "wavy",
        waveAmplitude: 0.0,
      },

      // === MARKER STYLING ===
      markers: {
        size: 2,
        borderColor: "#ffffff",
        borderWeight: 1,
        fill: "auto",
        opacity: 0.5,
        zIndex: 2000,
      },

      // === LINE STYLING ===
      lines: {
        weight: 1,
        color: "#ffffff",
        opacity: 0.3,
        zIndex: 1000,
      },
    },
    useListenMapBounds: false,
    showBoundsMarkers: false,
    showListenerLocationMarker: false,
    bounds: "none",
    boundsPoints: {
      swLat: 3,
      swLng: 5,
      neLat: 5,
      neLng: 43,
    },
    assetTypeDisplay: ["audio", "photo", "text"],

    assetDisplay: "circle",
    rangeCircleOverlayVisible: false,
  },

  ui: {
    navLogoHeight: 34,
    listenSidebar: {
      defaultOpen: false,
      active: true,
      filter: {
        active: true,
        available: ["date", "tags", "description"],
      },
      history: {
        active: true,
        available: {
          available: [
            "date",
            "description",
            "photo",
            "text",
            "audio",
            "actions",
          ],
          actionItems: ["show"],
        },
        infoCardDefaultCollapsed: false,
      },
    },

    listenTransport: {
      includeSkipForwardButton: false,
      includeSkipBackButton: false,
    },
  },

  features: {
    autoConcludeDuration: 992,
    concludeDuration: 2,
    surveyLink: "https://forms.gle/nMfJNPozSW1KFddu7",
    autoResetTimeSeconds: 0,

    speakerToggleIds: [],
  },
};

// override the default config
// with values from a config.json file
let finalConfig: IConfig;
if (configJSON) {
  finalConfig = merge(config, configJSON);
} else finalConfig = config;

export default finalConfig;
