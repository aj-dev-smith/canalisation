import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
const pageUrl = pathToFileURL(process.cwd() + '/canalisation.html').href;
const [,, out, waitMs] = process.argv;
const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: 1100, height: 760 }, deviceScaleFactor: 1 });
const errs = [];
pg.on('console', m => { if (m.type()==='error'||m.type()==='warning') errs.push(m.type()+': '+m.text()); });
pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
await pg.goto(pageUrl);
await pg.waitForTimeout(+waitMs || 4000);
const st = await pg.evaluate(() => {
  const ax0len = (a)=>a.plant.axes[0].length.toFixed(2);
  const a = window.__app; if (!a) return { noApp: true };
  const s = a.plant.stats();
  return { fps:+a.fps.toFixed(1), organs:s.organs, cells:s.cells, axes:s.axes,
    tris:a.renderer.nTri, lines:a.renderer.nLine, pts:a.renderer.nPt,
    div: s.divergence ? {m:+s.divergence.mean.toFixed(1), sd:+s.divergence.sd.toFixed(1)} : null,
    height:+s.height.toFixed(2), lib:a.plant.leaves.lib.length,
    veins: a.plant.leaves.lib[0] ? a.plant.leaves.lib[0].veins.length : 0,
    len:+ax0len(a) };
});
console.log(JSON.stringify(st));
if (errs.length) console.log('--- console ---\n' + errs.slice(0,12).join('\n'));
await pg.screenshot({ path: out });
await b.close();
