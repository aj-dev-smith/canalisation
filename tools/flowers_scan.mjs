// Buffer scan — the CPU side of the peak probe. The scene target said the tri
// stream carries values in the thousands; every one of those is either a vertex
// COLOUR or an EMISSIVE that the capture wrote, and both are still sitting in
// FlowerBuffers where they can be read by name. Prints the extremes per stream
// per specimen and the organ meta the offending vertex belongs to.
//
//   node tools/flowers_scan.mjs '<query>' [seconds]
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';

const [, , query = 'garden=7&seed=21&ff=2200', secondsArg = '25'] = process.argv;
const pageUrl = pathToFileURL(process.cwd() + '/flowers.html').href + '?' + query;
const b = await chromium.launch({ headless: false, args: ['--use-angle=metal', '--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: 1100, height: 780 }, deviceScaleFactor: 1 });
const errs = [];
pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
await pg.goto(pageUrl);
await pg.waitForFunction(() => window.__fl && window.__fl.scene, null, { timeout: 60000 });
await pg.waitForTimeout(+secondsArg * 1000);

const out = await pg.evaluate(() => {
  const owner = (B, stream, k) => {
    for (const o of B.organs) {
      const a = o[stream + '0'], z = o[stream + '1'];
      if (k >= a && k < z) return o.meta;
    }
    return null;
  };
  const rows = [];
  window.__fl.garden.forEach((s, i) => {
    if (!s.S || !s.B) return;
    const B = s.B;
    // every field, not just the two that were suspects: a varying outside its
    // own vertex hull is either bad data or bad interpolation, and the first
    // pass of this file only looked at colour and emissive
    const scan = (arr, n, stride, cOff, eOff, stream, pOff, nOff) => {
      let mc = 0, mci = -1, me = 0, mei = -1, nan = 0, nanK = -1;
      let mp = 0, mpi = -1, mn = 0, mni = -1, nMin = 1e9;
      for (let k = 0; k < n; k += stride) {
        for (let j = 0; j < stride; j++) if (!isFinite(arr[k + j])) { nan++; if (nanK < 0) nanK = k; }
        for (let j = 0; j < 3; j++) {
          const v = arr[k + cOff + j];
          if (isFinite(v) && v > mc) { mc = v; mci = k; }
        }
        const e = arr[k + eOff];
        if (isFinite(e) && e > me) { me = e; mei = k; }
        if (pOff !== undefined) {
          const px = Math.abs(arr[k + pOff]), py = Math.abs(arr[k + pOff + 1]), pz = Math.abs(arr[k + pOff + 2]);
          const pm = Math.max(px, py, pz);
          if (isFinite(pm) && pm > mp) { mp = pm; mpi = k; }
        }
        if (nOff !== undefined) {
          const L = Math.hypot(arr[k + nOff], arr[k + nOff + 1], arr[k + nOff + 2]);
          if (isFinite(L)) { if (L > mn) { mn = L; mni = k; } if (L < nMin) nMin = L; }
        }
      }
      return {
        stream, n: n / stride, nan, nanOrgan: nanK >= 0 ? owner(B, stream, nanK) : null,
        maxCol: +mc.toFixed(3), colOrgan: mci >= 0 ? owner(B, stream, mci) : null,
        maxEmis: +me.toFixed(3), emisOrgan: mei >= 0 ? owner(B, stream, mei) : null,
        maxPos: +mp.toFixed(2), posOrgan: mpi >= 0 ? owner(B, stream, mpi) : null,
        maxNrm: +mn.toFixed(3), minNrm: nMin === 1e9 ? null : +nMin.toFixed(5),
        nrmOrgan: mni >= 0 ? owner(B, stream, mni) : null,
      };
    };
    rows.push({
      i, name: s.S.name,
      tri: scan(B.tri, B.triN, 10, 6, 9, 'tri', 0, 3),
      pet: scan(B.petb, B.petbN, 16, 6, 9, 'pet', 0, 3),
      seg: scan(B.seg, B.segN, 12, 8, 11, 'seg', 0),
      pt: scan(B.pt, B.ptN, 7, 3, 6, 'pt', 0),
    });
  });
  return { rows, state: window.__fl.state() };
});

console.log('step', out.state.step, 'shot', out.state.shot);
for (const r of out.rows) {
  console.log(`#${r.i} ${r.name}`);
  for (const k of ['tri', 'pet', 'seg', 'pt']) {
    const s = r[k];
    const om = o => o ? `${o.kind}${o.q !== undefined ? ' q' + (+o.q).toFixed(2) : ''}` : '-';
    console.log(`   ${k.padEnd(4)} n=${String(s.n).padStart(7)} nan=${s.nan}(${om(s.nanOrgan)})  col ${String(s.maxCol).padStart(7)}(${om(s.colOrgan)})  emis ${String(s.maxEmis).padStart(6)}(${om(s.emisOrgan)})  |pos| ${String(s.maxPos).padStart(9)}(${om(s.posOrgan)})  |nrm| ${String(s.minNrm).padStart(8)}..${String(s.maxNrm).padStart(9)}(${om(s.nrmOrgan)})`);
  }
}
console.log('errors:', errs.length ? errs.slice(0, 4) : 'none');
await b.close();
