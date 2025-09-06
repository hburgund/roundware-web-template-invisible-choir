import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics for audio streaming
const audioErrorRate = new Rate('audio_errors');
const audioResponseTime = new Trend('audio_response_time');
const audioRequestCount = new Counter('audio_requests');
const audioStreamTime = new Trend('audio_stream_duration');

export const options = {
  thresholds: {
    http_req_duration: ['p(95)<5000', 'p(99)<10000'],
    http_req_failed: ['rate<0.20'], // More lenient for external API timeouts
    audio_errors: ['rate<0.1'],
    audio_response_time: ['p(95)<5000'], // More lenient for external API
    audio_stream_duration: ['p(95)<2000'],
  },
  stages: [
    { duration: '30s', target: 10 },
    { duration: '2m', target: 30 },
    { duration: '30s', target: 0 },
  ],
  // Add connection management
  noConnectionReuse: false,
  userAgent: 'k6-audio-test/1.0',
};

// Base URLs from actual Roundware configuration
const FRONTEND_URL = 'http://[::1]:2345'; // IPv6 localhost
const ROUNDWARE_API_URL = 'https://dev.roundware.com/api/2';
const ROUNDWARE_SERVER_URL = 'https://dev.roundware.com/';

export default function () {
  // Test audio asset loading
  const audioAssets = [
    '/src/assets/audio/click-103.wav',
    '/src/assets/audio/click-84.wav',
    '/src/assets/audio/click-single.wav'
  ];

  audioAssets.forEach(asset => {
    const response = http.get(`${FRONTEND_URL}${asset}`, {
      timeout: '10s',
      tags: { endpoint: 'frontend_audio' }
    });
    audioRequestCount.add(1);
    audioErrorRate.add(response.status !== 200);
    audioResponseTime.add(response.timings.duration);

    check(response, {
      [`audio asset ${asset} loads successfully`]: (r) => r.status === 200,
      [`audio asset ${asset} response time < 3000ms`]: (r) => r.timings.duration < 3000,
      [`audio asset ${asset} has content`]: (r) => r.body && r.body.length > 0,
      [`audio asset ${asset} is audio file`]: (r) => r.headers['Content-Type'] && r.headers['Content-Type'].includes('audio'),
    });
  });

  // Test audio streaming endpoints from Roundware with retry logic
  const audioEndpoints = [
    '/audio/',
    '/assets/',
    '/speakers/'
  ];

  audioEndpoints.forEach(endpoint => {
    let response;
    let attempts = 0;
    const maxAttempts = 3;
    
    // Retry logic for external API
    while (attempts < maxAttempts) {
      response = http.get(`${ROUNDWARE_API_URL}${endpoint}`, {
        params: { project_id: 1 },
        timeout: '20s',
        tags: { endpoint: 'external_audio_api', attempt: attempts + 1 }
      });
      
      // If successful or client error (4xx), break the retry loop
      if (response.status < 500 && response.status !== 0) {
        break;
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        sleep(1); // Wait 1 second before retry
      }
    }
    
    audioRequestCount.add(1);
    // Only count as error if all retries failed with server errors
    audioErrorRate.add(response.status >= 500 || response.status === 0);
    audioResponseTime.add(response.timings.duration);

    check(response, {
      [`audio endpoint ${endpoint} responds`]: (r) => r.status >= 200 && r.status < 500,
      [`audio endpoint ${endpoint} response time < 10000ms`]: (r) => r.timings.duration < 10000,
    });
  });

  // Test audio streaming with range requests (simulating audio playback)
  const rangeHeaders = [
    { 'Range': 'bytes=0-1023' },
    { 'Range': 'bytes=1024-2047' },
    { 'Range': 'bytes=0-8191' },
    { 'Range': 'bytes=8192-16383' }
  ];

  rangeHeaders.forEach((headers, index) => {
    const response = http.get(`${FRONTEND_URL}/src/assets/audio/click-103.wav`, { 
      headers,
      timeout: '10s',
      tags: { endpoint: 'frontend_audio_range' }
    });
    audioStreamTime.add(response.timings.duration);

    check(response, {
      [`range request ${index + 1} responds`]: (r) => r.status === 200 || r.status === 206,
      [`range request ${index + 1} response time < 2000ms`]: (r) => r.timings.duration < 2000,
    });
  });

  // Test concurrent audio requests (simulating multiple users listening)
  const concurrentAudioRequests = [];
  for (let i = 0; i < 5; i++) {
    concurrentAudioRequests.push({
      method: 'GET',
      url: `${FRONTEND_URL}/src/assets/audio/click-103.wav`,
      tags: { endpoint: 'frontend_audio_concurrent' }
    });
  }

  const concurrentResponses = http.batch(concurrentAudioRequests);
  concurrentResponses.forEach((response, index) => {
    check(response, {
      [`concurrent audio request ${index + 1} succeeds`]: (r) => r.status === 200,
      [`concurrent audio request ${index + 1} response time < 3000ms`]: (r) => r.timings.duration < 3000,
    });
  });

  // Test audio streaming with different user agents (mobile vs desktop)
  const userAgents = [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  ];

  userAgents.forEach((userAgent, index) => {
    const response = http.get(`${FRONTEND_URL}/src/assets/audio/click-103.wav`, {
      headers: { 'User-Agent': userAgent },
      timeout: '10s',
      tags: { endpoint: 'frontend_audio_useragent' }
    });

    check(response, {
      [`user agent ${index + 1} audio loads`]: (r) => r.status === 200,
      [`user agent ${index + 1} response time < 3000ms`]: (r) => r.timings.duration < 3000,
    });
  });

  // Test audio streaming with compression
  const compressionHeaders = {
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept': 'audio/wav, audio/mpeg, audio/*'
  };

  const compressionResponse = http.get(`${FRONTEND_URL}/src/assets/audio/click-103.wav`, {
    headers: compressionHeaders,
    timeout: '10s',
    tags: { endpoint: 'frontend_audio_compression' }
  });

  check(compressionResponse, {
    'compressed audio request succeeds': (r) => r.status === 200,
    'compressed audio response time < 3000ms': (r) => r.timings.duration < 3000,
  });

  // Test audio streaming with cache headers
  const cacheHeaders = {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  };

  const cacheResponse = http.get(`${FRONTEND_URL}/src/assets/audio/click-103.wav`, {
    headers: cacheHeaders,
    timeout: '10s',
    tags: { endpoint: 'frontend_audio_cache' }
  });

  check(cacheResponse, {
    'cached audio request succeeds': (r) => r.status === 200,
    'cached audio response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  // Simulate realistic user behavior - pause between audio requests
  sleep(Math.random() * 2 + 1);
}


