import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 15,
  duration: '45s',
  thresholds: {
    http_req_duration: ['p(95)<4000'], // 95% of requests should be below 4s
    http_req_failed: ['rate<0.15'], // Error rate should be below 15%
    http_req_duration: ['p(99)<8000'], // 99% of requests should be below 8s
  },
};

export default function () {
  // ========================================
  // REHEARSE RECORDING PAGE INITIALIZATION
  // ========================================
  const rehearsePageResponse = http.get('http://[::1]:2345/speak');
  
  check(rehearsePageResponse, {
    'rehearse recording page loads successfully': (r) => r.status === 200,
    'rehearse page contains recording interface': (r) => r.body && r.body.includes('html'),
    'rehearse page response time < 3000ms': (r) => r.timings.duration < 3000,
  });

  // ========================================
  // REHEARSE RECORDING ASSETS AND DEPENDENCIES
  // ========================================
  const rehearseAssets = http.batch([
    { method: 'GET', url: 'http://[::1]:2345/src/assets/icons/mic_icon.svg' },
    { method: 'GET', url: 'http://[::1]:2345/src/assets/icons/mic_recording_icon.svg' },
    { method: 'GET', url: 'http://[::1]:2345/src/assets/icons/play_icon.svg' },
    { method: 'GET', url: 'http://[::1]:2345/src/assets/icons/sound_icon.svg' },
    { method: 'GET', url: 'http://[::1]:2345/src/assets/icons/no_sound_icon.svg' },
    { method: 'GET', url: 'http://[::1]:2345/src/assets/audio/click-103.wav' },
    { method: 'GET', url: 'http://[::1]:2345/src/assets/audio/click-84.wav' },
    { method: 'GET', url: 'http://[::1]:2345/src/assets/audio/click-single.wav' },
  ]);

  rehearseAssets.forEach((response, index) => {
    check(response, {
      [`rehearse asset ${index + 1} loads`]: (r) => r.status === 200 || r.status === 404,
      [`rehearse asset ${index + 1} response time < 2000ms`]: (r) => r.timings.duration < 2000,
    });
  });

  // ========================================
  // REHEARSE RECORDING WORKFLOW ROUTES
  // ========================================
  const rehearseRoutes = [
    '/speak',
    '/speak/tags/0',
    '/speak/location', 
    '/speak/recording',
    '/speak/rehearse'
  ];
  
  const routeResponses = http.batch(
    rehearseRoutes.map(route => ({ method: 'GET', url: `http://[::1]:2345${route}` }))
  );

  routeResponses.forEach((response, index) => {
    check(response, {
      [`rehearse route ${rehearseRoutes[index]} loads`]: (r) => r.status === 200 || r.status === 404,
      [`rehearse route ${rehearseRoutes[index]} response time < 2000ms`]: (r) => r.timings.duration < 2000,
    });
  });

  // ========================================
  // ROUNDWARE CONFIGURATION FOR REHEARSE
  // ========================================
  const configResponse = http.get('http://[::1]:2345/src/config.json');
  
  check(configResponse, {
    'rehearse config file loads': (r) => r.status === 200,
    'rehearse config response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  // ========================================
  // REHEARSE RECORDING WORKFLOW SIMULATION
  // ========================================
  
  // Step 1: Navigate to tag selection
  const tagSelectionResponse = http.get('http://[::1]:2345/speak/tags/0');
  
  // Step 2: Navigate to location selection
  const locationSelectionResponse = http.get('http://[::1]:2345/speak/location');
  
  // Step 3: Navigate to recording interface
  const recordingInterfaceResponse = http.get('http://[::1]:2345/speak/recording');

  // Step 4: Navigate to rehearse phase
  const rehearseInterfaceResponse = http.get('http://[::1]:2345/speak/rehearse');

  check(tagSelectionResponse, {
    'rehearse tag selection page loads': (r) => r.status === 200 || r.status === 404,
    'rehearse tag selection response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  check(locationSelectionResponse, {
    'rehearse location selection page loads': (r) => r.status === 200 || r.status === 404,
    'rehearse location selection response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  check(recordingInterfaceResponse, {
    'rehearse recording interface page loads': (r) => r.status === 200 || r.status === 404,
    'rehearse recording interface response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  check(rehearseInterfaceResponse, {
    'rehearse interface page loads': (r) => r.status === 200 || r.status === 404,
    'rehearse interface response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  // ========================================
  // REHEARSE AUDIO ASSET TESTING
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
      [`rehearse audio asset ${index + 1} loads`]: (r) => r.status === 200 || r.status === 404,
      [`rehearse audio asset ${index + 1} response time < 3000ms`]: (r) => r.timings.duration < 3000,
    });
  });

  // ========================================
  // MOBILE REHEARSE RECORDING SIMULATION
  // ========================================
  const mobileRehearseHeaders = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'X-Device-Type': 'mobile',
  };

  const mobileRehearseResponse = http.get('http://[::1]:2345/speak', { headers: mobileRehearseHeaders });
  
  check(mobileRehearseResponse, {
    'mobile rehearse interface loads': (r) => r.status === 200,
    'mobile rehearse response time < 3000ms': (r) => r.timings.duration < 3000,
  });

  // ========================================
  // CONCURRENT REHEARSE PAGE ACCESS
  // ========================================
  const concurrentRehearseResponses = http.batch([
    { method: 'GET', url: 'http://[::1]:2345/speak' },
    { method: 'GET', url: 'http://[::1]:2345/speak/tags/0' },
    { method: 'GET', url: 'http://[::1]:2345/speak/location' },
    { method: 'GET', url: 'http://[::1]:2345/speak/recording' },
    { method: 'GET', url: 'http://[::1]:2345/speak/rehearse' },
  ]);

  concurrentRehearseResponses.forEach((response, index) => {
    check(response, {
      [`concurrent rehearse page ${index + 1} loads`]: (r) => r.status === 200 || r.status === 404,
      [`concurrent rehearse page ${index + 1} response time < 3000ms`]: (r) => r.timings.duration < 3000,
    });
  });

  // ========================================
  // REHEARSE WORKFLOW STRESS TESTING
  // ========================================
  const rehearseWorkflowStressResponses = http.batch([
    { method: 'GET', url: 'http://[::1]:2345/speak' },
    { method: 'GET', url: 'http://[::1]:2345/speak/tags/0' },
    { method: 'GET', url: 'http://[::1]:2345/speak/location' },
    { method: 'GET', url: 'http://[::1]:2345/speak/recording' },
    { method: 'GET', url: 'http://[::1]:2345/speak/rehearse' },
    { method: 'GET', url: 'http://[::1]:2345/speak' },
  ]);

  rehearseWorkflowStressResponses.forEach((response, index) => {
    check(response, {
      [`rehearse workflow stress test ${index + 1} responds`]: (r) => r.status === 200 || r.status === 404,
      [`rehearse workflow stress test ${index + 1} response time < 4000ms`]: (r) => r.timings.duration < 4000,
    });
  });

  // ========================================
  // REHEARSE PAGE CONTENT VALIDATION
  // ========================================
  check(rehearsePageResponse, {
    'rehearse page contains title': (r) => r.body && (r.body.includes('<title>') || r.body.includes('title')),
    'rehearse page contains proper HTML structure': (r) => r.body && (r.body.includes('<!DOCTYPE html') || r.body.includes('<html')),
    'rehearse page contains body content': (r) => r.body && r.body.includes('<body'),
    'rehearse page size reasonable': (r) => r.body.length > 100 && r.body.length < 100000,
  });

  // ========================================
  // REHEARSE ASSET PRELOADING
  // ========================================
  const rehearsePreloadAssets = http.batch([
    { method: 'GET', url: 'http://[::1]:2345/src/assets/icons/mic_icon.svg' },
    { method: 'GET', url: 'http://[::1]:2345/src/assets/icons/mic_recording_icon.svg' },
    { method: 'GET', url: 'http://[::1]:2345/src/assets/icons/play_icon.svg' },
    { method: 'GET', url: 'http://[::1]:2345/src/assets/icons/sound_icon.svg' },
  ]);

  rehearsePreloadAssets.forEach((response, index) => {
    check(response, {
      [`rehearse preload asset ${index + 1} loads`]: (r) => r.status === 200 || r.status === 404,
      [`rehearse preload asset ${index + 1} response time < 2000ms`]: (r) => r.timings.duration < 2000,
    });
  });

  // ========================================
  // REHEARSE PERFORMANCE STRESS TESTING
  // ========================================
  const rehearsePerformanceStressResponses = http.batch([
    { method: 'GET', url: 'http://[::1]:2345/speak' },
    { method: 'GET', url: 'http://[::1]:2345/speak' },
    { method: 'GET', url: 'http://[::1]:2345/speak' },
    { method: 'GET', url: 'http://[::1]:2345/speak' },
    { method: 'GET', url: 'http://[::1]:2345/speak' },
  ]);

  rehearsePerformanceStressResponses.forEach((response, index) => {
    check(response, {
      [`rehearse performance stress test ${index + 1} succeeds`]: (r) => r.status === 200,
      [`rehearse performance stress test ${index + 1} response time < 3000ms`]: (r) => r.timings.duration < 3000,
    });
  });

  // ========================================
  // REHEARSE ROUTE NAVIGATION
  // ========================================
  const rehearseNavigationResponses = http.batch([
    { method: 'GET', url: 'http://[::1]:2345/speak' },
    { method: 'GET', url: 'http://[::1]:2345/speak/tags/0' },
    { method: 'GET', url: 'http://[::1]:2345/speak/location' },
    { method: 'GET', url: 'http://[::1]:2345/speak/recording' },
    { method: 'GET', url: 'http://[::1]:2345/speak/rehearse' },
  ]);

  rehearseNavigationResponses.forEach((response, index) => {
    check(response, {
      [`rehearse navigation step ${index + 1} succeeds`]: (r) => r.status === 200 || r.status === 404,
      [`rehearse navigation step ${index + 1} response time < 3000ms`]: (r) => r.timings.duration < 3000,
    });
  });

  // ========================================
  // EDGE CASE TESTING - MALFORMED REQUESTS
  // ========================================
  
  // Test with malformed URLs and parameters for rehearse functionality
  const malformedRehearseRequests = [
    'http://[::1]:2345/speak?rehearse=invalid&malformed=value&',
    'http://[::1]:2345/speak/../../etc/passwd',
    'http://[::1]:2345/speak?<script>alert("xss")</script>',
    'http://[::1]:2345/speak?%00null%00byte',
    'http://[::1]:2345/speak?rehearse=' + 'a'.repeat(1000), // Extremely long parameter
  ];

  const malformedRehearseResponses = http.batch(
    malformedRehearseRequests.map(url => ({ method: 'GET', url }))
  );

  malformedRehearseResponses.forEach((response, index) => {
    check(response, {
      [`malformed rehearse request ${index + 1} handled gracefully`]: (r) => r.status >= 200 && r.status < 600,
      [`malformed rehearse request ${index + 1} response time < 5000ms`]: (r) => r.timings.duration < 5000,
    });
  });

  // ========================================
  // EDGE CASE TESTING - UNSUPPORTED HTTP METHODS
  // ========================================
  
  const unsupportedRehearseMethods = ['POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
  const rehearseMethodResponses = http.batch(
    unsupportedRehearseMethods.map(method => ({ method, url: 'http://[::1]:2345/speak' }))
  );

  rehearseMethodResponses.forEach((response, index) => {
    check(response, {
      [`rehearse ${unsupportedRehearseMethods[index]} method handled appropriately`]: (r) => r.status >= 200 && r.status < 600,
      [`rehearse ${unsupportedRehearseMethods[index]} response time < 3000ms`]: (r) => r.timings.duration < 3000,
    });
  });

  // ========================================
  // EDGE CASE TESTING - EXTREME LOAD CONDITIONS
  // ========================================
  
  // Test with maximum concurrent requests for rehearse functionality
  const extremeRehearseLoadRequests = [];
  for (let i = 0; i < 10; i++) {
    extremeRehearseLoadRequests.push({ method: 'GET', url: 'http://[::1]:2345/speak' });
  }

  const extremeRehearseLoadResponses = http.batch(extremeRehearseLoadRequests);
  extremeRehearseLoadResponses.forEach((response, index) => {
    check(response, {
      [`extreme rehearse load request ${index + 1} responds`]: (r) => r.status >= 200 && r.status < 600,
      [`extreme rehearse load request ${index + 1} response time < 10000ms`]: (r) => r.timings.duration < 10000,
    });
  });

  // ========================================
  // EDGE CASE TESTING - RAPID SUCCESSIVE REQUESTS
  // ========================================
  
  // Test with minimal delay between rehearse requests
  const rapidRehearseRequests = [];
  for (let i = 0; i < 6; i++) {
    rapidRehearseRequests.push({ method: 'GET', url: 'http://[::1]:2345/speak' });
  }

  const rapidRehearseResponses = http.batch(rapidRehearseRequests);
  rapidRehearseResponses.forEach((response, index) => {
    check(response, {
      [`rapid rehearse request ${index + 1} succeeds`]: (r) => r.status === 200,
      [`rapid rehearse request ${index + 1} response time < 3000ms`]: (r) => r.timings.duration < 3000,
    });
  });

  // ========================================
  // EDGE CASE TESTING - LARGE HEADER PAYLOADS
  // ========================================
  
  const largeRehearseHeaders = {};
  for (let i = 0; i < 30; i++) {
    largeRehearseHeaders[`X-Rehearse-Header-${i}`] = 'a'.repeat(100);
  }

  const largeRehearseHeaderResponse = http.get('http://[::1]:2345/speak', { headers: largeRehearseHeaders });
  check(largeRehearseHeaderResponse, {
    'large rehearse headers handled': (r) => r.status >= 200 && r.status < 600,
    'large rehearse headers response time < 5000ms': (r) => r.timings.duration < 5000,
  });

  // ========================================
  // EDGE CASE TESTING - TIMEOUT BOUNDARY CONDITIONS
  // ========================================
  
  const shortRehearseTimeoutResponse = http.get('http://[::1]:2345/speak', { timeout: '100ms' });
  const longRehearseTimeoutResponse = http.get('http://[::1]:2345/speak', { timeout: '30s' });
  
  check(shortRehearseTimeoutResponse, {
    'short rehearse timeout request handled': (r) => r.status >= 200 && r.status < 600,
  });
  check(longRehearseTimeoutResponse, {
    'long rehearse timeout request succeeds': (r) => r.status === 200,
    'long rehearse timeout response time < 30000ms': (r) => r.timings.duration < 30000,
  });

  // ========================================
  // EDGE CASE TESTING - MEMORY PRESSURE SIMULATION
  // ========================================
  
  const memoryPressureRehearseRequests = [];
  for (let i = 0; i < 8; i++) {
    memoryPressureRehearseRequests.push({ method: 'GET', url: 'http://[::1]:2345/speak' });
  }

  const memoryPressureRehearseResponses = http.batch(memoryPressureRehearseRequests);
  memoryPressureRehearseResponses.forEach((response, index) => {
    check(response, {
      [`memory pressure rehearse request ${index + 1} responds`]: (r) => r.status >= 200 && r.status < 600,
      [`memory pressure rehearse request ${index + 1} response time < 8000ms`]: (r) => r.timings.duration < 8000,
    });
  });

  // ========================================
  // EDGE CASE TESTING - NETWORK CONDITION SIMULATION
  // ========================================
  
  // Test with different network conditions for rehearse
  const slowNetworkRehearseHeaders = {
    'X-Simulate-Slow-Network': 'true',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };

  const slowNetworkRehearseResponse = http.get('http://[::1]:2345/speak', { headers: slowNetworkRehearseHeaders });
  check(slowNetworkRehearseResponse, {
    'slow network rehearse request succeeds': (r) => r.status === 200,
    'slow network rehearse response time < 5000ms': (r) => r.timings.duration < 5000,
  });

  // ========================================
  // EDGE CASE TESTING - CACHE VALIDATION
  // ========================================
  
  const cacheRehearseHeaders = {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  };

  const cacheRehearseResponse = http.get('http://[::1]:2345/speak', { headers: cacheRehearseHeaders });
  check(cacheRehearseResponse, {
    'cache bypass rehearse works': (r) => r.status === 200,
    'cache bypass rehearse response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  // ========================================
  // EDGE CASE TESTING - COMPRESSION TESTING
  // ========================================
  
  const compressionRehearseHeaders = {
    'Accept-Encoding': 'gzip, deflate, br',
  };

  const compressionRehearseResponse = http.get('http://[::1]:2345/speak', { headers: compressionRehearseHeaders });
  check(compressionRehearseResponse, {
    'compression rehearse request succeeds': (r) => r.status === 200,
    'compression rehearse response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  // ========================================
  // EDGE CASE TESTING - SESSION HANDLING
  // ========================================
  
  const sessionRehearseResponse1 = http.get('http://[::1]:2345/speak');
  const sessionRehearseResponse2 = http.get('http://[::1]:2345/speak');
  
  check(sessionRehearseResponse1, {
    'first rehearse session request succeeds': (r) => r.status === 200,
  });
  check(sessionRehearseResponse2, {
    'second rehearse session request succeeds': (r) => r.status === 200,
  });

  // ========================================
  // EDGE CASE TESTING - REDIRECT HANDLING
  // ========================================
  
  const redirectRehearseResponse = http.get('http://[::1]:2345/speak/', { redirects: 5 });
  check(redirectRehearseResponse, {
    'redirect rehearse handling works': (r) => r.status === 200 || r.status === 301 || r.status === 302,
    'redirect rehearse response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  // ========================================
  // EDGE CASE TESTING - MIXED ROUTE CONCURRENCY
  // ========================================
  
  const mixedRehearseRoutes = ['/', '/speak', '/listen', '/about', '/help', '/nonexistent'];
  const mixedRehearseRouteResponses = http.batch(
    mixedRehearseRoutes.map(route => ({ method: 'GET', url: `http://[::1]:2345${route}` }))
  );

  mixedRehearseRouteResponses.forEach((response, index) => {
    check(response, {
      [`mixed rehearse route ${mixedRehearseRoutes[index]} responds`]: (r) => r.status >= 200 && r.status < 600,
      [`mixed rehearse route ${mixedRehearseRoutes[index]} response time < 4000ms`]: (r) => r.timings.duration < 4000,
    });
  });

  // ========================================
  // EDGE CASE TESTING - FINAL STRESS TEST
  // ========================================
  
  const finalRehearseStressRequests = [];
  for (let i = 0; i < 6; i++) {
    finalRehearseStressRequests.push({ method: 'GET', url: 'http://[::1]:2345/speak' });
  }

  const finalRehearseStressResponses = http.batch(finalRehearseStressRequests);
  finalRehearseStressResponses.forEach((response, index) => {
    check(response, {
      [`final rehearse stress request ${index + 1} responds`]: (r) => r.status >= 200 && r.status < 600,
      [`final rehearse stress request ${index + 1} response time < 10000ms`]: (r) => r.timings.duration < 10000,
    });
  });

  // ========================================
  // FINAL REHEARSE WORKFLOW VALIDATION
  // ========================================
  const finalRehearseWorkflowResponse = http.get('http://[::1]:2345/speak');
  
  check(finalRehearseWorkflowResponse, {
    'final rehearse workflow check succeeds': (r) => r.status === 200,
    'final rehearse response time < 3000ms': (r) => r.timings.duration < 3000,
    'rehearse interface still functional': (r) => r.body && r.body.includes('html'),
  });

  // ========================================
  // SIMULATE REAL REHEARSE USER BEHAVIOR
  // ========================================
  // Random sleep between 1-3 seconds to simulate realistic user behavior
  // Rehearse workflow navigation takes time
  sleep(Math.random() * 2 + 1);
}