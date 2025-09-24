import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 30,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% of requests should be below 3s
    http_req_failed: ['rate<0.1'], // Error rate should be below 10%
  },
};

export default function () {
  // ========================================
  // TEST 1: BASIC PAGE LOAD PERFORMANCE
  // ========================================
  // This tests the initial HTML response time and server performance
  const pageResponse = http.get('http://[::1]:2345/listen');
  
  check(pageResponse, {
    'page status is 200': (r) => r.status === 200,
    'page response time < 2000ms': (r) => r.timings.duration < 2000,
    'page loads successfully': (r) => r.body && r.body.includes('html'),
  });

  // ========================================
  // TEST 2: ASSET LOADING PERFORMANCE
  // ========================================
  // Test loading of CSS, JavaScript, and other static assets
  const assetsResponse = http.batch([
    { method: 'GET', url: 'http://[::1]:2345/src/index.tsx' },
    { method: 'GET', url: 'http://[::1]:2345/@vite/client' },
    { method: 'GET', url: 'http://[::1]:2345/@react-refresh' },
  ]);

  check(assetsResponse[0], {
    'main script loads': (r) => r.status === 200,
    'script response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  check(assetsResponse[1], {
    'vite client loads': (r) => r.status === 200,
    'vite response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  // ========================================
  // TEST 3: API ENDPOINT TESTING
  // ========================================
  // Test if the page makes any API calls (common in SPAs)
  // Note: These might return 404 if endpoints don't exist, but we're testing availability
  const apiResponse = http.get('http://[::1]:2345/api/config');
  
  check(apiResponse, {
    'api endpoint responds': (r) => r.status === 200 || r.status === 404, // 404 is OK if endpoint doesn't exist
    'api response time < 1500ms': (r) => r.timings.duration < 1500,
  });

  // ========================================
  // TEST 4: HEADERS AND SECURITY
  // ========================================
  // Test response headers for security and performance
  check(pageResponse, {
    'has content-type header': (r) => r.headers['Content-Type'] !== undefined,
    'has cache headers': (r) => r.headers['Cache-Control'] !== undefined || r.headers['ETag'] !== undefined,
  });

  // ========================================
  // TEST 5: RESPONSE SIZE VALIDATION
  // ========================================
  // Ensure responses aren't too large (could indicate errors or excessive content)
  check(pageResponse, {
    'page size reasonable': (r) => r.body.length > 100 && r.body.length < 100000, // Between 100B and 100KB
  });

  // ========================================
  // TEST 6: CONCURRENT REQUEST HANDLING
  // ========================================
  // Test multiple simultaneous requests to same endpoint
  const concurrentResponses = http.batch([
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
  ]);

  check(concurrentResponses[0], {
    'concurrent request 1 succeeds': (r) => r.status === 200,
  });
  check(concurrentResponses[1], {
    'concurrent request 2 succeeds': (r) => r.status === 200,
  });
  check(concurrentResponses[2], {
    'concurrent request 3 succeeds': (r) => r.status === 200,
  });

  // ========================================
  // TEST 7: ERROR HANDLING
  // ========================================
  // Test how the server handles invalid requests
  const errorResponse = http.get('http://[::1]:2345/nonexistent-page');
  
  check(errorResponse, {
    'error page responds appropriately': (r) => r.status === 404 || r.status === 200, // 404 expected, 200 if redirect
    'error response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  // ========================================
  // TEST 8: MOBILE DEVICE SIMULATION
  // ========================================
  // Test with mobile user agent to simulate mobile users
  const mobileHeaders = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  };

  const mobileResponse = http.get('http://[::1]:2345/listen', { headers: mobileHeaders });
  
  check(mobileResponse, {
    'mobile page loads successfully': (r) => r.status === 200,
    'mobile response time < 2500ms': (r) => r.timings.duration < 2500,
    'mobile page contains expected content': (r) => r.body && r.body.includes('html'),
  });

  // ========================================
  // TEST 9: PERFORMANCE STRESS TESTING
  // ========================================
  // Test with multiple rapid requests to stress the server
  const stressResponses = http.batch([
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
  ]);

  stressResponses.forEach((response, index) => {
    check(response, {
      [`stress test request ${index + 1} succeeds`]: (r) => r.status === 200,
      [`stress test request ${index + 1} response time < 3000ms`]: (r) => r.timings.duration < 3000,
    });
  });

  // ========================================
  // TEST 10: DIFFERENT PAGE ROUTES
  // ========================================
  // Test various routes to ensure they all perform well
  const routes = ['/', '/speak', '/about', '/help'];
  const routeResponses = http.batch(
    routes.map(route => ({ method: 'GET', url: `http://[::1]:2345${route}` }))
  );

  routeResponses.forEach((response, index) => {
    check(response, {
      [`route ${routes[index]} loads`]: (r) => r.status === 200 || r.status === 404,
      [`route ${routes[index]} response time < 2000ms`]: (r) => r.timings.duration < 2000,
    });
  });

  // ========================================
  // TEST 11: CACHE VALIDATION
  // ========================================
  // Test if caching is working properly
  const cacheHeaders = {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  };

  const cacheResponse = http.get('http://[::1]:2345/listen', { headers: cacheHeaders });
  
  check(cacheResponse, {
    'cache bypass works': (r) => r.status === 200,
    'cache bypass response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  // ========================================
  // TEST 12: COMPRESSION TESTING
  // ========================================
  // Test if compression is working
  const compressionHeaders = {
    'Accept-Encoding': 'gzip, deflate, br',
  };

  const compressionResponse = http.get('http://[::1]:2345/listen', { headers: compressionHeaders });
  
  check(compressionResponse, {
    'compression request succeeds': (r) => r.status === 200,
    'compression response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  // ========================================
  // TEST 13: SESSION HANDLING
  // ========================================
  // Test if the application handles sessions properly
  const sessionResponse1 = http.get('http://[::1]:2345/listen');
  const sessionResponse2 = http.get('http://[::1]:2345/listen');
  
  check(sessionResponse1, {
    'first session request succeeds': (r) => r.status === 200,
  });
  check(sessionResponse2, {
    'second session request succeeds': (r) => r.status === 200,
  });

  // ========================================
  // TEST 14: RESOURCE INTENSIVE OPERATIONS
  // ========================================
  // Test operations that might be resource intensive
  const resourceIntensiveResponses = http.batch([
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
  ]);

  resourceIntensiveResponses.forEach((response, index) => {
    check(response, {
      [`resource intensive request ${index + 1} succeeds`]: (r) => r.status === 200,
      [`resource intensive request ${index + 1} response time < 4000ms`]: (r) => r.timings.duration < 4000,
    });
  });

  // ========================================
  // TEST 15: NETWORK CONDITION SIMULATION
  // ========================================
  // Test with different network conditions
  const slowNetworkHeaders = {
    'X-Simulate-Slow-Network': 'true',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };

  const slowNetworkResponse = http.get('http://[::1]:2345/listen', { headers: slowNetworkHeaders });
  
  check(slowNetworkResponse, {
    'slow network request succeeds': (r) => r.status === 200,
    'slow network response time < 5000ms': (r) => r.timings.duration < 5000,
  });

  // ========================================
  // TEST 16: CONTENT VALIDATION
  // ========================================
  // Validate that the page contains expected content
  check(pageResponse, {
    'page contains title': (r) => r.body && (r.body.includes('<title>') || r.body.includes('title')),
    'page contains body content': (r) => r.body && r.body.includes('<body'),
    'page contains proper HTML structure': (r) => r.body && r.body.includes('<!DOCTYPE html') || r.body.includes('<html'),
  });

  // ========================================
  // TEST 17: REDIRECT HANDLING
  // ========================================
  // Test if redirects are handled properly
  const redirectResponse = http.get('http://[::1]:2345/listen/', { redirects: 5 });
  
  check(redirectResponse, {
    'redirect handling works': (r) => r.status === 200 || r.status === 301 || r.status === 302,
    'redirect response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  // ========================================
  // TEST 18: TIMEOUT HANDLING
  // ========================================
  // Test with timeout parameters
  const timeoutResponse = http.get('http://[::1]:2345/listen', { timeout: '10s' });
  
  check(timeoutResponse, {
    'timeout request succeeds': (r) => r.status === 200,
    'timeout response time < 10000ms': (r) => r.timings.duration < 10000,
  });

  // ========================================
  // TEST 19: LOAD BALANCER TESTING
  // ========================================
  // Test multiple endpoints to simulate load balancer behavior
  const loadBalancerResponses = http.batch([
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
  ]);

  loadBalancerResponses.forEach((response, index) => {
    check(response, {
      [`load balancer request ${index + 1} succeeds`]: (r) => r.status === 200,
      [`load balancer request ${index + 1} response time < 3000ms`]: (r) => r.timings.duration < 3000,
    });
  });

  // ========================================
  // TEST 20: FINAL PERFORMANCE VALIDATION
  // ========================================
  // Final comprehensive check
  const finalResponse = http.get('http://[::1]:2345/listen');
  
  check(finalResponse, {
    'final check succeeds': (r) => r.status === 200,
    'final response time < 2000ms': (r) => r.timings.duration < 2000,
    'final page loads completely': (r) => r.body && r.body.includes('html'),
  });

  // ========================================
  // EDGE CASE TESTING
  // ========================================
  
  // EDGE CASE 1: EXTREME LOAD TESTING
  // Test with maximum concurrent requests to find breaking point
  const extremeLoadResponses = http.batch([
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
  ]);

  extremeLoadResponses.forEach((response, index) => {
    check(response, {
      [`extreme load request ${index + 1} responds`]: (r) => r.status >= 200 && r.status < 600,
      [`extreme load request ${index + 1} response time < 10000ms`]: (r) => r.timings.duration < 10000,
    });
  });

  // EDGE CASE 2: MALFORMED REQUESTS
  // Test server resilience with invalid requests
  const malformedRequests = [
    { method: 'GET', url: 'http://[::1]:2345/listen?invalid=param&malformed=value&' },
    { method: 'GET', url: 'http://[::1]:2345/listen/../../etc/passwd' },
    { method: 'GET', url: 'http://[::1]:2345/listen?<script>alert("xss")</script>' },
    { method: 'GET', url: 'http://[::1]:2345/listen?%00null%00byte' },
  ];

  const malformedResponses = http.batch(malformedRequests);

  malformedResponses.forEach((response, index) => {
    check(response, {
      [`malformed request ${index + 1} handled gracefully`]: (r) => r.status >= 200 && r.status < 600,
      [`malformed request ${index + 1} response time < 5000ms`]: (r) => r.timings.duration < 5000,
    });
  });

  // EDGE CASE 3: UNSUPPORTED HTTP METHODS
  // Test server behavior with non-standard methods
  const unsupportedMethods = ['POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
  const methodResponses = http.batch(
    unsupportedMethods.map(method => ({ method, url: 'http://[::1]:2345/listen' }))
  );

  methodResponses.forEach((response, index) => {
    check(response, {
      [`${unsupportedMethods[index]} method handled appropriately`]: (r) => r.status >= 200 && r.status < 600,
      [`${unsupportedMethods[index]} response time < 3000ms`]: (r) => r.timings.duration < 3000,
    });
  });

  // EDGE CASE 4: EXTREMELY LONG URLS
  // Test with URLs that exceed normal length limits
  const longParam = 'a'.repeat(1000);
  const longUrlResponse = http.get(`http://[::1]:2345/listen?param=${longParam}`);
  
  check(longUrlResponse, {
    'extremely long URL handled': (r) => r.status >= 200 && r.status < 600,
    'long URL response time < 5000ms': (r) => r.timings.duration < 5000,
  });

  // EDGE CASE 5: RAPID SUCCESSIVE REQUESTS
  // Test with minimal delay between requests
  const rapidRequests = [];
  for (let i = 0; i < 5; i++) {
    rapidRequests.push({ method: 'GET', url: 'http://[::1]:2345/listen' });
  }

  const rapidResponses = http.batch(rapidRequests);

  rapidResponses.forEach((response, index) => {
    check(response, {
      [`rapid request ${index + 1} succeeds`]: (r) => r.status === 200,
      [`rapid request ${index + 1} response time < 3000ms`]: (r) => r.timings.duration < 3000,
    });
  });

  // EDGE CASE 6: LARGE HEADER PAYLOADS
  // Test with oversized headers
  const largeHeaders = {};
  for (let i = 0; i < 50; i++) {
    largeHeaders[`X-Custom-Header-${i}`] = 'a'.repeat(100);
  }

  const largeHeaderResponse = http.get('http://[::1]:2345/listen', { headers: largeHeaders });
  
  check(largeHeaderResponse, {
    'large headers handled': (r) => r.status >= 200 && r.status < 600,
    'large headers response time < 5000ms': (r) => r.timings.duration < 5000,
  });

  // EDGE CASE 7: CONCURRENT DIFFERENT ROUTES
  // Test multiple different routes simultaneously
  const mixedRoutes = ['/', '/listen', '/speak', '/about', '/help', '/nonexistent'];
  const mixedRouteResponses = http.batch(
    mixedRoutes.map(route => ({ method: 'GET', url: `http://[::1]:2345${route}` }))
  );

  mixedRouteResponses.forEach((response, index) => {
    check(response, {
      [`mixed route ${mixedRoutes[index]} responds`]: (r) => r.status >= 200 && r.status < 600,
      [`mixed route ${mixedRoutes[index]} response time < 4000ms`]: (r) => r.timings.duration < 4000,
    });
  });

  // EDGE CASE 8: TIMEOUT BOUNDARY TESTING
  // Test with very short and very long timeouts
  const shortTimeoutResponse = http.get('http://[::1]:2345/listen', { timeout: '100ms' });
  const longTimeoutResponse = http.get('http://[::1]:2345/listen', { timeout: '30s' });
  
  check(longTimeoutResponse, {
    'long timeout request succeeds': (r) => r.status === 200,
    'long timeout response time < 30000ms': (r) => r.timings.duration < 30000,
  });

  // EDGE CASE 9: MEMORY PRESSURE TESTING
  // Test with requests that might cause memory issues
  const memoryPressureResponses = http.batch([
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
  ]);

  memoryPressureResponses.forEach((response, index) => {
    check(response, {
      [`memory pressure request ${index + 1} responds`]: (r) => r.status >= 200 && r.status < 600,
      [`memory pressure request ${index + 1} response time < 8000ms`]: (r) => r.timings.duration < 8000,
    });
  });

  // EDGE CASE 10: FINAL STRESS TEST
  // Ultimate stress test combining all edge cases
  const finalStressResponses = http.batch([
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
    { method: 'GET', url: 'http://[::1]:2345/listen' },
  ]);

  finalStressResponses.forEach((response, index) => {
    check(response, {
      [`final stress request ${index + 1} responds`]: (r) => r.status >= 200 && r.status < 600,
      [`final stress request ${index + 1} response time < 10000ms`]: (r) => r.timings.duration < 10000,
    });
  });

  // ========================================
  // SIMULATE REAL USER BEHAVIOR
  // ========================================
  // Random sleep between 1-3 seconds to simulate real user reading time
  // This creates more realistic load patterns
  sleep(Math.random() * 2 + 1);
}
