import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: 1000, height: 700 } });
pg.on('pageerror', e => console.log('PAGEERROR: ' + e.message));
await pg.goto('file://${process.cwd()}/canalisation.html');
await pg.waitForTimeout(26000);
// stop growth and zoom onto one frond
await pg.evaluate(() => {
  const a = window.__app;
  a.speedMul = 0;
  const ax = a.plant.axes[0];
  const org = ax.organs[Math.max(0, ax.organs.length - 4)];
  a.cam.autoRot = false;
  a.cam.target.set([org.frame.o[0], org.frame.o[1], org.frame.o[2]]);
  a.cam.tgtY = org.frame.o[1]; a.cam.cx = org.frame.o[0]; a.cam.cz = org.frame.o[2];
  a.cam.dist = 6.5; a.cam.el = 0.55;
  a.plant.bounds = () => ({ cx: org.frame.o[0], cy: org.frame.o[1], cz: org.frame.o[2], w: 3.0, h: 2.2 });
  document.body.classList.add('collapsed');
});
await pg.waitForTimeout(2500);
await pg.screenshot({ path: 'shots/close.png' });
await b.close();
