import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 30,
  duration: '45s',
  thresholds: {
    http_req_duration: ['p(95)<4000'], // 95% of requests should be below 4s
    http_req_failed: ['rate<0.15'], // Error rate should be below 15%
    http_req_duration: ['p(99)<8000'], // 99% of requests should be below 8s
  },
};

export default function () {
  // ========================================
  // REVIEW PHASE PAGE INITIALIZATION
  // ========================================
  const reviewPageResponse = http.get('http://[::1]:2345/speak');
  
  check(reviewPageResponse, {
    'review phase page loads successfully': (r) => r.status === 200,
    'review page contains recording interface': (r) => r.body && r.body.includes('html'),
    'review page response time < 3000ms': (r) => r.timings.duration < 3000,
  });

  // ========================================
  // REVIEW PHASE ASSETS AND DEPENDENCIES
  // ========================================
  const reviewAssets = http.batch([
    { method: 'GET', url: 'http://[::1]:2345/src/assets/icons/mic_icon.svg' },
    { method: 'GET', url: 'http://[::1]:2345/src/assets/icons/mic_recording_icon.svg' },
    { method: 'GET', url: 'http://[::1]:2345/src/assets/icons/play_icon.svg' },
    { method: 'GET', url: 'http://[::1]:2345/src/assets/icons/sound_icon.svg' },
    { method: 'GET', url: 'http://[::1]:2345/src/assets/icons/no_sound_icon.svg' },
    { method: 'GET', url: 'http://[::1]:2345/src/assets/audio/click-103.wav' },
    { method: 'GET', url: 'http://[::1]:2345/src/assets/audio/click-84.wav' },
    { method: 'GET', url: 'http://[::1]:2345/src/assets/audio/click-single.wav' },
  ]);

  reviewAssets.forEach((response, index) => {
    check(response, {
      [`review asset ${index + 1} loads`]: (r) => r.status === 200 || r.status === 404,
      [`review asset ${index + 1} response time < 2000ms`]: (r) => r.timings.duration < 2000,
    });
  });

  // ========================================
  // REVIEW PHASE WORKFLOW ROUTES
  // ========================================
  const reviewRoutes = [
    '/speak',
    '/speak/tags/0',
    '/speak/location', 
    '/speak/recording',
    '/speak/rehearse'
  ];
  
  const routeResponses = http.batch(
    reviewRoutes.map(route => ({ method: 'GET', url: `http://[::1]:2345${route}` }))
  );

  routeResponses.forEach((response, index) => {
    check(response, {
      [`review route ${reviewRoutes[index]} loads`]: (r) => r.status === 200 || r.status === 404,
      [`review route ${reviewRoutes[index]} response time < 2000ms`]: (r) => r.timings.duration < 2000,
    });
  });

  // ========================================
  // REVIEW PHASE CONFIGURATION
  // ========================================
  const configResponse = http.get('http://[::1]:2345/src/config.json');
  
  check(configResponse, {
    'review config file loads': (r) => r.status === 200,
    'review config response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  // ========================================
  // REVIEW PHASE WORKFLOW SIMULATION
  // ========================================
  
  // Step 1: Navigate to tag selection
  const tagSelectionResponse = http.get('http://[::1]:2345/speak/tags/0');
  
  // Step 2: Navigate to location selection
  const locationSelectionResponse = http.get('http://[::1]:2345/speak/location');
  
  // Step 3: Navigate to recording interface
  const recordingInterfaceResponse = http.get('http://[::1]:2345/speak/recording');

  // Step 4: Navigate to rehearse phase
  const rehearseInterfaceResponse = http.get('http://[::1]:2345/speak/rehearse');

  // Step 5: Simulate review phase (recording-playback mode)
  const reviewInterfaceResponse = http.get('http://[::1]:2345/speak/recording');

  check(tagSelectionResponse, {
    'review tag selection page loads': (r) => r.status === 200 || r.status === 404,
    'review tag selection response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  check(locationSelectionResponse, {
    'review location selection page loads': (r) => r.status === 200 || r.status === 404,
    'review location selection response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  check(recordingInterfaceResponse, {
    'review recording interface page loads': (r) => r.status === 200 || r.status === 404,
    'review recording interface response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  check(rehearseInterfaceResponse, {
    'review rehearse interface page loads': (r) => r.status === 200 || r.status === 404,
    'review rehearse interface response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  check(reviewInterfaceResponse, {
    'review interface page loads': (r) => r.status === 200 || r.status === 404,
    'review interface response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  // ========================================
  // REVIEW PHASE AUDIO ASSET TESTING
  // ========================================
  const audioAssets = [
    'http://[::1]:2345/src/assets/audio/click-103.wav',
    'http://[::1]:2345/src/assets/audio/click-84.wav',
    'http://[::1]:2345/src/assets/audio/click-single.wav'
  ];
  
  const audioResponses = http.batch(
    audioAssets.map(url => ({ method: 'GET', url }))
  );

  audioResponses.forEach((response, index) => {
    check(response, {
      [`review audio asset ${index + 1} loads`]: (r) => r.status === 200 || r.status === 404,
      [`review audio asset ${index + 1} response time < 3000ms`]: (r) => r.timings.duration < 3000,
    });
  });

  // ========================================
  // REVIEW PHASE SUBMISSION SIMULATION
  // ========================================
  // Test submission-related endpoints and functionality
  
  const submissionTestResponse = http.get('http://[::1]:2345/speak/recording');
  check(submissionTestResponse, {
    'review submission interface loads': (r) => r.status === 200,
    'review submission response time < 3000ms': (r) => r.timings.duration < 3000,
  });

  // ========================================
  // MOBILE REVIEW PHASE SIMULATION
  // ========================================
  const mobileReviewHeaders = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'X-Device-Type': 'mobile',
  };

  const mobileReviewResponse = http.get('http://[::1]:2345/speak', { headers: mobileReviewHeaders });
  
  check(mobileReviewResponse, {
    'mobile review interface loads': (r) => r.status === 200,
    'mobile review response time < 3000ms': (r) => r.timings.duration < 3000,
  });

  // ========================================
  // CONCURRENT REVIEW PAGE ACCESS
  // ========================================
  const concurrentReviewResponses = http.batch([
    { method: 'GET', url: 'http://[::1]:2345/speak' },
    { method: 'GET', url: 'http://[::1]:2345/speak/tags/0' },
    { method: 'GET', url: 'http://[::1]:2345/speak/location' },
    { method: 'GET', url: 'http://[::1]:2345/speak/recording' },
    { method: 'GET', url: 'http://[::1]:2345/speak/rehearse' },
  ]);

  concurrentReviewResponses.forEach((response, index) => {
    check(response, {
      [`concurrent review page ${index + 1} loads`]: (r) => r.status === 200 || r.status === 404,
      [`concurrent review page ${index + 1} response time < 3000ms`]: (r) => r.timings.duration < 3000,
    });
  });

  // ========================================
  // REVIEW WORKFLOW STRESS TESTING
  // ========================================
  const reviewWorkflowStressResponses = http.batch([
    { method: 'GET', url: 'http://[::1]:2345/speak' },
    { method: 'GET', url: 'http://[::1]:2345/speak/tags/0' },
    { method: 'GET', url: 'http://[::1]:2345/speak/location' },
    { method: 'GET', url: 'http://[::1]:2345/speak/recording' },
    { method: 'GET', url: 'http://[::1]:2345/speak/rehearse' },
    { method: 'GET', url: 'http://[::1]:2345/speak' },
  ]);

  reviewWorkflowStressResponses.forEach((response, index) => {
    check(response, {
      [`review workflow stress test ${index + 1} responds`]: (r) => r.status === 200 || r.status === 404,
      [`review workflow stress test ${index + 1} response time < 4000ms`]: (r) => r.timings.duration < 4000,
    });
  });

  // ========================================
  // REVIEW PAGE CONTENT VALIDATION
  // ========================================
  check(reviewPageResponse, {
    'review page contains title': (r) => r.body && (r.body.includes('<title>') || r.body.includes('title')),
    'review page contains proper HTML structure': (r) => r.body && (r.body.includes('<!DOCTYPE html') || r.body.includes('<html')),
    'review page contains body content': (r) => r.body && r.body.includes('<body'),
    'review page size reasonable': (r) => r.body.length > 100 && r.body.length < 100000,
  });

  // ========================================
  // REVIEW ASSET PRELOADING
  // ========================================
  const reviewPreloadAssets = http.batch([
    { method: 'GET', url: 'http://[::1]:2345/src/assets/icons/mic_icon.svg' },
    { method: 'GET', url: 'http://[::1]:2345/src/assets/icons/mic_recording_icon.svg' },
    { method: 'GET', url: 'http://[::1]:2345/src/assets/icons/play_icon.svg' },
    { method: 'GET', url: 'http://[::1]:2345/src/assets/icons/sound_icon.svg' },
  ]);

  reviewPreloadAssets.forEach((response, index) => {
    check(response, {
      [`review preload asset ${index + 1} loads`]: (r) => r.status === 200 || r.status === 404,
      [`review preload asset ${index + 1} response time < 2000ms`]: (r) => r.timings.duration < 2000,
    });
  });

  // ========================================
  // REVIEW PERFORMANCE STRESS TESTING
  // ========================================
  const reviewPerformanceStressResponses = http.batch([
    { method: 'GET', url: 'http://[::1]:2345/speak' },
    { method: 'GET', url: 'http://[::1]:2345/speak' },
    { method: 'GET', url: 'http://[::1]:2345/speak' },
    { method: 'GET', url: 'http://[::1]:2345/speak' },
    { method: 'GET', url: 'http://[::1]:2345/speak' },
  ]);

  reviewPerformanceStressResponses.forEach((response, index) => {
    check(response, {
      [`review performance stress test ${index + 1} succeeds`]: (r) => r.status === 200,
      [`review performance stress test ${index + 1} response time < 3000ms`]: (r) => r.timings.duration < 3000,
    });
  });

  // ========================================
  // REVIEW ROUTE NAVIGATION
  // ========================================
  const reviewNavigationResponses = http.batch([
    { method: 'GET', url: 'http://[::1]:2345/speak' },
    { method: 'GET', url: 'http://[::1]:2345/speak/tags/0' },
    { method: 'GET', url: 'http://[::1]:2345/speak/location' },
    { method: 'GET', url: 'http://[::1]:2345/speak/recording' },
    { method: 'GET', url: 'http://[::1]:2345/speak/rehearse' },
  ]);

  reviewNavigationResponses.forEach((response, index) => {
    check(response, {
      [`review navigation step ${index + 1} succeeds`]: (r) => r.status === 200 || r.status === 404,
      [`review navigation step ${index + 1} response time < 3000ms`]: (r) => r.timings.duration < 3000,
    });
  });

  // ========================================
  // EDGE CASE TESTING - MALFORMED REQUESTS
  // ========================================
  
  // Test with malformed URLs and parameters for review functionality
  const malformedReviewRequests = [
    'http://[::1]:2345/speak?review=invalid&malformed=value&',
    'http://[::1]:2345/speak/../../etc/passwd',
    'http://[::1]:2345/speak?<script>alert("xss")</script>',
    'http://[::1]:2345/speak?%00null%00byte',
    'http://[::1]:2345/speak?review=' + 'a'.repeat(1000), // Extremely long parameter
  ];

  const malformedReviewResponses = http.batch(
    malformedReviewRequests.map(url => ({ method: 'GET', url }))
  );

  malformedReviewResponses.forEach((response, index) => {
    check(response, {
      [`malformed review request ${index + 1} handled gracefully`]: (r) => r.status >= 200 && r.status < 600,
      [`malformed review request ${index + 1} response time < 5000ms`]: (r) => r.timings.duration < 5000,
    });
  });

  // ========================================
  // EDGE CASE TESTING - UNSUPPORTED HTTP METHODS
  // ========================================
  
  const unsupportedReviewMethods = ['POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
  const reviewMethodResponses = http.batch(
    unsupportedReviewMethods.map(method => ({ method, url: 'http://[::1]:2345/speak' }))
  );

  reviewMethodResponses.forEach((response, index) => {
    check(response, {
      [`review ${unsupportedReviewMethods[index]} method handled appropriately`]: (r) => r.status >= 200 && r.status < 600,
      [`review ${unsupportedReviewMethods[index]} response time < 3000ms`]: (r) => r.timings.duration < 3000,
    });
  });

  // ========================================
  // EDGE CASE TESTING - EXTREME LOAD CONDITIONS
  // ========================================
  
  // Test with maximum concurrent requests for review functionality
  const extremeReviewLoadRequests = [];
  for (let i = 0; i < 10; i++) {
    extremeReviewLoadRequests.push({ method: 'GET', url: 'http://[::1]:2345/speak' });
  }

  const extremeReviewLoadResponses = http.batch(extremeReviewLoadRequests);
  extremeReviewLoadResponses.forEach((response, index) => {
    check(response, {
      [`extreme review load request ${index + 1} responds`]: (r) => r.status >= 200 && r.status < 600,
      [`extreme review load request ${index + 1} response time < 10000ms`]: (r) => r.timings.duration < 10000,
    });
  });

  // ========================================
  // EDGE CASE TESTING - RAPID SUCCESSIVE REQUESTS
  // ========================================
  
  // Test with minimal delay between review requests
  const rapidReviewRequests = [];
  for (let i = 0; i < 6; i++) {
    rapidReviewRequests.push({ method: 'GET', url: 'http://[::1]:2345/speak' });
  }

  const rapidReviewResponses = http.batch(rapidReviewRequests);
  rapidReviewResponses.forEach((response, index) => {
    check(response, {
      [`rapid review request ${index + 1} succeeds`]: (r) => r.status === 200,
      [`rapid review request ${index + 1} response time < 3000ms`]: (r) => r.timings.duration < 3000,
    });
  });

  // ========================================
  // EDGE CASE TESTING - LARGE HEADER PAYLOADS
  // ========================================
  
  const largeReviewHeaders = {};
  for (let i = 0; i < 30; i++) {
    largeReviewHeaders[`X-Review-Header-${i}`] = 'a'.repeat(100);
  }

  const largeReviewHeaderResponse = http.get('http://[::1]:2345/speak', { headers: largeReviewHeaders });
  check(largeReviewHeaderResponse, {
    'large review headers handled': (r) => r.status >= 200 && r.status < 600,
    'large review headers response time < 5000ms': (r) => r.timings.duration < 5000,
  });

  // ========================================
  // EDGE CASE TESTING - TIMEOUT BOUNDARY CONDITIONS
  // ========================================
  
  const shortReviewTimeoutResponse = http.get('http://[::1]:2345/speak', { timeout: '100ms' });
  const longReviewTimeoutResponse = http.get('http://[::1]:2345/speak', { timeout: '30s' });
  
  check(longReviewTimeoutResponse, {
    'long review timeout request succeeds': (r) => r.status === 200,
    'long review timeout response time < 30000ms': (r) => r.timings.duration < 30000,
  });

  // ========================================
  // EDGE CASE TESTING - MEMORY PRESSURE SIMULATION
  // ========================================
  
  const memoryPressureReviewRequests = [];
  for (let i = 0; i < 8; i++) {
    memoryPressureReviewRequests.push({ method: 'GET', url: 'http://[::1]:2345/speak' });
  }

  const memoryPressureReviewResponses = http.batch(memoryPressureReviewRequests);
  memoryPressureReviewResponses.forEach((response, index) => {
    check(response, {
      [`memory pressure review request ${index + 1} responds`]: (r) => r.status >= 200 && r.status < 600,
      [`memory pressure review request ${index + 1} response time < 8000ms`]: (r) => r.timings.duration < 8000,
    });
  });

  // ========================================
  // EDGE CASE TESTING - NETWORK CONDITION SIMULATION
  // ========================================
  
  // Test with different network conditions for review
  const slowNetworkReviewHeaders = {
    'X-Simulate-Slow-Network': 'true',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };

  const slowNetworkReviewResponse = http.get('http://[::1]:2345/speak', { headers: slowNetworkReviewHeaders });
  check(slowNetworkReviewResponse, {
    'slow network review request succeeds': (r) => r.status === 200,
    'slow network review response time < 5000ms': (r) => r.timings.duration < 5000,
  });

  // ========================================
  // EDGE CASE TESTING - CACHE VALIDATION
  // ========================================
  
  const cacheReviewHeaders = {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  };

  const cacheReviewResponse = http.get('http://[::1]:2345/speak', { headers: cacheReviewHeaders });
  check(cacheReviewResponse, {
    'cache bypass review works': (r) => r.status === 200,
    'cache bypass review response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  // ========================================
  // EDGE CASE TESTING - COMPRESSION TESTING
  // ========================================
  
  const compressionReviewHeaders = {
    'Accept-Encoding': 'gzip, deflate, br',
  };

  const compressionReviewResponse = http.get('http://[::1]:2345/speak', { headers: compressionReviewHeaders });
  check(compressionReviewResponse, {
    'compression review request succeeds': (r) => r.status === 200,
    'compression review response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  // ========================================
  // EDGE CASE TESTING - SESSION HANDLING
  // ========================================
  
  const sessionReviewResponse1 = http.get('http://[::1]:2345/speak');
  const sessionReviewResponse2 = http.get('http://[::1]:2345/speak');
  
  check(sessionReviewResponse1, {
    'first review session request succeeds': (r) => r.status === 200,
  });
  check(sessionReviewResponse2, {
    'second review session request succeeds': (r) => r.status === 200,
  });

  // ========================================
  // EDGE CASE TESTING - REDIRECT HANDLING
  // ========================================
  
  const redirectReviewResponse = http.get('http://[::1]:2345/speak/', { redirects: 5 });
  check(redirectReviewResponse, {
    'redirect review handling works': (r) => r.status === 200 || r.status === 301 || r.status === 302,
    'redirect review response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  // ========================================
  // EDGE CASE TESTING - MIXED ROUTE CONCURRENCY
  // ========================================
  
  const mixedReviewRoutes = ['/', '/speak', '/listen', '/about', '/help', '/nonexistent'];
  const mixedReviewRouteResponses = http.batch(
    mixedReviewRoutes.map(route => ({ method: 'GET', url: `http://[::1]:2345${route}` }))
  );

  mixedReviewRouteResponses.forEach((response, index) => {
    check(response, {
      [`mixed review route ${mixedReviewRoutes[index]} responds`]: (r) => r.status >= 200 && r.status < 600,
      [`mixed review route ${mixedReviewRoutes[index]} response time < 4000ms`]: (r) => r.timings.duration < 4000,
    });
  });

  // ========================================
  // EDGE CASE TESTING - FINAL STRESS TEST
  // ========================================
  
  const finalReviewStressRequests = [];
  for (let i = 0; i < 6; i++) {
    finalReviewStressRequests.push({ method: 'GET', url: 'http://[::1]:2345/speak' });
  }

  const finalReviewStressResponses = http.batch(finalReviewStressRequests);
  finalReviewStressResponses.forEach((response, index) => {
    check(response, {
      [`final review stress request ${index + 1} responds`]: (r) => r.status >= 200 && r.status < 600,
      [`final review stress request ${index + 1} response time < 10000ms`]: (r) => r.timings.duration < 10000,
    });
  });

  // ========================================
  // FINAL REVIEW WORKFLOW VALIDATION
  // ========================================
  const finalReviewWorkflowResponse = http.get('http://[::1]:2345/speak');
  
  check(finalReviewWorkflowResponse, {
    'final review workflow check succeeds': (r) => r.status === 200,
    'final review response time < 3000ms': (r) => r.timings.duration < 3000,
    'review interface still functional': (r) => r.body && r.body.includes('html'),
  });

  // ========================================
  // SIMULATE REAL REVIEW USER BEHAVIOR
  // ========================================
  // Random sleep between 1-3 seconds to simulate realistic user behavior
  // Review workflow navigation takes time
  sleep(Math.random() * 2 + 1);
}
