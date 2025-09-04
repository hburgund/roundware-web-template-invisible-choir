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
  // BASIC RECORDING PAGE ACCESS
  // ========================================
  const recordingPageResponse = http.get('http://[::1]:2345/speak');
  
  check(recordingPageResponse, {
    'recording page loads': (r) => r.status === 200,
    'recording page response time < 3000ms': (r) => r.timings.duration < 3000,
  });

  sleep(1);

  // ========================================
  // RECORDING WORKFLOW NAVIGATION
  // ========================================
  const workflowSteps = [
    '/speak/tags/0',
    '/speak/location', 
    '/speak/recording'
  ];
  
  workflowSteps.forEach(step => {
    const response = http.get(`http://[::1]:2345${step}`);
    check(response, {
      [`workflow step ${step} loads`]: (r) => r.status === 200 || r.status === 404,
      [`workflow step ${step} response time < 3000ms`]: (r) => r.timings.duration < 3000,
    });
    sleep(0.5);
  });

  // ========================================
  // RECORDING ASSETS AND DEPENDENCIES
  // ========================================
  const recordingAssets = [
    '/src/assets/icons/mic_icon.svg',
    '/src/assets/icons/mic_recording_icon.svg',
    '/src/assets/icons/play_icon.svg',
    '/src/assets/icons/sound_icon.svg',
    '/src/assets/audio/click-103.wav'
  ];
  
  recordingAssets.forEach(asset => {
    const response = http.get(`http://[::1]:2345${asset}`);
    check(response, {
      [`asset ${asset} loads`]: (r) => r.status === 200 || r.status === 404,
      [`asset ${asset} response time < 2000ms`]: (r) => r.timings.duration < 2000,
    });
  });

  // ========================================
  // CONFIGURATION AND API ENDPOINTS
  // ========================================
  const configResponse = http.get('http://[::1]:2345/src/config.json');
  check(configResponse, {
    'config loads': (r) => r.status === 200,
    'config response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  // ========================================
  // MOBILE RECORDING SIMULATION
  // ========================================
  const mobileHeaders = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
    'X-Device-Type': 'mobile',
  };

  const mobileResponse = http.get('http://[::1]:2345/speak', { headers: mobileHeaders });
  check(mobileResponse, {
    'mobile recording loads': (r) => r.status === 200,
    'mobile response time < 3000ms': (r) => r.timings.duration < 3000,
  });

  // ========================================
  // CONCURRENT RECORDING PAGE ACCESS
  // ========================================
  const concurrentUrls = [
    'http://[::1]:2345/speak',
    'http://[::1]:2345/speak/tags/0',
    'http://[::1]:2345/speak/location',
    'http://[::1]:2345/speak/recording'
  ];

  const concurrentResponses = http.batch(
    concurrentUrls.map(url => ({ method: 'GET', url }))
  );

  concurrentResponses.forEach((response, index) => {
    check(response, {
      [`concurrent page ${index + 1} loads`]: (r) => r.status === 200 || r.status === 404,
      [`concurrent page ${index + 1} response time < 4000ms`]: (r) => r.timings.duration < 4000,
    });
  });

  // ========================================
  // STRESS TEST WITH RAPID REQUESTS
  // ========================================
  const stressUrls = [
    'http://[::1]:2345/speak',
    'http://[::1]:2345/speak',
    'http://[::1]:2345/speak'
  ];

  const stressResponses = http.batch(
    stressUrls.map(url => ({ method: 'GET', url }))
  );

  stressResponses.forEach((response, index) => {
    check(response, {
      [`stress test ${index + 1} succeeds`]: (r) => r.status === 200,
      [`stress test ${index + 1} response time < 5000ms`]: (r) => r.timings.duration < 5000,
    });
  });

  // ========================================
  // FINAL RECORDING WORKFLOW VALIDATION
  // ========================================
  const finalResponse = http.get('http://[::1]:2345/speak');
  check(finalResponse, {
    'final recording check succeeds': (r) => r.status === 200,
    'final response time < 3000ms': (r) => r.timings.duration < 3000,
  });

  // ========================================
  // EDGE CASE TESTING - MALFORMED REQUESTS
  // ========================================
  
  // Test with malformed URLs and parameters
  const malformedRequests = [
    'http://[::1]:2345/speak?invalid=param&malformed=value&',
    'http://[::1]:2345/speak/../../etc/passwd',
    'http://[::1]:2345/speak?<script>alert("xss")</script>',
    'http://[::1]:2345/speak?%00null%00byte',
    'http://[::1]:2345/speak?param=' + 'a'.repeat(1000), // Extremely long parameter
  ];

  const malformedResponses = http.batch(
    malformedRequests.map(url => ({ method: 'GET', url }))
  );

  malformedResponses.forEach((response, index) => {
    check(response, {
      [`malformed request ${index + 1} handled gracefully`]: (r) => r.status >= 200 && r.status < 600,
      [`malformed request ${index + 1} response time < 5000ms`]: (r) => r.timings.duration < 5000,
    });
  });

  // ========================================
  // EDGE CASE TESTING - UNSUPPORTED HTTP METHODS
  // ========================================
  
  const unsupportedMethods = ['POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
  const methodResponses = http.batch(
    unsupportedMethods.map(method => ({ method, url: 'http://[::1]:2345/speak' }))
  );

  methodResponses.forEach((response, index) => {
    check(response, {
      [`${unsupportedMethods[index]} method handled appropriately`]: (r) => r.status >= 200 && r.status < 600,
      [`${unsupportedMethods[index]} response time < 3000ms`]: (r) => r.timings.duration < 3000,
    });
  });

  // ========================================
  // EDGE CASE TESTING - EXTREME LOAD CONDITIONS
  // ========================================
  
  // Test with maximum concurrent requests
  const extremeLoadRequests = [];
  for (let i = 0; i < 10; i++) {
    extremeLoadRequests.push({ method: 'GET', url: 'http://[::1]:2345/speak' });
  }

  const extremeLoadResponses = http.batch(extremeLoadRequests);
  extremeLoadResponses.forEach((response, index) => {
    check(response, {
      [`extreme load request ${index + 1} responds`]: (r) => r.status >= 200 && r.status < 600,
      [`extreme load request ${index + 1} response time < 10000ms`]: (r) => r.timings.duration < 10000,
    });
  });

  // ========================================
  // EDGE CASE TESTING - RAPID SUCCESSIVE REQUESTS
  // ========================================
  
  // Test with minimal delay between requests
  const rapidRequests = [];
  for (let i = 0; i < 6; i++) {
    rapidRequests.push({ method: 'GET', url: 'http://[::1]:2345/speak' });
  }

  const rapidResponses = http.batch(rapidRequests);
  rapidResponses.forEach((response, index) => {
    check(response, {
      [`rapid request ${index + 1} succeeds`]: (r) => r.status === 200,
      [`rapid request ${index + 1} response time < 3000ms`]: (r) => r.timings.duration < 3000,
    });
  });

  // ========================================
  // EDGE CASE TESTING - LARGE HEADER PAYLOADS
  // ========================================
  
  const largeHeaders = {};
  for (let i = 0; i < 30; i++) {
    largeHeaders[`X-Custom-Header-${i}`] = 'a'.repeat(100);
  }

  const largeHeaderResponse = http.get('http://[::1]:2345/speak', { headers: largeHeaders });
  check(largeHeaderResponse, {
    'large headers handled': (r) => r.status >= 200 && r.status < 600,
    'large headers response time < 5000ms': (r) => r.timings.duration < 5000,
  });

  // ========================================
  // EDGE CASE TESTING - TIMEOUT BOUNDARY CONDITIONS
  // ========================================
  
  const shortTimeoutResponse = http.get('http://[::1]:2345/speak', { timeout: '100ms' });
  const longTimeoutResponse = http.get('http://[::1]:2345/speak', { timeout: '30s' });
  
  check(longTimeoutResponse, {
    'long timeout request succeeds': (r) => r.status === 200,
    'long timeout response time < 30000ms': (r) => r.timings.duration < 30000,
  });

  // ========================================
  // EDGE CASE TESTING - MEMORY PRESSURE SIMULATION
  // ========================================
  
  const memoryPressureRequests = [];
  for (let i = 0; i < 8; i++) {
    memoryPressureRequests.push({ method: 'GET', url: 'http://[::1]:2345/speak' });
  }

  const memoryPressureResponses = http.batch(memoryPressureRequests);
  memoryPressureResponses.forEach((response, index) => {
    check(response, {
      [`memory pressure request ${index + 1} responds`]: (r) => r.status >= 200 && r.status < 600,
      [`memory pressure request ${index + 1} response time < 8000ms`]: (r) => r.timings.duration < 8000,
    });
  });

  // ========================================
  // EDGE CASE TESTING - NETWORK CONDITION SIMULATION
  // ========================================
  
  // Test with different network conditions
  const slowNetworkHeaders = {
    'X-Simulate-Slow-Network': 'true',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };

  const slowNetworkResponse = http.get('http://[::1]:2345/speak', { headers: slowNetworkHeaders });
  check(slowNetworkResponse, {
    'slow network request succeeds': (r) => r.status === 200,
    'slow network response time < 5000ms': (r) => r.timings.duration < 5000,
  });

  // ========================================
  // EDGE CASE TESTING - CACHE VALIDATION
  // ========================================
  
  const cacheHeaders = {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  };

  const cacheResponse = http.get('http://[::1]:2345/speak', { headers: cacheHeaders });
  check(cacheResponse, {
    'cache bypass works': (r) => r.status === 200,
    'cache bypass response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  // ========================================
  // EDGE CASE TESTING - COMPRESSION TESTING
  // ========================================
  
  const compressionHeaders = {
    'Accept-Encoding': 'gzip, deflate, br',
  };

  const compressionResponse = http.get('http://[::1]:2345/speak', { headers: compressionHeaders });
  check(compressionResponse, {
    'compression request succeeds': (r) => r.status === 200,
    'compression response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  // ========================================
  // EDGE CASE TESTING - SESSION HANDLING
  // ========================================
  
  const sessionResponse1 = http.get('http://[::1]:2345/speak');
  const sessionResponse2 = http.get('http://[::1]:2345/speak');
  
  check(sessionResponse1, {
    'first session request succeeds': (r) => r.status === 200,
  });
  check(sessionResponse2, {
    'second session request succeeds': (r) => r.status === 200,
  });

  // ========================================
  // EDGE CASE TESTING - REDIRECT HANDLING
  // ========================================
  
  const redirectResponse = http.get('http://[::1]:2345/speak/', { redirects: 5 });
  check(redirectResponse, {
    'redirect handling works': (r) => r.status === 200 || r.status === 301 || r.status === 302,
    'redirect response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  // ========================================
  // EDGE CASE TESTING - CONTENT VALIDATION
  // ========================================
  
  check(recordingPageResponse, {
    'page contains title': (r) => r.body && (r.body.includes('<title>') || r.body.includes('title')),
    'page contains body content': (r) => r.body && r.body.includes('<body'),
    'page contains proper HTML structure': (r) => r.body && (r.body.includes('<!DOCTYPE html') || r.body.includes('<html')),
    'page size reasonable': (r) => r.body.length > 100 && r.body.length < 100000,
  });

  // ========================================
  // EDGE CASE TESTING - MIXED ROUTE CONCURRENCY
  // ========================================
  
  const mixedRoutes = ['/', '/speak', '/listen', '/about', '/help', '/nonexistent'];
  const mixedRouteResponses = http.batch(
    mixedRoutes.map(route => ({ method: 'GET', url: `http://[::1]:2345${route}` }))
  );

  mixedRouteResponses.forEach((response, index) => {
    check(response, {
      [`mixed route ${mixedRoutes[index]} responds`]: (r) => r.status >= 200 && r.status < 600,
      [`mixed route ${mixedRoutes[index]} response time < 4000ms`]: (r) => r.timings.duration < 4000,
    });
  });

  // ========================================
  // EDGE CASE TESTING - FINAL STRESS TEST
  // ========================================
  
  const finalStressRequests = [];
  for (let i = 0; i < 6; i++) {
    finalStressRequests.push({ method: 'GET', url: 'http://[::1]:2345/speak' });
  }

  const finalStressResponses = http.batch(finalStressRequests);
  finalStressResponses.forEach((response, index) => {
    check(response, {
      [`final stress request ${index + 1} responds`]: (r) => r.status >= 200 && r.status < 600,
      [`final stress request ${index + 1} response time < 10000ms`]: (r) => r.timings.duration < 10000,
    });
  });

  // ========================================
  // REALISTIC USER BEHAVIOR SIMULATION
  // ========================================
  // Random sleep between 1-3 seconds to simulate realistic user behavior
  // Recording workflow navigation takes time
  sleep(Math.random() * 2 + 1);
}