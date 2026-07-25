import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
const cases = [
  { name: 'mobile-fern', vp: { width: 390, height: 844 }, species: null, wait: 22000 },
  { name: 'mobile-abyss', vp: { width: 390, height: 844 }, species: 'Abyssal Frond', wait: 22000 },
  { name: 'desk-ossuary', vp: { width: 1100, height: 760 }, species: 'Spiral Ossuary', wait: 22000 },
  { name: 'desk-coral', vp: { width: 1100, height: 760 }, species: 'Sun Coral', wait: 22000 },
];
for (const c of cases) {
  const pg = await b.newPage({ viewport: c.vp, deviceScaleFactor: 1, isMobile: c.vp.width < 500, hasTouch: c.vp.width < 500 });
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto('file://${process.cwd()}/canalisation.html');
  await pg.waitForTimeout(1500);
  if (c.species) await pg.evaluate((n) => { window.__app.newSpecimen(n); }, c.species);
  await pg.waitForTimeout(c.wait);
  const st = await pg.evaluate(() => { const a = window.__app, s = a.plant.stats();
    return { fps: +a.fps.toFixed(0), organs: s.organs, axes: s.axes, tris: a.renderer.nTri,
      lines: a.renderer.nLine, h: +s.height.toFixed(1),
      div: s.divergence ? +s.divergence.mean.toFixed(0) : null }; });
  console.log(c.name, JSON.stringify(st), errs.length ? 'ERR:' + errs.slice(0,3).join('|') : '');
  await pg.screenshot({ path: `shots/${c.name}.png` });
  await pg.close();
}
await b.close();
