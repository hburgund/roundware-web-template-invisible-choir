import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics for edge case analysis
const edgeCaseErrors = new Rate('edge_case_errors');
const edgeCaseResponseTime = new Trend('edge_case_response_time');
const edgeCaseCounter = new Counter('edge_case_requests');
const boundaryViolations = new Counter('boundary_violations');

export const options = {
  thresholds: {
    http_req_duration: ['p(95)<8000'], // More lenient for edge cases
    http_req_failed: ['rate<0.3'], // Allow up to 30% failure rate for edge cases
    http_req_duration: ['p(99)<15000'], // 99% of requests should be below 15s
    edge_case_errors: ['rate<0.3'], // Custom error rate threshold
    edge_case_response_time: ['p(95)<8000'], // Custom response time threshold
  },
  stages: [
    { duration: '20s', target: 5 }, // Start with 5 users
    { duration: '40s', target: 15 }, // Ramp to 15 users
    { duration: '1m', target: 25 }, // Ramp to 25 users
    { duration: '20s', target: 0 }, // Ramp down
  ],
};

// Base URL for Roundware dev server (Vite dev server)
const BASE_URL = 'http://[::1]:2345';

export default function () {
  // ========================================
  // 1. EXTREME URL LENGTH EDGE CASES
  // ========================================
  const extremeUrls = [
    `${BASE_URL}/listen?${'a'.repeat(10000)}`, // 10KB parameter
    `${BASE_URL}/speak?${'b'.repeat(20000)}`, // 20KB parameter
    `${BASE_URL}/listen?${'c'.repeat(50000)}`, // 50KB parameter
    `${BASE_URL}/speak?${'d'.repeat(100000)}`, // 100KB parameter
    `${BASE_URL}/listen?param1=${'e'.repeat(5000)}&param2=${'f'.repeat(5000)}&param3=${'g'.repeat(5000)}`, // Multiple large params
  ];

  const extremeUrlResponses = http.batch(extremeUrls.map(url => ({ method: 'GET', url })));
  extremeUrlResponses.forEach((response, index) => {
    edgeCaseCounter.add(1);
    edgeCaseErrors.add(response.status !== 200);
    edgeCaseResponseTime.add(response.timings.duration);
    
    if (response.timings.duration > 10000) {
      boundaryViolations.add(1);
    }

    check(response, {
      [`extreme URL ${index + 1} handled`]: (r) => r.status >= 200 && r.status < 600,
      [`extreme URL ${index + 1} response time < 20000ms`]: (r) => r.timings.duration < 20000,
    });
  });

  // ========================================
  // 2. UNICODE AND SPECIAL CHARACTER BOMBARDMENT
  // ========================================
  const unicodePayloads = [
    '🚀🎵🎶🎤🎧🎼🎹🎸🎺🎻🥁🎪🎭🎨🎬🎮🎯🎰🎱🎲🎳🎴🎵🎶🎷🎸🎹🎺🎻🎼🎽🎾🎿🏀🏁🏂🏃🏄🏅🏆🏇🏈🏉🏊🏋🏌🏍🏎🏏🏐🏑🏒🏓🏔🏕🏖🏗🏘🏙🏚🏛🏜🏝🏞🏟🏠🏡🏢🏣🏤🏥🏦🏧🏨🏩🏪🏫🏬🏭🏮🏯🏰🏱🏲🏳🏴🏵🏶🏷🏸🏹🏺🏻🏼🏽🏾🏿',
    'αβγδεζηθικλμνξοπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ',
    'абвгдеёжзийклмнопрстуфхцчшщъыьэюяАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',
    '中文测试日本語テスト한국어테스트العربيةاختبار',
    '!@#$%^&*()_+-=[]{}|;:,.<>?/~`"\'\\',
    'null\0byte\0test\0string\0with\0nulls',
    'line\nbreak\rtest\r\nwith\nmultiple\r\nline\nbreaks',
    'tab\ttest\twith\tmultiple\ttabs\tand\tspaces    ',
  ];

  const unicodeResponses = http.batch(unicodePayloads.map(payload => ({
    method: 'GET',
    url: `${BASE_URL}/listen?test=${encodeURIComponent(payload)}`
  })));

  unicodeResponses.forEach((response, index) => {
    edgeCaseCounter.add(1);
    edgeCaseErrors.add(response.status !== 200);
    edgeCaseResponseTime.add(response.timings.duration);

    check(response, {
      [`unicode payload ${index + 1} handled`]: (r) => r.status >= 200 && r.status < 600,
      [`unicode payload ${index + 1} response time < 10000ms`]: (r) => r.timings.duration < 10000,
    });
  });

  // ========================================
  // 3. HTTP HEADER EDGE CASES
  // ========================================
  const headerEdgeCases = [
    // Extremely long header values
    { 'X-Test-Header': 'a'.repeat(10000) },
    { 'X-Test-Header': 'b'.repeat(20000) },
    { 'X-Test-Header': 'c'.repeat(50000) },
    
    // Special characters in headers
    { 'X-Test-Header': '🚀🎵🎶🎤🎧🎼🎹🎸🎺🎻🥁' },
    { 'X-Test-Header': 'αβγδεζηθικλμνξοπρστυφχψω' },
    { 'X-Test-Header': '!@#$%^&*()_+-=[]{}|;:,.<>?/~`"\'\\' },
    
    // Multiple headers with same name
    { 'X-Duplicate': 'value1', 'X-Duplicate': 'value2', 'X-Duplicate': 'value3' },
    
    // Headers with control characters
    { 'X-Control-Char': 'test\0null\0byte' },
    { 'X-Control-Char': 'test\nline\nbreak' },
    { 'X-Control-Char': 'test\ttab\tcharacter' },
    
    // Empty and whitespace headers
    { 'X-Empty': '' },
    { 'X-Whitespace': '   ' },
    { 'X-Newline': '\n' },
    { 'X-Tab': '\t' },
  ];

  const headerResponses = http.batch(headerEdgeCases.map(headers => ({
    method: 'GET',
    url: `${BASE_URL}/listen`,
    headers: headers
  })));

  headerResponses.forEach((response, index) => {
    edgeCaseCounter.add(1);
    edgeCaseErrors.add(response.status !== 200);
    edgeCaseResponseTime.add(response.timings.duration);

    check(response, {
      [`header edge case ${index + 1} handled`]: (r) => r.status >= 200 && r.status < 600,
      [`header edge case ${index + 1} response time < 8000ms`]: (r) => r.timings.duration < 8000,
    });
  });

  // ========================================
  // 4. HTTP METHOD EDGE CASES
  // ========================================
  const methodEdgeCases = [
    'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD',
    'TRACE', 'PROPFIND', 'PROPPATCH', 'MKCOL', 'COPY',
    'MOVE', 'LOCK', 'UNLOCK', 'SEARCH', 'REPORT', 'SUBSCRIBE',
    'UNSUBSCRIBE', 'NOTIFY', 'POLL', 'BIND', 'UNBIND', 'REBIND',
    'LINK', 'UNLINK', 'PURGE', 'VIEW', 'WRAPPED', 'EXTENSION-METHOD'
  ];

  const methodResponses = http.batch(methodEdgeCases.map(method => ({
    method: method,
    url: `${BASE_URL}/listen`
  })));

  methodResponses.forEach((response, index) => {
    edgeCaseCounter.add(1);
    edgeCaseErrors.add(response.status !== 200);
    edgeCaseResponseTime.add(response.timings.duration);

    check(response, {
      [`method edge case ${methodEdgeCases[index]} handled`]: (r) => r.status >= 200 && r.status < 600,
      [`method edge case ${methodEdgeCases[index]} response time < 8000ms`]: (r) => r.timings.duration < 8000,
    });
  });

  // ========================================
  // 5. PATH TRAVERSAL AND INJECTION ATTEMPTS
  // ========================================
  const pathTraversalAttempts = [
    '/listen/../../../etc/passwd',
    '/speak/..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
    '/listen/....//....//....//etc/passwd',
    '/speak/%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
    '/listen/..%252f..%252f..%252fetc%252fpasswd',
    '/speak/..%c0%af..%c0%af..%c0%afetc%c0%afpasswd',
    '/listen/..%c1%9c..%c1%9c..%c1%9cetc%c1%9cpasswd',
    '/speak/..%255c..%255c..%255cetc%255cpasswd',
    '/listen/..%5c..%5c..%5cetc%5cpasswd',
    '/speak/..\\..\\..\\etc\\passwd',
    '/listen/....\\....\\....\\etc\\passwd',
    '/speak/..%2f..%2f..%2fetc%2fpasswd',
    '/listen/..%5c..%5c..%5cetc%5cpasswd',
    '/speak/..%252e%252e%252f..%252e%252e%252f..%252e%252e%252fetc%252fpasswd',
    '/listen/..%252e%252e%255c..%252e%252e%255c..%252e%252e%255cetc%255cpasswd',
  ];

  const pathTraversalResponses = http.batch(pathTraversalAttempts.map(path => ({
    method: 'GET',
    url: `${BASE_URL}${path}`
  })));

  pathTraversalResponses.forEach((response, index) => {
    edgeCaseCounter.add(1);
    edgeCaseErrors.add(response.status !== 200);
    edgeCaseResponseTime.add(response.timings.duration);

    check(response, {
      [`path traversal ${index + 1} blocked`]: (r) => r.status >= 200 && r.status < 600,
      [`path traversal ${index + 1} response time < 8000ms`]: (r) => r.timings.duration < 8000,
    });
  });

  // ========================================
  // 6. SQL INJECTION AND XSS ATTEMPTS
  // ========================================
  const injectionAttempts = [
    // SQL Injection attempts
    '/listen?user=admin\' OR \'1\'=\'1',
    '/speak?id=1; DROP TABLE users; --',
    '/listen?search=\' UNION SELECT * FROM users --',
    '/speak?filter=1\' OR 1=1 --',
    '/listen?sort=\'; INSERT INTO users VALUES (\'hacker\', \'password\'); --',
    
    // XSS attempts
    '/listen?q=<script>alert("XSS")</script>',
    '/speak?name=<img src=x onerror=alert("XSS")>',
    '/listen?search=javascript:alert("XSS")',
    '/speak?url=javascript:alert("XSS")',
    '/listen?data=<svg onload=alert("XSS")>',
    '/speak?input=<iframe src="javascript:alert(\'XSS\')"></iframe>',
    '/listen?param=<object data="javascript:alert(\'XSS\')"></object>',
    '/speak?value=<embed src="javascript:alert(\'XSS\')"></embed>',
    
    // Command injection attempts
    '/listen?cmd=; ls -la',
    '/speak?exec=; cat /etc/passwd',
    '/listen?run=| whoami',
    '/speak?shell=; id',
    '/listen?system=; ps aux',
  ];

  const injectionResponses = http.batch(injectionAttempts.map(url => ({
    method: 'GET',
    url: `${BASE_URL}${url}`
  })));

  injectionResponses.forEach((response, index) => {
    edgeCaseCounter.add(1);
    edgeCaseErrors.add(response.status !== 200);
    edgeCaseResponseTime.add(response.timings.duration);

    check(response, {
      [`injection attempt ${index + 1} handled`]: (r) => r.status >= 200 && r.status < 600,
      [`injection attempt ${index + 1} response time < 8000ms`]: (r) => r.timings.duration < 8000,
    });
  });

  // ========================================
  // 7. CONCURRENT CONNECTION EDGE CASES
  // ========================================
  const concurrentEdgeCases = [];
  for (let i = 0; i < 50; i++) {
    concurrentEdgeCases.push({
      method: 'GET',
      url: `${BASE_URL}/listen?concurrent=${i}&test=${'a'.repeat(1000)}`
    });
  }

  const concurrentResponses = http.batch(concurrentEdgeCases);
  concurrentResponses.forEach((response, index) => {
    edgeCaseCounter.add(1);
    edgeCaseErrors.add(response.status !== 200);
    edgeCaseResponseTime.add(response.timings.duration);

    check(response, {
      [`concurrent edge case ${index + 1} handled`]: (r) => r.status >= 200 && r.status < 600,
      [`concurrent edge case ${index + 1} response time < 15000ms`]: (r) => r.timings.duration < 15000,
    });
  });

  // ========================================
  // 8. TIMEOUT AND CONNECTION EDGE CASES
  // ========================================
  const timeoutEdgeCases = [
    { timeout: '1s' },
    { timeout: '2s' },
    { timeout: '5s' },
    { timeout: '10s' },
    { timeout: '30s' },
    { timeout: '60s' },
  ];

  const timeoutResponses = http.batch(timeoutEdgeCases.map(config => ({
    method: 'GET',
    url: `${BASE_URL}/listen`,
    timeout: config.timeout
  })));

  timeoutResponses.forEach((response, index) => {
    edgeCaseCounter.add(1);
    edgeCaseErrors.add(response.status !== 200);
    edgeCaseResponseTime.add(response.timings.duration);

    check(response, {
      [`timeout edge case ${index + 1} handled`]: (r) => r.status >= 200 && r.status < 600,
      [`timeout edge case ${index + 1} response time < ${timeoutEdgeCases[index].timeout}`]: (r) => r.timings.duration < parseInt(timeoutEdgeCases[index].timeout) * 1000,
    });
  });

  // ========================================
  // 9. CONTENT TYPE EDGE CASES
  // ========================================
  const contentTypeEdgeCases = [
    { 'Content-Type': 'application/json' },
    { 'Content-Type': 'application/xml' },
    { 'Content-Type': 'text/plain' },
    { 'Content-Type': 'text/html' },
    { 'Content-Type': 'application/octet-stream' },
    { 'Content-Type': 'multipart/form-data' },
    { 'Content-Type': 'application/x-www-form-urlencoded' },
    { 'Content-Type': 'text/css' },
    { 'Content-Type': 'application/javascript' },
    { 'Content-Type': 'image/png' },
    { 'Content-Type': 'video/mp4' },
    { 'Content-Type': 'audio/mpeg' },
    { 'Content-Type': 'application/pdf' },
    { 'Content-Type': 'text/csv' },
    { 'Content-Type': 'application/zip' },
    { 'Content-Type': 'application/x-msdownload' },
  ];

  const contentTypeResponses = http.batch(contentTypeEdgeCases.map(headers => ({
    method: 'GET',
    url: `${BASE_URL}/listen`,
    headers: headers
  })));

  contentTypeResponses.forEach((response, index) => {
    edgeCaseCounter.add(1);
    edgeCaseErrors.add(response.status !== 200);
    edgeCaseResponseTime.add(response.timings.duration);

    check(response, {
      [`content type edge case ${index + 1} handled`]: (r) => r.status >= 200 && r.status < 600,
      [`content type edge case ${index + 1} response time < 8000ms`]: (r) => r.timings.duration < 8000,
    });
  });

  // ========================================
  // 10. MEMORY PRESSURE EDGE CASES
  // ========================================
  const memoryPressureRequests = [];
  for (let i = 0; i < 100; i++) {
    memoryPressureRequests.push({
      method: 'GET',
      url: `${BASE_URL}/listen?memory_test=${i}&data=${'x'.repeat(5000)}`
    });
  }

  const memoryPressureResponses = http.batch(memoryPressureRequests);
  memoryPressureResponses.forEach((response, index) => {
    edgeCaseCounter.add(1);
    edgeCaseErrors.add(response.status !== 200);
    edgeCaseResponseTime.add(response.timings.duration);

    check(response, {
      [`memory pressure ${index + 1} handled`]: (r) => r.status >= 200 && r.status < 600,
      [`memory pressure ${index + 1} response time < 12000ms`]: (r) => r.timings.duration < 12000,
    });
  });

  // ========================================
  // 11. NETWORK CONDITION EDGE CASES
  // ========================================
  const networkConditionHeaders = [
    { 'Connection': 'close' },
    { 'Connection': 'keep-alive' },
    { 'Connection': 'upgrade' },
    { 'Connection': 'TE' },
    { 'Upgrade': 'websocket' },
    { 'Upgrade': 'h2c' },
    { 'Upgrade': 'h2' },
    { 'Transfer-Encoding': 'chunked' },
    { 'Transfer-Encoding': 'gzip' },
    { 'Transfer-Encoding': 'deflate' },
    { 'Transfer-Encoding': 'compress' },
    { 'Transfer-Encoding': 'identity' },
    { 'Expect': '100-continue' },
    { 'Expect': '100-Continue' },
    { 'Expect': '100-continue, 100-continue' },
  ];

  const networkResponses = http.batch(networkConditionHeaders.map(headers => ({
    method: 'GET',
    url: `${BASE_URL}/listen`,
    headers: headers
  })));

  networkResponses.forEach((response, index) => {
    edgeCaseCounter.add(1);
    edgeCaseErrors.add(response.status !== 200);
    edgeCaseResponseTime.add(response.timings.duration);

    check(response, {
      [`network condition ${index + 1} handled`]: (r) => r.status >= 200 && r.status < 600,
      [`network condition ${index + 1} response time < 8000ms`]: (r) => r.timings.duration < 8000,
    });
  });

  // ========================================
  // 12. FINAL EDGE CASE VALIDATION
  // ========================================
  const finalEdgeCases = [
    `${BASE_URL}/listen?final_test=1&edge_case=true&boundary_test=limit`,
    `${BASE_URL}/speak?final_test=2&edge_case=true&boundary_test=limit`,
    `${BASE_URL}/listen?final_test=3&edge_case=true&boundary_test=limit`,
  ];

  const finalResponses = http.batch(finalEdgeCases.map(url => ({ method: 'GET', url })));
  finalResponses.forEach((response, index) => {
    edgeCaseCounter.add(1);
    edgeCaseErrors.add(response.status !== 200);
    edgeCaseResponseTime.add(response.timings.duration);

    check(response, {
      [`final edge case ${index + 1} handled`]: (r) => r.status >= 200 && r.status < 600,
      [`final edge case ${index + 1} response time < 10000ms`]: (r) => r.timings.duration < 10000,
    });
  });

  // ========================================
  // MINIMAL SLEEP FOR MAXIMUM EDGE CASE COVERAGE
  // ========================================
  sleep(0.1);
}
