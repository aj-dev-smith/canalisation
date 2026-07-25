import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
const pageUrl = pathToFileURL(process.cwd() + '/canalisation.html').href;
const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: 700, height: 500 } });
await pg.goto(pageUrl);
await pg.waitForTimeout(22000);
// freeze growth and the camera; only the sway field should still be moving
await pg.evaluate(() => { const a=window.__app; a.speedMul=0; a.cam.autoRot=false; a.cam.idle=0; });
await pg.waitForTimeout(1200);
const a1 = await pg.screenshot();
await pg.waitForTimeout(1400);
const a2 = await pg.screenshot();
const { writeFileSync } = await import('fs');
writeFileSync('/tmp/s1.png', a1); writeFileSync('/tmp/s2.png', a2);
await b.close();
