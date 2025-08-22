// types for config file

import { SpeakerConfig } from "roundware-web-framework";

export type IAssetCardConfig = {
  /** available */
  available: (
    | "date"
    | "tags"
    | "description"
    | "audio"
    | "photo"
    | "text"
    | "actions"
  )[];
  /** actions */
  actionItems: ("like" | "flag" | "download" | "show")[];
};

export type IConfig = {
  locale: string;
  /** display debug mesages on UI */
  debugMode: boolean;

  /** project specific config */
  project: {
    /** url of the project's api */
    apiUrl: string;
    /** url of the project's server */
    serverUrl: string;
    /** id of the project to use */
    id: number;
    /** initial location to use; used to set initial map location */
    initialLocation: {
      latitude: number;
      longitude: number;
    };
  };
  /** config for listen mode */
  listen: {
    /**
     * available listen modes user can switch between through out the app
     * 'device' will use 'map' on desktop and 'walking' on mobile
     *  */
    availableListenModes: "device" | ("map" | "walking")[];

    /** if an asset is paused, should it be kept paused after switching to another asset and resume when selected again */
    keepPausedAssets: boolean;
    /** default geo listen mode */
    geoListenMode: "device" | ("map" | "walking")[];
    /** clicking the 'Listen' button automatically starts the stream */
    autoplay: boolean;
    /** interval in milliseconds for checking speaker updates */
    speakerUpdateInterval: number;
    /** config for speaker */
    speaker: SpeakerConfig;

    /** duration to skip when listen transport buttons are clicked */
    skipDuration: number;
  };
  /** config for speak mode */
  speak: {
    /** allow user to upload photos */
    allowPhotos: boolean;
    /** allow user to upload text */
    allowText: boolean;
    /** allow user to select tags */
    allowSpeakTags: boolean;
    /** default tags to be included regardless what user selects */
    defaultSpeakTags: number[];
    /** recording method */
    recordingMethod: "standard" | "looping";
    /** upload as speaker */
    uploadAsSpeaker: boolean;
    /** base loop */
    baseRecordingLoopSelectionMethod: "all" | "oldest" | "topAncestor";
    /** speaker shape */
    speakerShape: "circle" | "beechLeaf";
    /** scale factor for expanding speaker shapes */
    speakerShapeScale: number;
    /** number of beats per loop for countdown timing */
    beatsPerLoop: number;
    /** click track configuration */
    clickTrack: {
      /** enable click track during recording */
      enabled: boolean;
      /** volume level for click track (0-1) */
      volume: number;
      /** ratio for balancing click track against speaker audio (0.0 = no click, 1.0 = full click) */
      balanceRatio: number;
    };
    /** disable real-time effects during recording for better reliability */
    micRecordingEffects: boolean;
    
    /** volume levels for looping recording review stage */
    loopingRecordingVolumes?: {
      /** volume level for base loop during review (0-1) */
      baseLoopVolume: number;
      /** volume level for user recording during review (0-1) */
      userRecordingVolume: number;
    };
    
    /** effects for looping recording playback review stage */
    loopingRecordingPlaybackEffects?: {
      /** enable effects during playback review */
      enabled: boolean;
      /** compression settings */
      compression: {
        /** compression threshold in dB */
        threshold: number;
        /** compression knee in dB */
        knee: number;
        /** compression ratio */
        ratio: number;
        /** compression attack time in seconds */
        attack: number;
        /** compression release time in seconds */
        release: number;
      };
      /** delay settings */
      delay: {
        /** delay time in seconds */
        time: number;
        /** feedback amount (0-1) */
        feedback: number;
      };
      /** reverb settings */
      reverb: {
        /** reverb gain (0-1) */
        gain: number;
        /** reverb decay time in seconds */
        decayTime: number;
      };
    };
    
    /** advanced audio processing minimization settings */
    audioProcessingMinimization?: {
      /** enable comprehensive audio processing minimization */
      enabled: boolean;
      /** monitor audio levels to avoid triggering external AGC */
      enableLevelMonitoring: boolean;
      /** automatically adjust gain to stay in "safe zone" */
      enableAdaptiveGain: boolean;
      /** target audio level (0-255) to avoid external processing */
      targetLevel: number;
      /** acceptable range around target level */
      levelTolerance: number;
      /** initial gain setting to avoid hot levels */
      conservativeGain: number;
      /** higher sample rate for better quality */
      sampleRate: number;
      /** higher bit depth if supported */
      sampleSize: number;
      /** mono recording to avoid stereo processing */
      channelCount: number;
      /** minimal buffering */
      latencyHint: 'interactive' | 'balanced' | 'playback';
      /** validate that constraints are being applied (debug only) */
      validateConstraints: boolean;
    };
  };
  /** config for map */
  map: {
    /** items to be displayed in the infowindow
     * order will be the same as the order in the array
     */
    infoWindowItems: IAssetCardConfig;

    /** zoom levels */
    zoom: {
      /** example when info window is selected */
      high: number;
      /** example when default loaded */
      low: number;
      /** when walking mode */
      walking: number;
    };
    /** how to display the speaker regions;
     * 'images' will overlay the speaker region with the image "speaker.png" file
     */
    speakerDisplay?: "images" | "polygons" | "none";
    /** colors to be used for speaker polygons - either array of colors or array of [fill, border] pairs */
    speakerPolygonColors: string[] | [string, string][];
    /** Default styling for speaker polygon display */
    speakerDisplayDefaults: {
      strokeWeight: number;
      strokeOpacity: number;
      fillOpacity: number;
    };
    /** Styling for speaker center markers and connection lines */
    speakerConnectorStyles: {
      // === CURVE BEHAVIOR (applies to both arc and bezier) ===
      /** Type of curve algorithm to use */
      curveType: "arc" | "bezier";
      /** Curve intensity for connection lines - number for fixed intensity, or [min, max] array for random range */
      curveIntensity: number | [number, number];
      /** Enable organic variations like random curve direction and subtle noise (default: true) */
      organicVariations?: boolean;
      /** Intensity of organic noise added to curves (0-1, default: 0.1) */
      noiseIntensity?: number;

      // === BEZIER-SPECIFIC SETTINGS ===  
      bezier?: {
        /** Number of control points (2 for cubic bezier) */
        controlPoints?: number;
        /** How far bezier control points offset from the straight line - [min, max] for variation */
        waveIntensity?: number | [number, number];
        /** Asymmetry factor for S-curves - 0 = symmetric, 1 = highly asymmetric */
        asymmetry?: number;
        /** Complexity of bezier curves - simple = smooth S, wavy = multiple waves */
        complexity?: "simple" | "wavy";
        /** Amplitude of small waves in wavy mode - 0 = no small waves, higher = more pronounced waves */
        waveAmplitude?: number;
      };

      // === MARKER STYLING ===
      markers: {
        /** Size (radius) of center markers */
        size: number;
        /** Border color of center markers */
        borderColor: string;
        /** Border stroke weight of center markers */
        borderWeight: number;
        /** Fill color of center markers - "auto" uses polygon color, or hex color */
        fill: "auto" | string;
        /** Opacity of center markers (0-1) */
        opacity: number;
        /** Z-index for center markers */
        zIndex: number;
      };

      // === LINE STYLING ===
      lines: {
        /** Stroke weight of connection lines */
        weight: number;
        /** Color of connection lines (hex with optional alpha) */
        color: string;
        /** Opacity of connection lines (0-1) */
        opacity: number;
        /** Z-index for connection lines */
        zIndex: number;
      };
    };
    /** should the map area be restricted */
    useListenMapBounds: boolean;
    /** should the bounds markers be shown;  */
    showBoundsMarkers: boolean;
    /**
     *  'none' will not restrict the map area
     * 'auto' will restrict the map area to the bounds according to the speaker regions
     */
    bounds: "none" | "auto";
    /**
     * bounds points to be used when bounds is set to 'none'
     * swLat: south west latitude
     * swLng: south west longitude
     * neLat: north east latitude
     * neLng: north east longitude
     * */
    boundsPoints: {
      swLat: number;
      swLng: number;
      neLat: number;
      neLng: number;
    };

    /** types of assets to be displayed */
    assetTypeDisplay: ("audio" | "photo" | "text")[];

    /** asset display */
    assetDisplay: "pin" | "circle" | "polygon";
    
    /** whether to show the range circle overlay in map mode */
    rangeCircleOverlayVisible: boolean;
  };
  /** config for ui */
  ui: {
    /** height of the nav logo */
    navLogoHeight: number;

    /** side bar/drawer on listen page */
    listenSidebar: {
      /** should the sidebar be open by default on desktop */
      defaultOpen: boolean;
      /** should the sidebar be shown */
      active: boolean;
      filter: {
        /**
         * filters available in the listen mode
         * order will be the same as the order in the array
         *  */
        active: boolean;
        available: ("date" | "tags" | "description")[];
      };
      history: {
        active: boolean;
        available: IAssetCardConfig;
        infoCardDefaultCollapsed: boolean;
      };
    };

    /** transport controls on listen page */
    listenTransport: {
      /** should the skip forward button be shown */
      includeSkipForwardButton: boolean;
      /** should the skip back button be shown */
      includeSkipBackButton: boolean;
    };
  };
  /** config for features usually project specific */
  features: {
    /** duration after which the app will automatically conclude the session */
    autoConcludeDuration: number;
    /** duration for which the app will conclude the session  */
    concludeDuration: number;
    /** link to the survey */
    surveyLink: string;
    /** time after which the app will automatically reset */
    autoResetTimeSeconds: number;

    /** ids of the tags which should toggle the speaker regions */
    speakerToggleIds: number[];
  };
};
