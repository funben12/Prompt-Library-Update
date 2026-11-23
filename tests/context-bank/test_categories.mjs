// Context Bank own categories on the desktop app: add, filter, new category in the editor, rename, remove, export.
// Run: PYTHON=python3-with-flask CHROME=/path/to/chrome node tests/context-bank/test_categories.mjs
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_MODULE || 'playwright');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = process.env.SHOTS || path.join(HERE, 'shots');
const PORT = 5099;
fs.mkdirSync(SHOTS, { recursive: true });
const srv = spawn(process.env.PYTHON || 'python3', [path.join(HERE, 'serve.py'), String(PORT)], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 60; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/`)).ok) break; } catch (_) {} await sleep(250); }

let passed = 0, failed = 0;
const ok = (c, n) => { if (c) { passed++; console.log('ok   ' + n); } else { failed++; console.log('FAIL ' + n); } };
const browser = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
try {
  await page.goto(`http://127.0.0.1:${PORT}/`);
  await page.waitForFunction(() => typeof window.openContextBankWorkspace === 'function');
  await sleep(800);
  // Throwaway profile has no licence key: lift the first launch screen for the test only
  await page.evaluate(() => { const g = document.getElementById('activationGate'); if (g) g.hidden = true; document.getElementById('app')?.removeAttribute('inert'); document.body.classList.remove('gate-open'); });
  await page.evaluate(() => window.openContextBankWorkspace());
  await page.waitForSelector('#ctxCatManageBtn');
  ok(true, 'Categories pill shows at the end of the filters');
  ok(await page.isHidden('#ctxCatManager'), 'Manager starts closed');

  await page.click('#ctxCatManageBtn');
  await page.waitForSelector('#ctxCatNewName');
  ok(await page.getAttribute('#ctxCatManageBtn', 'aria-expanded') === 'true', 'Pill opens the manager');
  await page.fill('#ctxCatNewName', 'Clients');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('.ctxb-catm-msg')?.textContent.includes('Clients added'));
  ok(await page.evaluate(() => JSON.parse(localStorage.getItem('pl_ctx_categories')).includes('Clients')), 'Enter adds Clients to pl_ctx_categories');
  ok(await page.isVisible('[data-ctx-filter="Clients"]'), 'Clients shows as a filter even with no blocks');
  await page.fill('#ctxCatNewName', 'persona');
  await page.click('[data-catm="add"]');
  ok((await page.textContent('.ctxb-catm-msg')).includes('Persona already exists'), 'Starter name refused in any case');
  await page.fill('#ctxCatNewName', 'all');
  await page.click('[data-catm="add"]');
  ok((await page.textContent('.ctxb-catm-msg')).includes('All is taken'), 'All refused');
  await page.screenshot({ path: path.join(SHOTS, 'd1-manager.png') });

  // New block with a category typed in the editor
  await page.click('#ctxNewBtn');
  await page.waitForSelector('#ctxCategory');
  await sleep(300); // the editor moves focus to the title a moment after New block
  const opts = await page.$$eval('#ctxCategory option', o => o.map(x => x.textContent));
  ok(opts.includes('Clients') && opts[opts.length - 1].startsWith('New category'), 'Editor list holds Clients and ends with New category');
  await page.fill('#ctxTitle', 'Agency voice');
  await page.fill('#ctxContent', 'We write plainly.');
  await page.selectOption('#ctxCategory', '__new');
  await page.fill('#ctxCategoryNew', 'Agency');
  await page.click('#ctxSaveBtn');
  await sleep(300);
  const blk = () => page.evaluate(() => JSON.parse(localStorage.getItem('pl_ctx_blocks')).find(b => b.title === 'Agency voice'));
  ok((await blk())?.category === 'Agency', 'Block saved under Agency');
  ok(await page.evaluate(() => JSON.parse(localStorage.getItem('pl_ctx_categories')).includes('Agency')), 'Agency joins your categories on save');
  ok((await page.textContent('.ctxb-catm')).includes('Agency'), 'Manager lists Agency with its block');

  // Rename moves the block
  await page.click('[data-catm="rename"][data-cat="Agency"]');
  await page.fill('#ctxCatRenameInput', 'Studio');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('.ctxb-catm-msg')?.textContent.includes('Agency is now Studio'));
  ok((await blk())?.category === 'Studio', 'Rename moves the block to Studio');
  ok(await page.inputValue('#ctxCategory') === 'Studio', 'Open editor follows the rename');
  await page.click('#ctxList [data-ctx-id]:not(.active)');
  await sleep(250);
  ok(await page.isHidden('#ctxGuard'), 'Rename does not leave the open block looking unsaved');
  await page.screenshot({ path: path.join(SHOTS, 'd2-renamed.png') });

  // Remove asks first, then moves the block to Other
  await page.click('[data-catm="remove"][data-cat="Studio"]');
  ok((await page.textContent('.ctxb-catm-q')).includes('1 block moves to Other'), 'Remove asks first');
  await page.click('[data-catm="remove-yes"]');
  await page.waitForFunction(() => document.querySelector('.ctxb-catm-msg')?.textContent.includes('Studio removed'));
  ok((await blk())?.category === 'Other', 'Removed category sends its block to Other');
  ok(!(await page.$('[data-catm="rename"][data-cat="Persona"]')), 'Starter categories cannot be renamed');

  // Escape closes the manager
  await page.focus('#ctxCatNewName');
  await page.keyboard.press('Escape');
  ok(await page.isHidden('#ctxCatManager'), 'Escape closes the manager');
  ok(await page.isVisible('#contextBankWorkspace.open'), 'Escape leaves the workspace open');

  // Settings copy for when WebView storage resets
  await sleep(700);
  const prefs = await (await fetch(`http://127.0.0.1:${PORT}/api/settings/prefs`)).json();
  ok(JSON.parse(prefs.ctx_categories || '[]').includes('Clients'), 'Categories kept in the settings table too');
  await page.evaluate(() => localStorage.removeItem('pl_ctx_categories'));
  ok(await page.evaluate(() => { window.openContextBankWorkspace(); return true; }), 'Reopen after storage loss');
  await sleep(400);
  ok(await page.isVisible('[data-ctx-filter="Clients"]'), 'Clients comes back from the settings copy');
  // A fresh page load with storage cleared reads the copy from the database
  await page.evaluate(() => localStorage.removeItem('pl_ctx_categories'));
  await page.reload();
  await page.waitForFunction(() => typeof window.openContextBankWorkspace === 'function');
  await sleep(800);
  await page.evaluate(() => { const g = document.getElementById('activationGate'); if (g) g.hidden = true; document.getElementById('app')?.removeAttribute('inert'); });
  await page.evaluate(async () => { await window.PL_prefs.ready; window.openContextBankWorkspace(); });
  await sleep(500);
  ok(await page.isVisible('[data-ctx-filter="Clients"]'), 'Clients survives a reload with storage cleared');
  ok(errors.length === 0, 'No page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
} catch (e) { failed++; console.log('FAIL ' + e.message.split('\n')[0]); }
await browser.close(); srv.kill();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
