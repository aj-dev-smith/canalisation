import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: 1000, height: 700 } });
pg.on('pageerror', e => console.log('PAGEERROR: ' + e.message));
await pg.goto('file://${process.cwd()}/canalisation.html');
await pg.waitForTimeout(22000);
await pg.evaluate(() => { window.__app.focus = 'apex'; document.body.classList.add('collapsed'); });
await pg.waitForTimeout(9000);
console.log(JSON.stringify(await pg.evaluate(() => ({
  detail: +window.__app.detail.toFixed(2), dist: +window.__app.cam.dist.toFixed(2),
  pts: window.__app.renderer.nPt, lines: window.__app.renderer.nLine }))));
await pg.screenshot({ path: 'shots/closer.png' });
await b.close();
