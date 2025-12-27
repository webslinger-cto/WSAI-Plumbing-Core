/**
 * Stress Test Script for Chicago Sewer Experts CRM
 * Tests system performance under concurrent user load
 */

const BASE_URL = 'http://localhost:5000';

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  duration: number;
  success: boolean;
  error?: string;
}

interface StressTestReport {
  concurrentUsers: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  requestsPerSecond: number;
  totalDuration: number;
  results: TestResult[];
}

async function makeRequest(
  endpoint: string,
  method: string = 'GET',
  body?: any,
  cookie?: string
): Promise<TestResult> {
  const start = Date.now();
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (cookie) {
      headers['Cookie'] = cookie;
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const duration = Date.now() - start;
    return {
      endpoint,
      method,
      status: response.status,
      duration,
      success: response.status >= 200 && response.status < 400,
    };
  } catch (error) {
    const duration = Date.now() - start;
    return {
      endpoint,
      method,
      status: 0,
      duration,
      success: false,
      error: (error as Error).message,
    };
  }
}

async function login(username: string, password: string): Promise<string | null> {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      const match = setCookie.match(/connect\.sid=[^;]+/);
      return match ? match[0] : null;
    }
    return null;
  } catch {
    return null;
  }
}

async function simulateUserSession(userId: number, users: string[]): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const username = users[userId % users.length];
  
  // Login
  const cookie = await login(username, 'demo123');
  if (!cookie) {
    results.push({
      endpoint: '/api/auth/login',
      method: 'POST',
      status: 0,
      duration: 0,
      success: false,
      error: `Failed to login as ${username}`,
    });
    return results;
  }

  // Simulate typical user actions
  const endpoints = [
    { endpoint: '/api/leads', method: 'GET' },
    { endpoint: '/api/jobs', method: 'GET' },
    { endpoint: '/api/technicians', method: 'GET' },
    { endpoint: '/api/quotes', method: 'GET' },
    { endpoint: '/api/leads', method: 'GET' },
    { endpoint: '/api/jobs', method: 'GET' },
  ];

  // Create a lead
  const leadData = {
    customerName: `Stress Test User ${userId} - ${Date.now()}`,
    phone: `555-${String(1000000 + userId).slice(-7)}`,
    email: `stress${userId}@test.com`,
    address: `${userId} Stress Test Ave, Chicago, IL 60601`,
    source: 'zapier',
    serviceType: 'Sewer Inspection',
    notes: `Stress test lead from user session ${userId}`,
    status: 'new',
  };

  results.push(await makeRequest('/api/leads', 'POST', leadData, cookie));

  // Execute random read operations
  for (const ep of endpoints) {
    results.push(await makeRequest(ep.endpoint, ep.method, undefined, cookie));
    // Small delay to simulate real user behavior
    await new Promise(r => setTimeout(r, 50 + Math.random() * 100));
  }

  return results;
}

async function runStressTest(concurrentUsers: number): Promise<StressTestReport> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`STRESS TEST: ${concurrentUsers} CONCURRENT USERS`);
  console.log('='.repeat(60));

  const users = ['admin', 'dispatcher', 'mike', 'carlos', 'james', 'sarah'];
  const startTime = Date.now();

  // Run all user sessions concurrently
  const userPromises: Promise<TestResult[]>[] = [];
  for (let i = 0; i < concurrentUsers; i++) {
    userPromises.push(simulateUserSession(i, users));
  }

  const allResults = await Promise.all(userPromises);
  const results = allResults.flat();
  const totalDuration = Date.now() - startTime;

  // Calculate statistics
  const successfulRequests = results.filter(r => r.success).length;
  const failedRequests = results.filter(r => !r.success).length;
  const durations = results.map(r => r.duration);
  const avgResponseTime = durations.reduce((a, b) => a + b, 0) / durations.length;
  const maxResponseTime = Math.max(...durations);
  const minResponseTime = Math.min(...durations);
  const requestsPerSecond = results.length / (totalDuration / 1000);

  const report: StressTestReport = {
    concurrentUsers,
    totalRequests: results.length,
    successfulRequests,
    failedRequests,
    avgResponseTime: Math.round(avgResponseTime),
    maxResponseTime,
    minResponseTime,
    requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
    totalDuration,
    results,
  };

  // Print summary
  console.log(`\nRESULTS:`);
  console.log(`  Total Requests:     ${report.totalRequests}`);
  console.log(`  Successful:         ${report.successfulRequests} (${((report.successfulRequests / report.totalRequests) * 100).toFixed(1)}%)`);
  console.log(`  Failed:             ${report.failedRequests} (${((report.failedRequests / report.totalRequests) * 100).toFixed(1)}%)`);
  console.log(`  Avg Response Time:  ${report.avgResponseTime}ms`);
  console.log(`  Min Response Time:  ${report.minResponseTime}ms`);
  console.log(`  Max Response Time:  ${report.maxResponseTime}ms`);
  console.log(`  Requests/Second:    ${report.requestsPerSecond}`);
  console.log(`  Total Duration:     ${report.totalDuration}ms`);

  // Show failed requests if any
  if (failedRequests > 0) {
    console.log(`\nFAILED REQUESTS:`);
    const failures = results.filter(r => !r.success);
    const uniqueFailures = new Map<string, number>();
    failures.forEach(f => {
      const key = `${f.method} ${f.endpoint}: ${f.error || `Status ${f.status}`}`;
      uniqueFailures.set(key, (uniqueFailures.get(key) || 0) + 1);
    });
    uniqueFailures.forEach((count, msg) => {
      console.log(`  ${msg} (x${count})`);
    });
  }

  return report;
}

async function main() {
  console.log('Chicago Sewer Experts CRM - Stress Test Suite');
  console.log('='.repeat(60));
  console.log(`Testing against: ${BASE_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);

  // Warm up - make a few requests first
  console.log('\nWarm-up phase...');
  await makeRequest('/api/health');
  await makeRequest('/api/leads');
  console.log('Warm-up complete.');

  const reports: StressTestReport[] = [];

  // Run stress tests
  reports.push(await runStressTest(10));
  await new Promise(r => setTimeout(r, 2000)); // Cool down

  reports.push(await runStressTest(15));
  await new Promise(r => setTimeout(r, 2000)); // Cool down

  reports.push(await runStressTest(20));

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('STRESS TEST SUMMARY');
  console.log('='.repeat(60));
  console.log('\n| Users | Requests | Success Rate | Avg Time | Max Time | RPS     |');
  console.log('|-------|----------|--------------|----------|----------|---------|');
  reports.forEach(r => {
    const successRate = ((r.successfulRequests / r.totalRequests) * 100).toFixed(1);
    console.log(
      `| ${String(r.concurrentUsers).padEnd(5)} | ${String(r.totalRequests).padEnd(8)} | ${successRate.padEnd(12)}% | ${String(r.avgResponseTime + 'ms').padEnd(8)} | ${String(r.maxResponseTime + 'ms').padEnd(8)} | ${String(r.requestsPerSecond).padEnd(7)} |`
    );
  });

  // Overall assessment
  const allPassed = reports.every(r => r.successfulRequests / r.totalRequests >= 0.95);
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('OVERALL: PASSED - System handles concurrent load well');
  } else {
    console.log('OVERALL: ISSUES DETECTED - Review failed requests');
  }
  console.log('='.repeat(60));
}

main().catch(console.error);
