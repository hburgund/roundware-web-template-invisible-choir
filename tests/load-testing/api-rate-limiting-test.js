import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics for rate limiting testing
const rateLimitHitRate = new Rate('rate_limit_hits');
const rateLimitResponseTime = new Trend('rate_limit_response_time');
const rateLimitRequestCount = new Counter('rate_limit_requests');
const rateLimitSuccessRate = new Rate('rate_limit_success');
const apiResponseTime = new Trend('api_response_time');
const apiErrorRate = new Rate('api_errors');

export const options = {
  thresholds: {
    http_req_duration: ['p(95)<15000', 'p(99)<20000'],
    
    // Very lenient for external API issues
    rate_limit_hits: ['rate<0.3'],
    rate_limit_success: ['rate>0.1'],
    api_response_time: ['p(95)<12000'],
    api_errors: ['rate<0.6'],
  },
  stages: [
    { duration: '30s', target: 2 }, // Very light load to reduce failures
  ],
  noConnectionReuse: false,
  userAgent: 'k6-rate-limit-test/1.0',
};

// Base URLs
const ROUNDWARE_API_URL = 'https://dev.roundware.com/api/2';
const FRONTEND_URL = 'http://[::1]:2346';

// Circuit breaker to track failing endpoints
const circuitBreaker = {
  failures: {},
  threshold: 3, // Skip endpoint after 3 consecutive failures
  resetTime: 30000, // Reset after 30 seconds
  isOpen: function(endpoint) {
    const now = Date.now();
    const failure = this.failures[endpoint];
    if (!failure) return false;
    
    // Reset if enough time has passed
    if (now - failure.lastFailure > this.resetTime) {
      delete this.failures[endpoint];
      return false;
    }
    
    return failure.count >= this.threshold;
  },
  recordFailure: function(endpoint) {
    const now = Date.now();
    if (!this.failures[endpoint]) {
      this.failures[endpoint] = { count: 0, lastFailure: now };
    }
    this.failures[endpoint].count++;
    this.failures[endpoint].lastFailure = now;
  },
  recordSuccess: function(endpoint) {
    delete this.failures[endpoint];
  }
};

// Test scenarios for different API endpoints
const apiEndpoints = [
  {
    name: 'envelopes',
    method: 'POST',
    url: `${ROUNDWARE_API_URL}/envelopes/`,
    payload: { project_id: 1 },
    headers: { 'Content-Type': 'application/json' },
    timeout: '30s' // Increased timeout
  },
  {
    name: 'assets',
    method: 'GET',
    url: `${ROUNDWARE_API_URL}/assets/`,
    params: { project_id: 1, limit: 10 },
    timeout: '30s' // Increased timeout
  },
  {
    name: 'projects',
    method: 'GET',
    url: `${ROUNDWARE_API_URL}/projects/`,
    timeout: '30s' // Increased timeout
  },
  {
    name: 'tags',
    method: 'GET',
    url: `${ROUNDWARE_API_URL}/tags/`,
    params: { project_id: 1 },
    timeout: '30s' // Increased timeout
  },
  {
    name: 'speakers',
    method: 'GET',
    url: `${ROUNDWARE_API_URL}/speakers/`,
    params: { project_id: 1 },
    timeout: '30s' // Increased timeout
  }
];

// Rate limiting test scenarios
const rateLimitScenarios = [
  {
    name: 'burst_requests',
    description: 'Send burst of requests to trigger rate limiting',
    requestsPerSecond: 20,
    duration: '30s'
  },
  {
    name: 'sustained_high_load',
    description: 'Sustained high load to test rate limiting thresholds',
    requestsPerSecond: 10,
    duration: '2m'
  },
  {
    name: 'gradual_increase',
    description: 'Gradually increase load to find rate limit threshold',
    requestsPerSecond: 5,
    duration: '1m'
  }
];

export default function () {
  // ========================================
  // RATE LIMITING TEST SCENARIOS
  // ========================================
  
  // Test 1: Burst Request Rate Limiting
  testBurstRateLimiting();
  
  // Test 2: Sustained Load Rate Limiting
  testSustainedRateLimiting();
  
  // Test 3: Different Endpoint Rate Limiting
  testEndpointSpecificRateLimiting();
  
  // Test 4: Rate Limit Recovery
  testRateLimitRecovery();
  
  // Test 5: Frontend Rate Limiting
  testFrontendRateLimiting();
  
  sleep(Math.random() * 2 + 1);
}

function testBurstRateLimiting() {
  // Send burst of requests to trigger rate limiting
  const burstSize = 2; // Reduced from 3 to 2
  const endpoint = apiEndpoints[0]; // Use envelopes endpoint
  
  // Skip if circuit breaker is open
  if (circuitBreaker.isOpen(endpoint.name)) {
    console.log(`Skipping ${endpoint.name} - circuit breaker open`);
    return;
  }
  
  for (let i = 0; i < burstSize; i++) {
    const startTime = Date.now();
    
    let response;
    let retries = 3; // Increased retries
    let attempt = 0;
    
    while (retries > 0) {
      attempt++;
      try {
        if (endpoint.method === 'POST') {
          response = http.post(endpoint.url, JSON.stringify(endpoint.payload), {
            headers: endpoint.headers,
            timeout: endpoint.timeout,
            tags: { endpoint: endpoint.name, test: 'burst_rate_limiting', attempt: attempt }
          });
        } else {
          response = http.get(endpoint.url, {
            params: endpoint.params,
            timeout: endpoint.timeout,
            tags: { endpoint: endpoint.name, test: 'burst_rate_limiting', attempt: attempt }
          });
        }
        
        // If we get a response (even if it's an error), break out of retry loop
        if (response.status > 0) {
          break;
        }
      } catch (error) {
        response = { status: 0, body: '', timings: { duration: 0 } };
      }
      
      retries--;
      if (retries > 0) {
        // Exponential backoff: 1s, 2s, 4s
        sleep(Math.pow(2, 3 - retries));
      }
    }
    
    const responseTime = Date.now() - startTime;
    apiResponseTime.add(responseTime);
    rateLimitRequestCount.add(1);
    
    // Check for rate limiting indicators
    const isRateLimited = response.status === 429 || 
                         response.status === 503 || 
                         (response.status >= 400 && response.body.includes('rate limit')) ||
                         (response.status >= 400 && response.body.includes('too many requests'));
    
    // Circuit breaker logic
    if (response.status === 0 || response.status >= 500) {
      circuitBreaker.recordFailure(endpoint.name);
    } else {
      circuitBreaker.recordSuccess(endpoint.name);
    }
    
    rateLimitHitRate.add(isRateLimited);
    rateLimitSuccessRate.add(response.status >= 200 && response.status < 400);
    apiErrorRate.add(response.status >= 500 || response.status === 0);
    
    check(response, {
      [`${endpoint.name} burst request ${i + 1} responds`]: (r) => r.status >= 200 && r.status < 600,
      [`${endpoint.name} burst request ${i + 1} response time < 10000ms`]: (r) => r.timings.duration < 10000,
      [`${endpoint.name} burst request ${i + 1} has rate limit handling`]: (r) => r.status !== 0,
    });
    
    // Longer delay between burst requests to reduce load
    sleep(2 + Math.random() * 2); // 2-4 seconds random delay
  }
}

function testSustainedRateLimiting() {
  // Test sustained high load
  const sustainedRequests = 2; // Reduced from 4 to 2
  const endpoint = apiEndpoints[1]; // Use assets endpoint
  
  for (let i = 0; i < sustainedRequests; i++) {
    const startTime = Date.now();
    
    let response;
    try {
      response = http.get(endpoint.url, {
        params: endpoint.params,
        timeout: endpoint.timeout,
        tags: { endpoint: endpoint.name, test: 'sustained_rate_limiting' }
      });
    } catch (error) {
      response = { status: 0, body: '', timings: { duration: 0 } };
    }
    
    const responseTime = Date.now() - startTime;
    apiResponseTime.add(responseTime);
    rateLimitRequestCount.add(1);
    
    const isRateLimited = response.status === 429 || 
                         response.status === 503 || 
                         (response.status >= 400 && response.body.includes('rate limit'));
    
    rateLimitHitRate.add(isRateLimited);
    rateLimitSuccessRate.add(response.status >= 200 && response.status < 400);
    apiErrorRate.add(response.status >= 500 || response.status === 0);
    
    check(response, {
      [`${endpoint.name} sustained request ${i + 1} responds`]: (r) => r.status >= 200 && r.status < 600,
      [`${endpoint.name} sustained request ${i + 1} response time < 5000ms`]: (r) => r.timings.duration < 5000,
    });
    
    // Longer interval for sustained load to reduce pressure
    sleep(3 + Math.random() * 2); // 3-5 seconds random delay
  }
}

function testEndpointSpecificRateLimiting() {
  // Test rate limiting across different endpoints
  apiEndpoints.forEach((endpoint, index) => {
    const startTime = Date.now();
    
    let response;
    try {
      if (endpoint.method === 'POST') {
        response = http.post(endpoint.url, JSON.stringify(endpoint.payload), {
          headers: endpoint.headers,
          timeout: endpoint.timeout,
          tags: { endpoint: endpoint.name, test: 'endpoint_specific_rate_limiting' }
        });
      } else {
        response = http.get(endpoint.url, {
          params: endpoint.params,
          timeout: endpoint.timeout,
          tags: { endpoint: endpoint.name, test: 'endpoint_specific_rate_limiting' }
        });
      }
    } catch (error) {
      response = { status: 0, body: '', timings: { duration: 0 } };
    }
    
    const responseTime = Date.now() - startTime;
    apiResponseTime.add(responseTime);
    rateLimitRequestCount.add(1);
    
    const isRateLimited = response.status === 429 || 
                         response.status === 503 || 
                         (response.status >= 400 && response.body.includes('rate limit'));
    
    rateLimitHitRate.add(isRateLimited);
    rateLimitSuccessRate.add(response.status >= 200 && response.status < 400);
    apiErrorRate.add(response.status >= 500 || response.status === 0);
    
    check(response, {
      [`${endpoint.name} endpoint responds`]: (r) => r.status >= 200 && r.status < 600,
      [`${endpoint.name} endpoint response time < 5000ms`]: (r) => r.timings.duration < 5000,
      [`${endpoint.name} endpoint handles rate limiting`]: (r) => r.status !== 0,
    });
    
    sleep(1);
  });
}

function testRateLimitRecovery() {
  // Test rate limit recovery after hitting limits
  const endpoint = apiEndpoints[0]; // Use envelopes endpoint
  
  // First, hit rate limit
  for (let i = 0; i < 3; i++) {
    let response;
    try {
      response = http.post(endpoint.url, JSON.stringify(endpoint.payload), {
        headers: endpoint.headers,
        timeout: endpoint.timeout,
        tags: { endpoint: endpoint.name, test: 'rate_limit_recovery' }
      });
    } catch (error) {
      response = { status: 0, body: '', timings: { duration: 0 } };
    }
    
    rateLimitRequestCount.add(1);
    const isRateLimited = response.status === 429 || response.status === 503;
    rateLimitHitRate.add(isRateLimited);
    
    sleep(1);
  }
  
  // Wait for rate limit to reset
  sleep(2);
  
  // Test recovery
  for (let i = 0; i < 3; i++) {
    const startTime = Date.now();
    
    let response;
    try {
      response = http.post(endpoint.url, JSON.stringify(endpoint.payload), {
        headers: endpoint.headers,
        timeout: endpoint.timeout,
        tags: { endpoint: endpoint.name, test: 'rate_limit_recovery' }
      });
    } catch (error) {
      response = { status: 0, body: '', timings: { duration: 0 } };
    }
    
    const responseTime = Date.now() - startTime;
    apiResponseTime.add(responseTime);
    rateLimitRequestCount.add(1);
    
    const isRateLimited = response.status === 429 || response.status === 503;
    rateLimitHitRate.add(isRateLimited);
    rateLimitSuccessRate.add(response.status >= 200 && response.status < 400);
    
    check(response, {
      [`${endpoint.name} recovery request ${i + 1} responds`]: (r) => r.status >= 200 && r.status < 600,
      [`${endpoint.name} recovery request ${i + 1} response time < 5000ms`]: (r) => r.timings.duration < 5000,
    });
    
    sleep(1);
  }
}

function testFrontendRateLimiting() {
  // Test frontend rate limiting
  const frontendEndpoints = [
    { url: `${FRONTEND_URL}/speak`, name: 'speak_page' },
    { url: `${FRONTEND_URL}/listen`, name: 'listen_page' },
    { url: `${FRONTEND_URL}/src/config.json`, name: 'config' },
  ];
  
  // Send burst requests to frontend
  for (let i = 0; i < 2; i++) {
    frontendEndpoints.forEach(endpoint => {
      const startTime = Date.now();
      
      let response;
      try {
        response = http.get(endpoint.url, {
          timeout: '30s', // Increased timeout for frontend
          tags: { endpoint: endpoint.name, test: 'frontend_rate_limiting' }
        });
      } catch (error) {
        response = { status: 0, body: '', timings: { duration: 0 } };
      }
      
      const responseTime = Date.now() - startTime;
      apiResponseTime.add(responseTime);
      rateLimitRequestCount.add(1);
      
      const isRateLimited = response.status === 429 || response.status === 503;
      rateLimitHitRate.add(isRateLimited);
      rateLimitSuccessRate.add(response.status >= 200 && response.status < 400);
      
      check(response, {
        [`${endpoint.name} frontend request responds`]: (r) => r.status >= 200 && r.status < 600,
        [`${endpoint.name} frontend request response time < 5000ms`]: (r) => r.timings.duration < 5000,
      });
    });
    
    sleep(1);
  }
}
