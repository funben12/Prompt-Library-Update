// Screenshot every ?shot= state of a build at phone sizes. Usage: node shoot.js <wwwDir> <outDir>
const path = require('path');
const fs = require('fs');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const SHOTS = ['start', 'round-1', 'round-4', 'round-7', 'final'];
const SIZES = { portrait: { width: 390, height: 844 }, landscape: { width: 844, height: 390 } };

(async () => {
  const [wwwDir, outDir] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const report = { errors: [], external: [] };
  for (const [orient, vp] of Object.entries(SIZES)) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    for (const shot of SHOTS) {
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') report.errors.push(`${orient}/${shot}: ${m.text()}`); });
      page.on('pageerror', e => report.errors.push(`${orient}/${shot}: ${e.message}`));
      page.on('request', r => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) report.external.push(r.url()); });
      await page.goto('file://' + path.resolve(wwwDir, 'index.html') + '?shot=' + shot);
      await page.waitForTimeout(1200);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      if (overflow) report.errors.push(`${orient}/${shot}: horizontal overflow`);
      await page.screenshot({ path: path.join(outDir, `${orient}-${shot}.png`) });
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
})();
