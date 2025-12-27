import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5000';
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'screenshots');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

interface Screenshot {
  name: string;
  path: string;
  description: string;
  uniqueFeature?: string;
}

const screenshots: Screenshot[] = [];

async function login(page: puppeteer.Page, username: string, password: string) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-testid="input-username"]', { timeout: 10000 });
  await page.type('[data-testid="input-username"]', username);
  await page.type('[data-testid="input-password"]', password);
  await page.click('[data-testid="button-signin"]');
  await new Promise(r => setTimeout(r, 3000));
}

async function captureScreenshot(page: puppeteer.Page, name: string, description: string, uniqueFeature?: string) {
  const filename = `${name}.png`;
  const filepath = path.join(OUTPUT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  screenshots.push({ name, path: filename, description, uniqueFeature });
  console.log(`Captured: ${name}`);
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  try {
    // LOGIN PAGE
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));
    await captureScreenshot(page, '00_login', 'Login Page - Chicago Sewer Experts CRM');

    // ADMIN ROLE
    console.log('\n--- ADMIN ROLE ---');
    await login(page, 'admin', 'demo123');
    
    await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await captureScreenshot(page, '01_admin_dashboard', 'Admin Dashboard - KPI Overview', 'Real-time business metrics and lead conversion tracking');

    await page.goto(`${BASE_URL}/admin/leads`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await captureScreenshot(page, '02_admin_leads', 'Lead Management', 'Multi-source integration: eLocal, Networx, Angi, Thumbtack, Inquirly, Zapier webhooks');

    await page.goto(`${BASE_URL}/admin/jobs`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await captureScreenshot(page, '03_admin_jobs', 'Job Management', 'Complete cost tracking: labor, materials, travel, equipment, profit calculation');

    await page.goto(`${BASE_URL}/admin/technicians`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await captureScreenshot(page, '04_admin_technicians', 'Technician Management', 'Skill-based assignment with hourly rates and availability');

    await page.goto(`${BASE_URL}/admin/analytics`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));
    await captureScreenshot(page, '05_admin_analytics', 'Analytics Dashboard', 'ROI analysis, conversion rates, and profitability metrics');

    await page.goto(`${BASE_URL}/admin/pricebook`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await captureScreenshot(page, '06_admin_pricebook', 'Pricebook Management', 'UNIQUE: Standardized service catalog with labor estimates and materials costs');

    await page.goto(`${BASE_URL}/admin/marketing`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await captureScreenshot(page, '07_admin_marketing', 'Marketing ROI Tracking', 'UNIQUE: Track cost-per-lead and ROI by source (not available in ServiceTitan/HousecallPro)');

    await page.goto(`${BASE_URL}/admin/import`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await captureScreenshot(page, '08_admin_import', 'Data Import', 'Bulk import leads and customer data');

    await page.goto(`${BASE_URL}/admin/outreach`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await captureScreenshot(page, '09_admin_outreach', 'Outreach Campaigns', 'Automated customer communication campaigns');

    // Logout
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });

    // DISPATCHER ROLE
    console.log('\n--- DISPATCHER ROLE ---');
    await login(page, 'dispatcher', 'demo123');

    await page.goto(`${BASE_URL}/dispatcher/dashboard`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await captureScreenshot(page, '10_dispatcher_dashboard', 'Dispatch Center', 'Real-time job scheduling and technician coordination');

    await page.goto(`${BASE_URL}/dispatcher/leads`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await captureScreenshot(page, '11_dispatcher_leads', 'Dispatcher Lead View', 'Quick lead assignment and status updates');

    await page.goto(`${BASE_URL}/dispatcher/jobs`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await captureScreenshot(page, '12_dispatcher_jobs', 'Job Scheduling', 'Drag-and-drop scheduling with status tracking');

    await page.goto(`${BASE_URL}/dispatcher/quotes`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await captureScreenshot(page, '13_dispatcher_quotes', 'Quote Management', 'Public shareable quote links for customer approval');

    await page.goto(`${BASE_URL}/dispatcher/technician-map`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2500));
    await captureScreenshot(page, '14_dispatcher_map', 'Real-Time GPS Map', 'UNIQUE: Live technician tracking with interactive map');

    await page.goto(`${BASE_URL}/dispatcher/staffing`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await captureScreenshot(page, '15_dispatcher_staffing', 'Staffing Pool', 'Technician availability and workload management');

    // Logout
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });

    // TECHNICIAN ROLE
    console.log('\n--- TECHNICIAN ROLE ---');
    await login(page, 'mike', 'demo123');

    await page.goto(`${BASE_URL}/technician/dashboard`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await captureScreenshot(page, '16_tech_dashboard', 'Technician Dashboard', 'Personal job queue and earnings overview');

    await page.goto(`${BASE_URL}/technician/jobs`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await captureScreenshot(page, '17_tech_jobs', 'My Jobs', 'Job pool with claim functionality and status updates');

    await page.goto(`${BASE_URL}/technician/quote-builder`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await captureScreenshot(page, '18_tech_quote_builder', 'Mobile Quote Builder', 'UNIQUE: Field technicians create quotes on-site with pricebook integration');

    await page.goto(`${BASE_URL}/technician/earnings`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await captureScreenshot(page, '19_tech_earnings', 'Earnings Tracker', 'Personal earnings and commission tracking');

    // Logout
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });

    // SALESPERSON ROLE
    console.log('\n--- SALESPERSON ROLE ---');
    await login(page, 'sarah', 'demo123');

    await page.goto(`${BASE_URL}/salesperson/dashboard`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await captureScreenshot(page, '20_sales_dashboard', 'Sales Dashboard', 'UNIQUE: NET profit commission tracking (Revenue - ALL costs = Profit, then commission %)');

    await page.goto(`${BASE_URL}/salesperson/leads`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await captureScreenshot(page, '21_sales_leads', 'Sales Lead View', 'Lead ownership and conversion tracking');

    await page.goto(`${BASE_URL}/salesperson/jobs`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await captureScreenshot(page, '22_sales_jobs', 'Sales Job Tracking', 'Commission attribution per job');

    await page.goto(`${BASE_URL}/salesperson/quotes`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await captureScreenshot(page, '23_sales_quotes', 'Sales Quotes', 'Quote management with public links');

    await page.goto(`${BASE_URL}/salesperson/quote-tool`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await captureScreenshot(page, '24_sales_quote_tool', 'Sales Quote Tool', 'Quick quote generation with templates');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }

  // Generate HTML gallery
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Chicago Sewer Experts CRM - Feature Screenshots</title>
  <style>
    body { font-family: Arial, sans-serif; background: #1a1a2e; color: #fff; padding: 40px; }
    h1 { color: #b22222; text-align: center; }
    h2 { color: #fff; border-bottom: 2px solid #b22222; padding-bottom: 10px; margin-top: 40px; }
    .gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(600px, 1fr)); gap: 30px; }
    .screenshot { background: #2a2a4e; border-radius: 8px; overflow: hidden; }
    .screenshot img { width: 100%; height: auto; }
    .screenshot .info { padding: 15px; }
    .screenshot h3 { margin: 0 0 10px; color: #fff; }
    .screenshot p { margin: 0; color: #aaa; font-size: 14px; }
    .unique { background: #b22222; color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 12px; display: inline-block; margin-top: 10px; }
    .section-admin { border-left: 4px solid #4CAF50; }
    .section-dispatcher { border-left: 4px solid #2196F3; }
    .section-tech { border-left: 4px solid #FF9800; }
    .section-sales { border-left: 4px solid #9C27B0; }
    .legend { display: flex; gap: 20px; justify-content: center; margin: 20px 0; }
    .legend span { display: flex; align-items: center; gap: 5px; }
    .legend .dot { width: 12px; height: 12px; border-radius: 50%; }
  </style>
</head>
<body>
  <h1>Chicago Sewer Experts CRM</h1>
  <p style="text-align: center; color: #aaa;">Feature Screenshots for Marketing</p>
  
  <div class="legend">
    <span><div class="dot" style="background: #4CAF50;"></div> Admin</span>
    <span><div class="dot" style="background: #2196F3;"></div> Dispatcher</span>
    <span><div class="dot" style="background: #FF9800;"></div> Technician</span>
    <span><div class="dot" style="background: #9C27B0;"></div> Salesperson</span>
  </div>

  <h2>Login</h2>
  <div class="gallery">
    ${screenshots.filter(s => s.name.startsWith('00')).map(s => `
    <div class="screenshot">
      <img src="${s.path}" alt="${s.description}">
      <div class="info">
        <h3>${s.description}</h3>
      </div>
    </div>`).join('')}
  </div>

  <h2>Admin Features</h2>
  <div class="gallery">
    ${screenshots.filter(s => s.name.startsWith('0') && !s.name.startsWith('00')).map(s => `
    <div class="screenshot section-admin">
      <img src="${s.path}" alt="${s.description}">
      <div class="info">
        <h3>${s.description}</h3>
        <p>${s.uniqueFeature || ''}</p>
        ${s.uniqueFeature?.includes('UNIQUE') ? '<span class="unique">Exclusive Feature</span>' : ''}
      </div>
    </div>`).join('')}
  </div>

  <h2>Dispatcher Features</h2>
  <div class="gallery">
    ${screenshots.filter(s => s.name.startsWith('1')).map(s => `
    <div class="screenshot section-dispatcher">
      <img src="${s.path}" alt="${s.description}">
      <div class="info">
        <h3>${s.description}</h3>
        <p>${s.uniqueFeature || ''}</p>
        ${s.uniqueFeature?.includes('UNIQUE') ? '<span class="unique">Exclusive Feature</span>' : ''}
      </div>
    </div>`).join('')}
  </div>

  <h2>Technician Features</h2>
  <div class="gallery">
    ${screenshots.filter(s => s.name.startsWith('1') && parseInt(s.name.split('_')[0]) >= 16 && parseInt(s.name.split('_')[0]) <= 19).map(s => `
    <div class="screenshot section-tech">
      <img src="${s.path}" alt="${s.description}">
      <div class="info">
        <h3>${s.description}</h3>
        <p>${s.uniqueFeature || ''}</p>
        ${s.uniqueFeature?.includes('UNIQUE') ? '<span class="unique">Exclusive Feature</span>' : ''}
      </div>
    </div>`).join('')}
  </div>

  <h2>Salesperson Features</h2>
  <div class="gallery">
    ${screenshots.filter(s => s.name.startsWith('2')).map(s => `
    <div class="screenshot section-sales">
      <img src="${s.path}" alt="${s.description}">
      <div class="info">
        <h3>${s.description}</h3>
        <p>${s.uniqueFeature || ''}</p>
        ${s.uniqueFeature?.includes('UNIQUE') ? '<span class="unique">Exclusive Feature</span>' : ''}
      </div>
    </div>`).join('')}
  </div>

  <h2 style="margin-top: 60px;">Unique Features Not in ServiceTitan/HousecallPro</h2>
  <ul style="color: #aaa; line-height: 2;">
    <li><strong>Marketing ROI Tracking</strong> - Track cost-per-lead and ROI by source</li>
    <li><strong>NET Profit Commission</strong> - Calculate commission on actual profit, not revenue</li>
    <li><strong>Multi-Source Lead Webhooks</strong> - eLocal, Networx, Angi, Thumbtack, Inquirly, Zapier</li>
    <li><strong>Zapier SMS Automation</strong> - Bypass A2P verification with Zapier integration</li>
    <li><strong>Real-Time GPS Tracking</strong> - Interactive map with live technician locations</li>
    <li><strong>Pricebook Management</strong> - Standardized service catalog with labor estimates</li>
    <li><strong>Public Quote Links</strong> - Shareable links for customer approval</li>
  </ul>
</body>
</html>`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), html);
  console.log(`\nGenerated gallery: ${path.join(OUTPUT_DIR, 'index.html')}`);
  console.log(`Total screenshots: ${screenshots.length}`);
}

main().catch(console.error);
