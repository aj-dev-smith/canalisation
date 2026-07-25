import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: 1000, height: 720 } });
pg.on('pageerror', e => console.log('PAGEERROR: ' + e.message));
await pg.goto('file://${process.cwd()}/canalisation.html');
await pg.evaluate(() => { window.__app.speedMul = 4; document.body.classList.add('collapsed'); });
for (const t of [45000, 35000, 30000, 25000]) {
  await pg.waitForTimeout(t);
  console.log(JSON.stringify(await pg.evaluate(() => {
    const a = window.__app, ax = a.plant.axes[0];
    return { organs: a.plant.organCount(), floral: !!ax.floral, flr: +ax.florigen.toFixed(1),
      fruit: ax.fruit ? ax.fruit.stats() : null, tris: a.renderer.nTri, fps: +a.fps.toFixed(0) };
  })));
}
await pg.evaluate(() => { window.__app.speedMul = 1; });
await pg.waitForTimeout(2500);
await pg.screenshot({ path: 'shots/fruit.png' });
await b.close();
