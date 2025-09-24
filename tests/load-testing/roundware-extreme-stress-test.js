import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics for stress testing analysis
const errorRate = new Rate('stress_errors');
const responseTime = new Trend('stress_response_time');
const requestCounter = new Counter('stress_requests');
const timeoutCounter = new Counter('stress_timeouts');

export const options = {
  thresholds: {
    http_req_duration: ['p(95)<5000'], // More lenient for stress testing
    http_req_failed: ['rate<0.2'], // Allow up to 20% failure rate under extreme stress
    http_req_duration: ['p(99)<10000'], // 99% of requests should be below 10s
    stress_errors: ['rate<0.2'], // Custom error rate threshold
    stress_response_time: ['p(95)<5000'], // Custom response time threshold
  },
  stages: [
    { duration: '30s', target: 5 }, // Start with 5 users
    { duration: '30s', target: 15 }, // Ramp to 15 users
    { duration: '1m', target: 30 }, // Ramp to 30 users
    { duration: '1m', target: 50 }, // Push to 50 users (beyond normal capacity)
    { duration: '30s', target: 0 }, // Ramp down
  ],
};

// Base URL for Roundware dev server (Vite dev server)
const BASE_URL = 'http://[::1]:2345';

export default function () {
  // ========================================
  // EXTREME CONCURRENT REQUEST BOMBARDMENT
  // ========================================
  const extremeConcurrentRequests = [];
  for (let i = 0; i < 20; i++) {
    extremeConcurrentRequests.push({ method: 'GET', url: `${BASE_URL}/listen` });
  }

  const extremeResponses = http.batch(extremeConcurrentRequests);
  extremeResponses.forEach((response, index) => {
    requestCounter.add(1);
    errorRate.add(response.status !== 200);
    responseTime.add(response.timings.duration);
    
    if (response.timings.duration > 5000) {
      timeoutCounter.add(1);
    }

    check(response, {
      [`extreme concurrent request ${index + 1} responds`]: (r) => r.status >= 200 && r.status < 600,
      [`extreme concurrent request ${index + 1} response time < 15000ms`]: (r) => r.timings.duration < 15000,
    });
  });

  // ========================================
  // RAPID SUCCESSIVE REQUEST STORM
  // ========================================
  const rapidRequests = [];
  for (let i = 0; i < 25; i++) {
    rapidRequests.push({ method: 'GET', url: `${BASE_URL}/speak` });
  }

  const rapidResponses = http.batch(rapidRequests);
  rapidResponses.forEach((response, index) => {
    requestCounter.add(1);
    errorRate.add(response.status !== 200);
    responseTime.add(response.timings.duration);
    
    if (response.timings.duration > 5000) {
      timeoutCounter.add(1);
    }

    check(response, {
      [`rapid request ${index + 1} responds`]: (r) => r.status >= 200 && r.status < 600,
      [`rapid request ${index + 1} response time < 12000ms`]: (r) => r.timings.duration < 12000,
    });
  });

  // ========================================
  // MIXED ROUTE CONCURRENCY STRESS
  // ========================================
  const mixedRoutes = [
    '/',
    '/listen',
    '/speak',
    '/speak/tags/0',
    '/speak/location',
    '/speak/recording',
    '/speak/rehearse',
    '/about',
    '/help'
  ];

  const mixedRouteRequests = [];
  for (let i = 0; i < 30; i++) {
    const randomRoute = mixedRoutes[Math.floor(Math.random() * mixedRoutes.length)];
    mixedRouteRequests.push({ method: 'GET', url: `${BASE_URL}${randomRoute}` });
  }

  const mixedRouteResponses = http.batch(mixedRouteRequests);
  mixedRouteResponses.forEach((response, index) => {
    requestCounter.add(1);
    errorRate.add(response.status !== 200);
    responseTime.add(response.timings.duration);
    
    if (response.timings.duration > 5000) {
      timeoutCounter.add(1);
    }

    check(response, {
      [`mixed route request ${index + 1} responds`]: (r) => r.status >= 200 && r.status < 600,
      [`mixed route request ${index + 1} response time < 10000ms`]: (r) => r.timings.duration < 10000,
    });
  });

  // ========================================
  // ASSET LOADING STRESS TEST
  // ========================================
  const assetRequests = [];
  const assets = [
    '/src/assets/icons/mic_icon.svg',
    '/src/assets/icons/mic_recording_icon.svg',
    '/src/assets/icons/play_icon.svg',
    '/src/assets/icons/sound_icon.svg',
    '/src/assets/audio/click-103.wav',
    '/src/assets/audio/click-84.wav',
    '/src/assets/audio/click-single.wav',
    '/src/config.json',
    '/src/help.json'
  ];

  for (let i = 0; i < 20; i++) {
    const randomAsset = assets[Math.floor(Math.random() * assets.length)];
    assetRequests.push({ method: 'GET', url: `${BASE_URL}${randomAsset}` });
  }

  const assetResponses = http.batch(assetRequests);
  assetResponses.forEach((response, index) => {
    requestCounter.add(1);
    errorRate.add(response.status !== 200);
    responseTime.add(response.timings.duration);
    
    if (response.timings.duration > 5000) {
      timeoutCounter.add(1);
    }

    check(response, {
      [`asset request ${index + 1} responds`]: (r) => r.status >= 200 && r.status < 600,
      [`asset request ${index + 1} response time < 8000ms`]: (r) => r.timings.duration < 8000,
    });
  });

  // ========================================
  // VITE DEV SERVER ENDPOINT STRESS TEST
  // ========================================
  const viteEndpoints = [
    '/@vite/client',
    '/@react-refresh',
    '/src/index.tsx',
    '/src/main.tsx'
  ];

  const viteRequests = [];
  for (let i = 0; i < 15; i++) {
    const randomEndpoint = viteEndpoints[Math.floor(Math.random() * viteEndpoints.length)];
    viteRequests.push({ method: 'GET', url: `${BASE_URL}${randomEndpoint}` });
  }

  const viteResponses = http.batch(viteRequests);
  viteResponses.forEach((response, index) => {
    requestCounter.add(1);
    errorRate.add(response.status !== 200);
    responseTime.add(response.timings.duration);
    
    if (response.timings.duration > 5000) {
      timeoutCounter.add(1);
    }

    check(response, {
      [`Vite endpoint request ${index + 1} responds`]: (r) => r.status >= 200 && r.status < 600,
      [`Vite endpoint request ${index + 1} response time < 10000ms`]: (r) => r.timings.duration < 10000,
    });
  });

  // ========================================
  // MALFORMED REQUEST STRESS TEST
  // ========================================
  const malformedRequests = [
    `${BASE_URL}/listen?invalid=param&malformed=value&`,
    `${BASE_URL}/speak/../../etc/passwd`,
    `${BASE_URL}/listen?<script>alert("xss")</script>`,
    `${BASE_URL}/speak?%00null%00byte`,
    `${BASE_URL}/listen?param=${'a'.repeat(1000)}`,
    `${BASE_URL}/speak?param=${'b'.repeat(2000)}`,
    `${BASE_URL}/listen?param=${'c'.repeat(5000)}`,
  ];

  const malformedResponses = http.batch(malformedRequests);
  malformedResponses.forEach((response, index) => {
    requestCounter.add(1);
    errorRate.add(response.status !== 200);
    responseTime.add(response.timings.duration);
    
    if (response.timings.duration > 5000) {
      timeoutCounter.add(1);
    }

    check(response, {
      [`malformed request ${index + 1} handled gracefully`]: (r) => r.status >= 200 && r.status < 600,
      [`malformed request ${index + 1} response time < 8000ms`]: (r) => r.timings.duration < 8000,
    });
  });

  // ========================================
  // HTTP METHOD STRESS TEST
  // ========================================
  const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
  const methodRequests = [];
  
  for (let i = 0; i < 20; i++) {
    const randomMethod = httpMethods[Math.floor(Math.random() * httpMethods.length)];
    methodRequests.push({ method: randomMethod, url: `${BASE_URL}/listen` });
  }

  const methodResponses = http.batch(methodRequests);
  methodResponses.forEach((response, index) => {
    requestCounter.add(1);
    errorRate.add(response.status !== 200);
    responseTime.add(response.timings.duration);
    
    if (response.timings.duration > 5000) {
      timeoutCounter.add(1);
    }

    check(response, {
      [`method request ${index + 1} responds`]: (r) => r.status >= 200 && r.status < 600,
      [`method request ${index + 1} response time < 8000ms`]: (r) => r.timings.duration < 8000,
    });
  });

  // ========================================
  // LARGE HEADER PAYLOAD STRESS TEST
  // ========================================
  const largeHeaders = {};
  for (let i = 0; i < 100; i++) {
    largeHeaders[`X-Stress-Header-${i}`] = 'a'.repeat(200);
  }

  const largeHeaderResponse = http.get(`${BASE_URL}/listen`, { headers: largeHeaders });
  requestCounter.add(1);
  errorRate.add(largeHeaderResponse.status !== 200);
  responseTime.add(largeHeaderResponse.timings.duration);
  
  if (largeHeaderResponse.timings.duration > 5000) {
    timeoutCounter.add(1);
  }

  check(largeHeaderResponse, {
    'large headers handled under stress': (r) => r.status >= 200 && r.status < 600,
    'large headers response time < 10000ms': (r) => r.timings.duration < 10000,
  });

  // ========================================
  // MEMORY PRESSURE STRESS TEST
  // ========================================
  const memoryPressureRequests = [];
  for (let i = 0; i < 30; i++) {
    memoryPressureRequests.push({ method: 'GET', url: `${BASE_URL}/listen` });
  }

  const memoryPressureResponses = http.batch(memoryPressureRequests);
  memoryPressureResponses.forEach((response, index) => {
    requestCounter.add(1);
    errorRate.add(response.status !== 200);
    responseTime.add(response.timings.duration);
    
    if (response.timings.duration > 5000) {
      timeoutCounter.add(1);
    }

    check(response, {
      [`memory pressure request ${index + 1} responds`]: (r) => r.status >= 200 && r.status < 600,
      [`memory pressure request ${index + 1} response time < 12000ms`]: (r) => r.timings.duration < 12000,
    });
  });

  // ========================================
  // NETWORK CONDITION STRESS TEST
  // ========================================
  const networkConditionHeaders = [
    { 'X-Simulate-Slow-Network': 'true' },
    { 'X-Simulate-High-Latency': 'true' },
    { 'X-Simulate-Packet-Loss': 'true' },
    { 'Connection': 'close' },
    { 'Connection': 'keep-alive' }
  ];

  const networkRequests = [];
  for (let i = 0; i < 15; i++) {
    const randomHeaders = networkConditionHeaders[Math.floor(Math.random() * networkConditionHeaders.length)];
    networkRequests.push({ 
      method: 'GET', 
      url: `${BASE_URL}/listen`,
      headers: randomHeaders
    });
  }

  const networkResponses = http.batch(networkRequests);
  networkResponses.forEach((response, index) => {
    requestCounter.add(1);
    errorRate.add(response.status !== 200);
    responseTime.add(response.timings.duration);
    
    if (response.timings.duration > 5000) {
      timeoutCounter.add(1);
    }

    check(response, {
      [`network condition request ${index + 1} responds`]: (r) => r.status >= 200 && r.status < 600,
      [`network condition request ${index + 1} response time < 10000ms`]: (r) => r.timings.duration < 10000,
    });
  });

  // ========================================
  // TIMEOUT BOUNDARY STRESS TEST
  // ========================================
  const timeoutRequests = [];
  for (let i = 0; i < 10; i++) {
    timeoutRequests.push({ 
      method: 'GET', 
      url: `${BASE_URL}/listen`,
      timeout: '5s'
    });
  }

  const timeoutResponses = http.batch(timeoutRequests);
  timeoutResponses.forEach((response, index) => {
    requestCounter.add(1);
    errorRate.add(response.status !== 200);
    responseTime.add(response.timings.duration);
    
    if (response.timings.duration > 5000) {
      timeoutCounter.add(1);
    }

    check(response, {
      [`timeout request ${index + 1} responds`]: (r) => r.status >= 200 && r.status < 600,
      [`timeout request ${index + 1} response time < 5000ms`]: (r) => r.timings.duration < 5000,
    });
  });

  // ========================================
  // FINAL STRESS VALIDATION
  // ========================================
  const finalStressRequests = [];
  for (let i = 0; i < 20; i++) {
    finalStressRequests.push({ method: 'GET', url: `${BASE_URL}/listen` });
  }

  const finalStressResponses = http.batch(finalStressRequests);
  finalStressResponses.forEach((response, index) => {
    requestCounter.add(1);
    errorRate.add(response.status !== 200);
    responseTime.add(response.timings.duration);
    
    if (response.timings.duration > 5000) {
      timeoutCounter.add(1);
    }

    check(response, {
      [`final stress request ${index + 1} responds`]: (r) => r.status >= 200 && r.status < 600,
      [`final stress request ${index + 1} response time < 15000ms`]: (r) => r.timings.duration < 15000,
    });
  });

  // ========================================
  // MINIMAL SLEEP FOR MAXIMUM STRESS
  // ========================================
  // Very short sleep to maximize stress
  sleep(0.1);
}
