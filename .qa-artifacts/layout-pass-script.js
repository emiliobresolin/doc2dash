const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const outDir = path.resolve('C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass');
fs.mkdirSync(outDir, { recursive: true });

const uploads = {
  google: 'upl_sYaKjva26FQU',
  performance: 'upl_0dckR6iG4dDG',
  academic: 'upl_HWmeCecRM4Ib',
  monthly: 'upl_9jj9Qcbje4-0',
};

async function collectMetrics(page, name, state) {
  const metrics = await page.evaluate(() => {
    const sidebar = document.querySelector('.app-sidebar');
    const masthead = document.querySelector('.app-masthead');
    const cards = Array.from(document.querySelectorAll('.workspace-card')).map((el, index) => {
      const rect = el.getBoundingClientRect();
      return {
        index,
        heading: el.querySelector('h3')?.textContent ?? null,
        hidden: el.hasAttribute('hidden'),
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
      };
    });
    const sidebarRect = sidebar?.getBoundingClientRect() ?? null;
    const mastheadRect = masthead?.getBoundingClientRect() ?? null;
    const styles = sidebar ? window.getComputedStyle(sidebar) : null;
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      documentHeight: document.documentElement.scrollHeight,
      scrollY: window.scrollY,
      sidebar: sidebar && sidebarRect ? {
        x: sidebarRect.x,
        y: sidebarRect.y,
        width: sidebarRect.width,
        height: sidebarRect.height,
        scrollHeight: sidebar.scrollHeight,
        clientHeight: sidebar.clientHeight,
        overflowY: styles?.overflowY,
      } : null,
      masthead: masthead && mastheadRect ? {
        x: mastheadRect.x,
        y: mastheadRect.y,
        width: mastheadRect.width,
        height: mastheadRect.height,
      } : null,
      cards,
    };
  });
  fs.writeFileSync(path.join(outDir, `${name}-${state}.json`), JSON.stringify(metrics, null, 2));
}

(async() => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge', args: ['--disable-web-security'] });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });

  async function openUpload(name, uploadId) {
    await page.goto(`http://127.0.0.1:4174/uploads/${uploadId}`, { waitUntil: 'networkidle', timeout: 120000 });
    await page.screenshot({ path: path.join(outDir, `${name}-top.png`), fullPage: true });
    await collectMetrics(page, name, 'top');
  }

  await openUpload('academic', uploads.academic);
  await page.fill('#dashboard-search', 'IDS');
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(outDir, 'academic-search-open.png'), fullPage: true });
  await collectMetrics(page, 'academic', 'search-open');
  const academicResults = page.locator('.search-result-card');
  if (await academicResults.count()) {
    await academicResults.first().click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(outDir, 'academic-search-selected.png'), fullPage: true });
    await collectMetrics(page, 'academic', 'search-selected');
  }
  const presenterToggle = page.locator('button', { hasText: 'Enter presenter mode' });
  if (await presenterToggle.count()) {
    await presenterToggle.first().click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outDir, 'academic-presenter.png'), fullPage: true });
    await collectMetrics(page, 'academic', 'presenter');
    const exitToggle = page.locator('button', { hasText: 'Exit presenter mode' });
    if (await exitToggle.count()) {
      await exitToggle.first().click();
      await page.waitForTimeout(300);
    }
  }
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(outDir, 'academic-scrolled.png'), fullPage: true });
  await collectMetrics(page, 'academic', 'scrolled');

  await openUpload('performance', uploads.performance);
  await page.fill('#dashboard-search', 'Commerce');
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(outDir, 'performance-search-open.png'), fullPage: true });
  await collectMetrics(page, 'performance', 'search-open');
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(outDir, 'performance-scrolled.png'), fullPage: true });
  await collectMetrics(page, 'performance', 'scrolled');

  await openUpload('google', uploads.google);
  const chartButtons = page.locator('.chart-switcher__button');
  const count = await chartButtons.count();
  for (let i = 0; i < count; i += 1) {
    const label = (await chartButtons.nth(i).innerText()).trim().toLowerCase();
    if (label !== 'table') {
      await chartButtons.nth(i).click();
      await page.waitForTimeout(700);
      break;
    }
  }
  await page.screenshot({ path: path.join(outDir, 'google-chart-switch.png'), fullPage: true });
  await collectMetrics(page, 'google', 'chart-switch');

  await openUpload('monthly', uploads.monthly);
  await page.screenshot({ path: path.join(outDir, 'monthly-baseline.png'), fullPage: true });
  await collectMetrics(page, 'monthly', 'baseline');

  await browser.close();
})();
