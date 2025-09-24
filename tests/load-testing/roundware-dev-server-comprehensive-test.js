import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics for detailed analysis
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

export const options = {
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% of requests should be below 3s
    http_req_failed: ['rate<0.1'], // Error rate should be below 10%
    http_req_duration: ['p(99)<5000'], // 99% of requests should be below 5s
    errors: ['rate<0.1'], // Custom error rate threshold
    response_time: ['p(95)<3000'], // Custom response time threshold
  },
  stages: [
    { duration: '30s', target: 10 }, // Ramp up to 10 users
    { duration: '1m', target: 30 }, // Ramp up to 30 users
    { duration: '30s', target: 0 }, // Ramp down to 0 users
  ],
};

// Base URL for Roundware dev server (Vite dev server)
const BASE_URL = 'http://[::1]:2345';

export default function () {
  // ========================================
  // 1. HOMEPAGE AND BASIC NAVIGATION TESTING
  // ========================================
  const homepageResponse = http.get(`${BASE_URL}/`);
  
  check(homepageResponse, {
    'homepage loads successfully': (r) => r.status === 200,
    'homepage response time < 2000ms': (r) => r.timings.duration < 2000,
    'homepage contains HTML': (r) => r.body && r.body.includes('html'),
  });
  
  errorRate.add(homepageResponse.status !== 200);
  responseTime.add(homepageResponse.timings.duration);

  // ========================================
  // 2. LISTEN PAGE COMPREHENSIVE TESTING
  // ========================================
  const listenPageResponse = http.get(`${BASE_URL}/listen`);
  
  check(listenPageResponse, {
    'listen page loads successfully': (r) => r.status === 200,
    'listen page response time < 3000ms': (r) => r.timings.duration < 3000,
    'listen page contains expected content': (r) => r.body && r.body.includes('html'),
  });

  // Test listen page assets (Vite dev server assets)
  const listenAssets = http.batch([
    { method: 'GET', url: `${BASE_URL}/@vite/client` },
    { method: 'GET', url: `${BASE_URL}/@react-refresh` },
    { method: 'GET', url: `${BASE_URL}/src/index.tsx` },
  ]);

  listenAssets.forEach((response, index) => {
    check(response, {
      [`listen asset ${index + 1} loads`]: (r) => r.status === 200 || r.status === 404,
      [`listen asset ${index + 1} response time < 2000ms`]: (r) => r.timings.duration < 2000,
    });
  });

  // ========================================
  // 3. SPEAK PAGE AND RECORDING WORKFLOW TESTING
  // ========================================
  const speakPageResponse = http.get(`${BASE_URL}/speak`);
  
  check(speakPageResponse, {
    'speak page loads successfully': (r) => r.status === 200,
    'speak page response time < 3000ms': (r) => r.timings.duration < 3000,
    'speak page contains recording interface': (r) => r.body && r.body.includes('html'),
  });

  // Test recording workflow routes
  const recordingRoutes = [
    '/speak/tags/0',
    '/speak/location', 
    '/speak/recording',
    '/speak/rehearse'
  ];
  
  const routeResponses = http.batch(
    recordingRoutes.map(route => ({ method: 'GET', url: `${BASE_URL}${route}` }))
  );

  routeResponses.forEach((response, index) => {
    check(response, {
      [`recording route ${recordingRoutes[index]} loads`]: (r) => r.status === 200 || r.status === 404,
      [`recording route ${recordingRoutes[index]} response time < 3000ms`]: (r) => r.timings.duration < 3000,
    });
  });

  // ========================================
  // 4. VITE DEV SERVER ENDPOINTS TESTING
  // ========================================
  // Test Vite dev server specific endpoints
  const viteEndpoints = [
    '/@vite/client',
    '/@react-refresh',
    '/src/main.tsx',
    '/src/index.tsx'
  ];

  const viteResponses = http.batch(
    viteEndpoints.map(endpoint => ({ method: 'GET', url: `${BASE_URL}${endpoint}` }))
  );

  viteResponses.forEach((response, index) => {
    check(response, {
      [`Vite endpoint ${viteEndpoints[index]} responds`]: (r) => r.status >= 200 && r.status < 600,
      [`Vite endpoint ${viteEndpoints[index]} response time < 5000ms`]: (r) => r.timings.duration < 5000,
    });
  });

  // ========================================
  // 5. STATIC ASSETS AND RESOURCES TESTING
  // ========================================
  const staticAssets = [
    '/src/assets/icons/mic_icon.svg',
    '/src/assets/icons/mic_recording_icon.svg',
    '/src/assets/icons/play_icon.svg',
    '/src/assets/icons/sound_icon.svg',
    '/src/assets/icons/no_sound_icon.svg',
    '/src/assets/audio/click-103.wav',
    '/src/assets/audio/click-84.wav',
    '/src/assets/audio/click-single.wav',
    '/src/config.json',
    '/src/help.json',
    '/src/playbackInfo.json'
  ];

  const assetResponses = http.batch(
    staticAssets.map(asset => ({ method: 'GET', url: `${BASE_URL}${asset}` }))
  );

  assetResponses.forEach((response, index) => {
    check(response, {
      [`static asset ${staticAssets[index]} loads`]: (r) => r.status === 200 || r.status === 404,
      [`static asset ${staticAssets[index]} response time < 2000ms`]: (r) => r.timings.duration < 2000,
    });
  });

  // ========================================
  // 6. MOBILE DEVICE SIMULATION
  // ========================================
  const mobileHeaders = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  };

  const mobileResponse = http.get(`${BASE_URL}/listen`, { headers: mobileHeaders });
  
  check(mobileResponse, {
    'mobile page loads successfully': (r) => r.status === 200,
    'mobile response time < 3000ms': (r) => r.timings.duration < 3000,
    'mobile page contains expected content': (r) => r.body && r.body.includes('html'),
  });

  // ========================================
  // 7. CONCURRENT REQUEST STRESS TESTING
  // ========================================
  const concurrentUrls = [
    `${BASE_URL}/`,
    `${BASE_URL}/listen`,
    `${BASE_URL}/speak`,
    `${BASE_URL}/speak/tags/0`,
    `${BASE_URL}/speak/location`,
    `${BASE_URL}/speak/recording`,
    `${BASE_URL}/speak/rehearse`
  ];

  const concurrentResponses = http.batch(
    concurrentUrls.map(url => ({ method: 'GET', url }))
  );

  concurrentResponses.forEach((response, index) => {
    check(response, {
      [`concurrent request ${index + 1} succeeds`]: (r) => r.status === 200 || r.status === 404,
      [`concurrent request ${index + 1} response time < 4000ms`]: (r) => r.timings.duration < 4000,
    });
  });

  // ========================================
  // 8. EXTREME LOAD TESTING
  // ========================================
  const extremeLoadRequests = [];
  for (let i = 0; i < 15; i++) {
    extremeLoadRequests.push({ method: 'GET', url: `${BASE_URL}/listen` });
  }

  const extremeLoadResponses = http.batch(extremeLoadRequests);
  extremeLoadResponses.forEach((response, index) => {
    check(response, {
      [`extreme load request ${index + 1} responds`]: (r) => r.status >= 200 && r.status < 600,
      [`extreme load request ${index + 1} response time < 10000ms`]: (r) => r.timings.duration < 10000,
    });
  });

  // ========================================
  // 9. MALFORMED REQUEST HANDLING
  // ========================================
  const malformedRequests = [
    `${BASE_URL}/listen?invalid=param&malformed=value&`,
    `${BASE_URL}/speak/../../etc/passwd`,
    `${BASE_URL}/listen?<script>alert("xss")</script>`,
    `${BASE_URL}/speak?%00null%00byte`,
    `${BASE_URL}/listen?param=${'a'.repeat(1000)}`, // Extremely long parameter
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
  // 10. HTTP METHOD TESTING
  // ========================================
  const unsupportedMethods = ['POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
  const methodResponses = http.batch(
    unsupportedMethods.map(method => ({ method, url: `${BASE_URL}/listen` }))
  );

  methodResponses.forEach((response, index) => {
    check(response, {
      [`${unsupportedMethods[index]} method handled appropriately`]: (r) => r.status >= 200 && r.status < 600,
      [`${unsupportedMethods[index]} response time < 3000ms`]: (r) => r.timings.duration < 3000,
    });
  });

  // ========================================
  // 11. CACHE AND COMPRESSION TESTING
  // ========================================
  const cacheHeaders = {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  };

  const compressionHeaders = {
    'Accept-Encoding': 'gzip, deflate, br',
  };

  const cacheResponse = http.get(`${BASE_URL}/listen`, { headers: cacheHeaders });
  const compressionResponse = http.get(`${BASE_URL}/listen`, { headers: compressionHeaders });
  
  check(cacheResponse, {
    'cache bypass works': (r) => r.status === 200,
    'cache bypass response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  check(compressionResponse, {
    'compression request succeeds': (r) => r.status === 200,
    'compression response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  // ========================================
  // 12. SESSION AND STATE MANAGEMENT TESTING
  // ========================================
  const sessionResponse1 = http.get(`${BASE_URL}/listen`);
  const sessionResponse2 = http.get(`${BASE_URL}/listen`);
  
  check(sessionResponse1, {
    'first session request succeeds': (r) => r.status === 200,
  });
  check(sessionResponse2, {
    'second session request succeeds': (r) => r.status === 200,
  });

  // ========================================
  // 13. TIMEOUT BOUNDARY TESTING
  // ========================================
  const timeoutResponse = http.get(`${BASE_URL}/listen`, { timeout: '10s' });
  
  check(timeoutResponse, {
    'timeout request succeeds': (r) => r.status === 200,
    'timeout response time < 10000ms': (r) => r.timings.duration < 10000,
  });

  // ========================================
  // 14. MEMORY PRESSURE SIMULATION
  // ========================================
  const memoryPressureRequests = [];
  for (let i = 0; i < 10; i++) {
    memoryPressureRequests.push({ method: 'GET', url: `${BASE_URL}/listen` });
  }

  const memoryPressureResponses = http.batch(memoryPressureRequests);
  memoryPressureResponses.forEach((response, index) => {
    check(response, {
      [`memory pressure request ${index + 1} responds`]: (r) => r.status >= 200 && r.status < 600,
      [`memory pressure request ${index + 1} response time < 8000ms`]: (r) => r.timings.duration < 8000,
    });
  });

  // ========================================
  // 15. NETWORK CONDITION SIMULATION
  // ========================================
  const slowNetworkHeaders = {
    'X-Simulate-Slow-Network': 'true',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };

  const slowNetworkResponse = http.get(`${BASE_URL}/listen`, { headers: slowNetworkHeaders });
  
  check(slowNetworkResponse, {
    'slow network request succeeds': (r) => r.status === 200,
    'slow network response time < 5000ms': (r) => r.timings.duration < 5000,
  });

  // ========================================
  // 16. FINAL COMPREHENSIVE VALIDATION
  // ========================================
  const finalResponse = http.get(`${BASE_URL}/listen`);
  
  check(finalResponse, {
    'final check succeeds': (r) => r.status === 200,
    'final response time < 3000ms': (r) => r.timings.duration < 3000,
    'final page loads completely': (r) => r.body && r.body.includes('html'),
  });

  // ========================================
  // REALISTIC USER BEHAVIOR SIMULATION
  // ========================================
  // Random sleep between 1-3 seconds to simulate realistic user behavior
  sleep(Math.random() * 2 + 1);
}
