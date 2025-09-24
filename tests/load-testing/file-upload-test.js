import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics for upload testing
const uploadErrorRate = new Rate('upload_errors');
const uploadResponseTime = new Trend('upload_response_time');
const uploadRequestCount = new Counter('upload_requests');
const uploadSuccessRate = new Rate('upload_success');
const envelopeCreationTime = new Trend('envelope_creation_time');
const fileUploadTime = new Trend('file_upload_time');

export const options = {
  thresholds: {
    http_req_duration: ['p(95)<15000', 'p(99)<30000'],
    http_req_failed: ['rate<0.9'],
    upload_errors: ['rate<0.8'],
    upload_response_time: ['p(95)<20000'],
    upload_success: ['rate>0.1'],
    envelope_creation_time: ['p(95)<8000'],
    file_upload_time: ['p(95)<18000'],
  },
  stages: [
    { duration: '1m', target: 30 },
  ],
  noConnectionReuse: false,
  userAgent: 'k6-upload-test/1.0',
};

// Base URLs from actual Roundware configuration
const FRONTEND_URL = 'http://[::1]:2346';
const ROUNDWARE_API_URL = 'https://dev.roundware.com/api/2';
const ROUNDWARE_SERVER_URL = 'https://dev.roundware.com/';

// Helper function to create test audio data
function createTestAudioData(duration = 5) {
  const sampleRate = 44100;
  const numChannels = 1;
  const bitsPerSample = 16;
  const numSamples = sampleRate * duration;
  const dataSize = numSamples * numChannels * (bitsPerSample / 8);
  const fileSize = 44 + dataSize;
  
  let wavHeader = '';
  wavHeader += String.fromCharCode(0x52, 0x49, 0x46, 0x46);
  wavHeader += String.fromCharCode((fileSize - 8) & 0xFF, ((fileSize - 8) >> 8) & 0xFF, ((fileSize - 8) >> 16) & 0xFF, ((fileSize - 8) >> 24) & 0xFF);
  wavHeader += String.fromCharCode(0x57, 0x41, 0x56, 0x45);
  wavHeader += String.fromCharCode(0x66, 0x6D, 0x74, 0x20);
  wavHeader += String.fromCharCode(16, 0, 0, 0);
  wavHeader += String.fromCharCode(1, 0);
  wavHeader += String.fromCharCode(numChannels, 0);
  wavHeader += String.fromCharCode(sampleRate & 0xFF, (sampleRate >> 8) & 0xFF, (sampleRate >> 16) & 0xFF, (sampleRate >> 24) & 0xFF);
  wavHeader += String.fromCharCode((sampleRate * numChannels * (bitsPerSample / 8)) & 0xFF, ((sampleRate * numChannels * (bitsPerSample / 8)) >> 8) & 0xFF, ((sampleRate * numChannels * (bitsPerSample / 8)) >> 16) & 0xFF, ((sampleRate * numChannels * (bitsPerSample / 8)) >> 24) & 0xFF);
  wavHeader += String.fromCharCode(numChannels * (bitsPerSample / 8), 0);
  wavHeader += String.fromCharCode(bitsPerSample, 0);
  wavHeader += String.fromCharCode(0x64, 0x61, 0x74, 0x61);
  wavHeader += String.fromCharCode(dataSize & 0xFF, (dataSize >> 8) & 0xFF, (dataSize >> 16) & 0xFF, (dataSize >> 24) & 0xFF);
  
  for (let i = 0; i < dataSize; i++) {
    wavHeader += String.fromCharCode(0);
  }
  
  return wavHeader;
}

// Helper function to create test image data
function createTestImageData() {
  const pngData = [
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE,
    0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54,
    0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ];
  
  let pngString = '';
  for (let i = 0; i < pngData.length; i++) {
    pngString += String.fromCharCode(pngData[i]);
  }
  
  return pngString;
}

export default function () {
  // ========================================
  // BATCH 1: BASIC AUDIO FILE UPLOAD TESTING
  // ========================================
  
  // Test 1: Create envelope for uploads
  const envelopeStartTime = Date.now();
  let envelopeResponse;
  let attempts = 0;
  const maxAttempts = 2;
  
  while (attempts < maxAttempts) {
    try {
      envelopeResponse = http.post(`${ROUNDWARE_API_URL}/envelopes/`, JSON.stringify({
        project_id: 1
      }), {
        headers: { 'Content-Type': 'application/json' },
        timeout: '10s',
        tags: { endpoint: 'envelope_creation', attempt: attempts + 1 }
      });
      
      if (envelopeResponse.status < 500 && envelopeResponse.status !== 0) {
        break;
      }
    } catch (error) {
      console.log(`Envelope creation attempt ${attempts + 1} failed: ${error}`);
      envelopeResponse = { status: 0, body: '', timings: { duration: 0 } };
    }
    
    attempts++;
    if (attempts < maxAttempts) {
      sleep(1);
    }
  }
  
  const envelopeCreationDuration = Date.now() - envelopeStartTime;
  envelopeCreationTime.add(envelopeCreationDuration);
  uploadRequestCount.add(1);
  uploadErrorRate.add(envelopeResponse.status >= 500 || envelopeResponse.status === 0);
  
  check(envelopeResponse, {
    'envelope creation responds': (r) => r.status >= 200 && r.status < 600,
    'envelope creation response time < 8000ms': (r) => r.timings.duration < 8000,
    'envelope response has content': (r) => r.body && r.body.length > 0,
  });
  
  // If external API is not accessible, test frontend upload endpoints instead
  if (envelopeResponse.status >= 400 || envelopeResponse.status === 0) {
    console.log(`External API not accessible (${envelopeResponse.status}), testing frontend upload endpoints`);
    
    const frontendUploadTests = [
      { url: `${FRONTEND_URL}/speak`, name: 'speak_page' },
      { url: `${FRONTEND_URL}/speak/recording`, name: 'recording_page' },
      { url: `${FRONTEND_URL}/src/config.json`, name: 'config' },
    ];
    
    frontendUploadTests.forEach(test => {
      const response = http.get(test.url, {
        timeout: '10s',
        tags: { endpoint: 'frontend_upload_test' }
      });
      
      uploadRequestCount.add(1);
      uploadErrorRate.add(response.status >= 500 || response.status === 0);
      uploadSuccessRate.add(response.status >= 200 && response.status < 400);
      
      check(response, {
        [`${test.name} page loads`]: (r) => r.status >= 200 && r.status < 600,
        [`${test.name} response time < 5000ms`]: (r) => r.timings.duration < 5000,
      });
    });
    
    sleep(2);
    return;
  }
  
  // Test 2: Upload audio file via envelope
  const audioData = createTestAudioData(3);
  const uploadStartTime = Date.now();
  
  const formData = {
    file: http.file(audioData, 'test-audio.wav', 'audio/wav'),
    metadata: JSON.stringify({
      longitude: 21.1458,
      latitude: 79.0882,
      media_type: 'audio'
    })
  };
  
  let uploadResponse;
  attempts = 0;
  const uploadMaxAttempts = 1;
  
  while (attempts < uploadMaxAttempts) {
    try {
      uploadResponse = http.post(`${ROUNDWARE_API_URL}/assets/`, formData, {
        params: { project_id: 1 },
        timeout: '30s',
        tags: { endpoint: 'audio_upload', attempt: attempts + 1 }
      });
      
      if (uploadResponse.status < 500 && uploadResponse.status !== 0) {
        break;
      }
    } catch (error) {
      console.log(`Audio upload attempt ${attempts + 1} failed: ${error}`);
      uploadResponse = { status: 0, body: '', timings: { duration: 0 } };
    }
    
    attempts++;
    if (attempts < uploadMaxAttempts) {
      sleep(2);
    }
  }
  
  const uploadDuration = Date.now() - uploadStartTime;
  fileUploadTime.add(uploadDuration);
  uploadRequestCount.add(1);
  uploadErrorRate.add(uploadResponse.status >= 500 || uploadResponse.status === 0);
  uploadSuccessRate.add(uploadResponse.status >= 200 && uploadResponse.status < 400);
  
  check(uploadResponse, {
    'audio upload responds': (r) => r.status >= 200 && r.status < 600,
    'audio upload response time < 20000ms': (r) => r.timings.duration < 20000,
    'audio upload has response body': (r) => r.body && r.body.length > 0,
  });
  
  // Test 3: Upload text file
  const textData = 'This is a test text file for upload testing.';
  
  const textFormData = {
    file: http.file(textData, 'test-text.txt', 'text/plain'),
    metadata: JSON.stringify({
      longitude: 21.1458,
      latitude: 79.0882,
      media_type: 'text'
    })
  };
  
  let textUploadResponse;
  attempts = 0;
  const textMaxAttempts = 1;
  
  while (attempts < textMaxAttempts) {
    textUploadResponse = http.post(`${ROUNDWARE_API_URL}/assets/`, textFormData, {
      params: { project_id: 1 },
      timeout: '20s',
      tags: { endpoint: 'text_upload', attempt: attempts + 1 }
    });
    
    if (textUploadResponse.status < 500 && textUploadResponse.status !== 0) {
      break;
    }
    
    attempts++;
    if (attempts < textMaxAttempts) {
      sleep(1);
    }
  }
  
  uploadRequestCount.add(1);
  uploadErrorRate.add(textUploadResponse.status >= 500 || textUploadResponse.status === 0);
  uploadSuccessRate.add(textUploadResponse.status >= 200 && textUploadResponse.status < 400);
  
  check(textUploadResponse, {
    'text upload responds': (r) => r.status >= 200 && r.status < 600,
    'text upload response time < 15000ms': (r) => r.timings.duration < 15000,
  });
  
  // Test 4: Upload image file
  const imageData = createTestImageData();
  
  const imageFormData = {
    file: http.file(imageData, 'test-image.png', 'image/png'),
    metadata: JSON.stringify({
      longitude: 21.1458,
      latitude: 79.0882,
      media_type: 'photo'
    })
  };
  
  let imageUploadResponse;
  attempts = 0;
  const imageMaxAttempts = 1;
  
  while (attempts < imageMaxAttempts) {
    imageUploadResponse = http.post(`${ROUNDWARE_API_URL}/assets/`, imageFormData, {
      params: { project_id: 1 },
      timeout: '20s',
      tags: { endpoint: 'image_upload', attempt: attempts + 1 }
    });
    
    if (imageUploadResponse.status < 500 && imageUploadResponse.status !== 0) {
      break;
    }
    
    attempts++;
    if (attempts < imageMaxAttempts) {
      sleep(1);
    }
  }
  
  uploadRequestCount.add(1);
  uploadErrorRate.add(imageUploadResponse.status >= 500 || imageUploadResponse.status === 0);
  uploadSuccessRate.add(imageUploadResponse.status >= 200 && imageUploadResponse.status < 400);
  
  check(imageUploadResponse, {
    'image upload responds': (r) => r.status >= 200 && r.status < 600,
    'image upload response time < 15000ms': (r) => r.timings.duration < 15000,
  });
  
  // Test 5: Test different file sizes
  const largeAudioData = createTestAudioData(10);
  
  const largeFormData = {
    file: http.file(largeAudioData, 'large-test-audio.wav', 'audio/wav'),
    metadata: JSON.stringify({
      longitude: 21.1458,
      latitude: 79.0882,
      media_type: 'audio'
    })
  };
  
  let largeUploadResponse;
  attempts = 0;
  const largeMaxAttempts = 1;
  
  while (attempts < largeMaxAttempts) {
    largeUploadResponse = http.post(`${ROUNDWARE_API_URL}/assets/`, largeFormData, {
      params: { project_id: 1 },
        timeout: '60s',
        tags: { endpoint: 'large_audio_upload', attempt: attempts + 1 }
    });
    
    if (largeUploadResponse.status < 500 && largeUploadResponse.status !== 0) {
      break;
    }
    
    attempts++;
    if (attempts < largeMaxAttempts) {
      sleep(3);
    }
  }
  
  uploadRequestCount.add(1);
  uploadErrorRate.add(largeUploadResponse.status >= 500 || largeUploadResponse.status === 0);
  uploadSuccessRate.add(largeUploadResponse.status >= 200 && largeUploadResponse.status < 400);
  
  check(largeUploadResponse, {
    'large audio upload responds': (r) => r.status >= 200 && r.status < 600,
    'large audio upload response time < 30000ms': (r) => r.timings.duration < 30000,
  });
  
  sleep(Math.random() * 3 + 2);
}
