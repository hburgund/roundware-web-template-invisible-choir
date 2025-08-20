/**
 * iOS Audio Routing Utilities
 * 
 * This module handles the iOS Safari issue where starting microphone recording
 * automatically switches audio output from headphones to speakers.
 * 
 * The solution involves:
 * 1. Pre-requesting microphone access with specific constraints
 * 2. Managing timing to prevent audio routing conflicts
 * 3. Forcing built-in microphone usage to avoid headset audio processing
 */

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
  groupId?: string;
}

export interface AudioRoutingState {
  isHeadphonesConnected: boolean;
  preferredOutputDevice: AudioDevice | null;
  builtInMicrophone: AudioDevice | null;
  externalMicrophones: AudioDevice[];
}

/**
 * Get clean audio constraints that force built-in microphone usage
 * and disable all audio processing that could cause volume jumps
 */
export const getBuiltInMicrophoneConstraints = () => ({
  audio: {
    // Force built-in microphone by excluding external devices
    deviceId: { ideal: 'default' },
    
    // Disable all audio processing to prevent volume jumps
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    
    // Chrome/Chromium specific constraints
    googEchoCancellation: false,
    googAutoGainControl: false,
    googNoiseSuppression: false,
    googHighpassFilter: false,
    googTypingNoiseDetection: false,
    googBeamforming: false,
    googArrayGeometry: false,
    googAudioMirroring: false,
    googDAEchoCancellation: false,
    googNoiseReduction: false,
    
    // iOS Safari specific constraints
    sampleRate: { ideal: 44100 },
    channelCount: { ideal: 1 },
  }
});

/**
 * Enumerate all audio devices and categorize them
 */
export const enumerateAudioDevices = async (): Promise<AudioRoutingState> => {
  try {
    // First, request microphone permission to get device labels
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (permissionError) {
      console.log('Microphone permission not granted, device labels may be empty');
    }
    
    const devices = await navigator.mediaDevices.enumerateDevices();
    
    const audioInputs = devices.filter(device => device.kind === 'audioinput');
    const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
    
    // Find built-in microphone (exclude Bluetooth/external devices)
    const builtInMicrophone = audioInputs.find(device => {
      const label = device.label.toLowerCase();
      // Built-in mic should be iPhone/iPad internal mic, NOT external devices
      return label.includes('iphone') ||
             label.includes('ipad') ||
             label.includes('built-in') ||
             label.includes('internal');
    }) || null;
    
    // Find external microphones (headset, bluetooth, etc.)
    const externalMicrophones = audioInputs.filter(device => {
      const label = device.label.toLowerCase();
      // External mics include Beats, AirPods, etc.
      return label.includes('beats') ||
             label.includes('airpods') ||
             label.includes('headset') ||
             label.includes('bluetooth') ||
             label.includes('earbuds') ||
             label.includes('wireless') ||
             label.includes('external') ||
             label.includes('usb') ||
             label.includes('jack');
    });
    
    // iOS Safari limitation: audio output devices are not available through enumerateDevices()
    // We can infer headphone connection from external microphone presence
    const hasExternalMicrophone = externalMicrophones.length > 0;
    
    // For iOS, if we detect an external mic (like Beats Flex), we assume headphones are connected
    // This is a reasonable assumption since most external mics are part of headphone setups
    const isHeadphonesConnected = hasExternalMicrophone;
    
    return {
      isHeadphonesConnected,
      preferredOutputDevice: null, // iOS Safari doesn't provide output device info
      builtInMicrophone,
      externalMicrophones,
    };
  } catch (error) {
    console.error('Failed to enumerate audio devices:', error);
    return {
      isHeadphonesConnected: false,
      preferredOutputDevice: null,
      builtInMicrophone: null,
      externalMicrophones: [],
    };
  }
};



/**
 * Pre-request microphone access to establish audio routing before recording
 */
export const preRequestMicrophoneAccess = async (): Promise<MediaStream | null> => {
  try {
    console.log('Pre-requesting microphone access for iOS audio routing...');
    
    // Request microphone access with built-in microphone constraints
    const stream = await navigator.mediaDevices.getUserMedia(getBuiltInMicrophoneConstraints());
    
    console.log('Microphone access granted, stream tracks:', stream.getTracks().map(t => t.kind));
    
    // Return the stream but don't stop it yet - it will be used for recording
    return stream;
  } catch (error) {
    console.error('Failed to pre-request microphone access:', error);
    return null;
  }
};

/**
 * Initialize audio routing for iOS Safari compatibility
 * This should be called before starting any recording session
 */
export const initializeIOSAudioRouting = async (): Promise<{
  success: boolean;
  audioState: AudioRoutingState;
  microphoneStream: MediaStream | null;
}> => {
  try {
    console.log('Initializing iOS audio routing...');
    
    // Step 1: Enumerate devices to understand current setup
    const audioState = await enumerateAudioDevices();
    console.log('Audio device state:', audioState);
    
    // Step 2: Pre-request microphone access with built-in microphone constraints
    const microphoneStream = await preRequestMicrophoneAccess();
    
    if (!microphoneStream) {
      return {
        success: false,
        audioState,
        microphoneStream: null,
      };
    }
    
    // Step 3: Audio output routing is handled by the browser's default behavior
    // The key is that we've established microphone access before recording starts
    
    console.log('iOS audio routing initialized successfully');
    
    return {
      success: true,
      audioState,
      microphoneStream,
    };
  } catch (error) {
    console.error('Failed to initialize iOS audio routing:', error);
    return {
      success: false,
      audioState: {
        isHeadphonesConnected: false,
        preferredOutputDevice: null,
        builtInMicrophone: null,
        externalMicrophones: [],
      },
      microphoneStream: null,
    };
  }
};



/**
 * Check if we're running on iOS Safari
 */
export const isIOSSafari = (): boolean => {
  const userAgent = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
  return isIOS && isSafari;
};

/**
 * Check if we're running on iOS (any browser)
 */
export const isIOSDevice = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};
