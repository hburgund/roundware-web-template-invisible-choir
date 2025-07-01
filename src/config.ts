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
      replaceWithNoneProbability: 0.2,
      loopPointUpdateProbability: 0.8,
      slotConsiderationProbability: 0.5,
      prefetchDistanceMeters: 5,
      loopFractions: [1/8, 1/4, 1/2, 5/8, 3/4, 1/1],
      effects: {
        delayTimeInMs: 50,
        feedback: 0.5,
        pan: [-0.8, -0.4, 0.4, 0.8],
      },
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
    baseRecordingLoopSelectionMethod: "all",
    speakerShape: "beechLeaf",
    speakerShapeScale: 1.05,
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
      high: 20,
      low: 17,
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
    useListenMapBounds: false,
    showBoundsMarkers: false,
    bounds: "none",
    boundsPoints: {
      swLat: 3,
      swLng: 5,
      neLat: 5,
      neLng: 43,
    },
    assetTypeDisplay: ["audio", "photo", "text"],

    assetDisplay: "circle",
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
