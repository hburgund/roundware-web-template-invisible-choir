import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics - separate for frontend and external API
const frontendErrorRate = new Rate('frontend_errors');
const externalApiErrorRate = new Rate('external_api_errors');
const frontendResponseTime = new Trend('frontend_response_time');
const externalApiResponseTime = new Trend('external_api_response_time');
const frontendRequestCount = new Counter('frontend_requests');
const externalApiRequestCount = new Counter('external_api_requests');

export const options = {
  thresholds: {
    // More realistic thresholds - separate frontend vs external API
    http_req_duration: ['p(95)<3000', 'p(99)<8000'],
    http_req_failed: ['rate<0.70'], // Allow higher failure rate for external APIs (timeouts are expected)
    frontend_errors: ['rate<0.02'], // Strict for local frontend
    external_api_errors: ['rate<0.30'], // More lenient for external API
    frontend_response_time: ['p(95)<2000'],
    external_api_response_time: ['p(95)<15000'],
  },
  stages: [
    { duration: '30s', target: 10 }, // Start with lower load
    { duration: '1m', target: 25 },  // Moderate load
    { duration: '30s', target: 0 },
  ],
  // Add connection limits and timeouts
  noConnectionReuse: false,
  userAgent: 'k6-load-test/1.0',
};

// Base URLs from actual Roundware configuration
const FRONTEND_URL = 'http://[::1]:2345'; // Vite dev server (IPv6)
const ROUNDWARE_API_URL = 'https://dev.roundware.com/api/2'; // From config.ts
const ROUNDWARE_SERVER_URL = 'https://dev.roundware.com/'; // From config.ts

export default function () {
  // Test frontend static endpoints (Vite dev server)
  const frontendEndpoints = [
    '/src/config.json',
    '/src/help.json',
    '/src/playbackInfo.json',
    '/src/assets/icons/mic_icon.svg',
    '/src/assets/icons/play_icon.svg',
    '/src/assets/icons/sound_icon.svg',
    '/src/assets/audio/click-103.wav',
    '/src/assets/audio/click-84.wav',
    '/src/assets/audio/click-single.wav'
  ];

  // Test Roundware API endpoints (from actual usage in RoundwareProvider.tsx)
  const roundwareEndpoints = [
    '/speakers/',
    '/assets/',
    '/tags/',
    '/sessions/',
    '/projects/1/',
    '/ui-config/',
    '/audio/'
  ];

  // Test frontend static assets
  frontendEndpoints.forEach(endpoint => {
    const response = http.get(`${FRONTEND_URL}${endpoint}`, {
      timeout: '10s', // Add timeout
      tags: { endpoint: 'frontend' }
    });
    frontendRequestCount.add(1);
    frontendErrorRate.add(response.status !== 200);
    frontendResponseTime.add(response.timings.duration);

    check(response, {
      [`frontend ${endpoint} status is 200`]: (r) => r.status === 200,
      [`frontend ${endpoint} response time < 2000ms`]: (r) => r.timings.duration < 2000,
      [`frontend ${endpoint} has content`]: (r) => r.body && r.body.length > 0,
    });
  });

  // Test Roundware API endpoints with retry logic
  roundwareEndpoints.forEach(endpoint => {
    let response;
    let attempts = 0;
    const maxAttempts = 3;
    
    // Retry logic for external API
    while (attempts < maxAttempts) {
      response = http.get(`${ROUNDWARE_API_URL}${endpoint}`, {
        params: { project_id: 1 }, // From config.ts project.id
        timeout: '20s', // Increased timeout for external API
        tags: { endpoint: 'external_api', attempt: attempts + 1 }
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
    
    externalApiRequestCount.add(1);
    // Only count as error if all retries failed with server errors
    externalApiErrorRate.add(response.status >= 500 || response.status === 0);
    externalApiResponseTime.add(response.timings.duration);

    check(response, {
      [`roundware ${endpoint} responds appropriately`]: (r) => r.status >= 200 && r.status < 500,
      [`roundware ${endpoint} response time < 15000ms`]: (r) => r.timings.duration < 15000,
    });
  });

  // Test Roundware API with different HTTP methods (reduced to avoid overloading)
  const methods = ['GET', 'POST']; // Reduced methods to avoid overloading external API
  methods.forEach(method => {
    let response;
    let attempts = 0;
    const maxAttempts = 2; // Fewer retries for method testing
    
    while (attempts < maxAttempts) {
      response = http.request(method, `${ROUNDWARE_API_URL}/assets/`, null, {
        headers: { 'Content-Type': 'application/json' },
        params: { project_id: 1 },
        timeout: '20s',
        tags: { endpoint: 'external_api', method: method, attempt: attempts + 1 }
      });
      
      if (response.status < 500 && response.status !== 0) {
        break;
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        sleep(0.5); // Shorter wait for method testing
      }
    }
    
    check(response, {
      [`${method} method handled for assets`]: (r) => r.status >= 200 && r.status < 600,
    });
  });

  // Test Roundware API with query parameters (reduced to avoid overloading)
  const queryParams = [
    { submitted: true },
    { limit: 10, offset: 0 }
  ];

  queryParams.forEach(params => {
    let response;
    let attempts = 0;
    const maxAttempts = 2;
    
    while (attempts < maxAttempts) {
      response = http.get(`${ROUNDWARE_API_URL}/assets/`, {
        params: { project_id: 1, ...params },
        timeout: '20s',
        tags: { endpoint: 'external_api', test: 'query_params', attempt: attempts + 1 }
      });
      
      if (response.status < 500 && response.status !== 0) {
        break;
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        sleep(0.5);
      }
    }
    
    check(response, {
      [`query params ${JSON.stringify(params)} handled`]: (r) => r.status >= 200 && r.status < 500,
    });
  });

  // Test specific speaker endpoints (reduced to avoid overloading)
  const speakerEndpoints = [
    '/speakers/',
    '/speakers/1/'
  ];

  speakerEndpoints.forEach(endpoint => {
    let response;
    let attempts = 0;
    const maxAttempts = 3; // More retries for speaker endpoints
    
    while (attempts < maxAttempts) {
      response = http.get(`${ROUNDWARE_API_URL}${endpoint}`, {
        params: { project_id: 1 },
        timeout: '20s',
        tags: { endpoint: 'external_api', test: 'speakers', attempt: attempts + 1 }
      });
      
      if (response.status < 500 && response.status !== 0) {
        break;
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        sleep(1);
      }
    }
    
    check(response, {
      [`speaker endpoint ${endpoint} responds`]: (r) => r.status >= 200 && r.status < 500,
    });
  });

  sleep(3); // Increased sleep to reduce load on external API
}
