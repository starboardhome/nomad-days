/**
 * Store screenshots: captures six screens from the web build (with the demo traveller, `?demo`)
 * and frames them with captions on the brand teal.
 *
 *   node scripts/dev/store-screenshots.cjs            # builds the web app first
 *   node scripts/dev/store-screenshots.cjs --no-build # reuse dist-screenshots/
 *
 * Writes:
 *   store/ios/NN-name.png                     App Store, 6.9" iPhone (1320×2868)
 *   store/android/NN-name.png                 Google Play phone (1080×1920)
 *   store/android/feature-graphic.png         Google Play feature graphic (1024×500)
 *   fastlane/metadata/android/en-US/images/   F-Droid: phoneScreenshots/, featureGraphic.png, icon.png
 *
 * Needs Playwright with Chromium (npm i -g playwright && npx playwright install chromium).
 * Edit SHOTS to change screens or captions.
 */
const fs = require('fs');
const http = require('http');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '../..');
const DIST = path.join(ROOT, 'dist-screenshots');
const OUT = { ios: path.join(ROOT, 'store/ios'), android: path.join(ROOT, 'store/android') };
const FDROID = path.join(ROOT, 'fastlane/metadata/android/en-US/images');

const SHOTS = [
  { name: 'days', path: '/', caption: 'Know exactly how many days you have left' },
  { name: 'trips', path: '/trips', caption: 'Every trip, past and planned' },
  { name: 'plan', path: '/trip/demo-maybe-pt', caption: 'Check a trip before you book it' },
  { name: 'own-rules', path: '/rules/TH', caption: 'Add rules for any country' },
  { name: 'uk-ties', path: '/uk-ties', caption: 'UK tax residence, made simple' },
  { name: 'privacy', path: '/settings', caption: 'Private by design', sub: 'No accounts, no servers. Your data stays on your phone.', scroll: 'end' },
];

// Raw capture size (CSS px × 3) and the framed canvas for each store
const TARGETS = {
  ios: { viewport: { width: 393, height: 852 }, canvas: { width: 1320, height: 2868 } },
  android: { viewport: { width: 360, height: 640 }, canvas: { width: 1080, height: 1920 } },
};

const TEAL = '#0F766E';
const TEAL_LIGHT = '#14B8A6';

const loadPlaywright = () => {
  for (const base of [ROOT, execSync('npm root -g').toString().trim()]) {
    try {
      return require(require.resolve('playwright', { paths: [base] }));
    } catch {}
  }
  throw new Error('Playwright not found: npm i -g playwright && npx playwright install chromium');
};

/** Static server for the web build, falling back to index.html for client-side routes */
const serve = (dir) =>
  new Promise((resolve) => {
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf', '.json': 'application/json' };
    const server = http.createServer((req, res) => {
      const url = decodeURIComponent(req.url.split('?')[0]);
      const candidates = [url, `${url}.html`, path.join(url, 'index.html')].map((p) => path.join(dir, p));
      const file = candidates.find((f) => f.startsWith(dir) && fs.existsSync(f) && fs.statSync(f).isFile()) ?? path.join(dir, 'index.html');
      res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });

const frameHtml = ({ width, height }, { caption, sub }, screenshot) => {
  const pad = Math.round(width * 0.08);
  const font = Math.round(width * 0.068);
  const head = Math.round(font * 1.15 * 2 + pad * 1.9); // room for two lines, so every phone sits at the same height
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;box-sizing:border-box}
  body{width:${width}px;height:${height}px;overflow:hidden;background:linear-gradient(160deg,${TEAL_LIGHT},${TEAL});
       font-family:-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;display:flex;flex-direction:column;align-items:center}
  header{height:${head}px;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:${pad * 0.5}px ${pad}px 0;gap:${Math.round(font * 0.3)}px}
  h1{color:#fff;font-size:${font}px;line-height:1.15;font-weight:800;text-align:center;letter-spacing:-0.01em;text-wrap:balance}
  p{color:#fff;opacity:.92;font-size:${Math.round(font * 0.5)}px;line-height:1.3;text-align:center;text-wrap:balance}
  .phone{position:absolute;top:${head}px;left:50%;transform:translateX(-50%);width:${Math.round(width * 0.8)}px;border-radius:${Math.round(width * 0.06)}px;overflow:hidden;
         border:${Math.round(width * 0.012)}px solid #0b3b37;box-shadow:0 ${Math.round(width * 0.02)}px ${Math.round(width * 0.06)}px rgba(0,0,0,.35);background:#fff}
  .phone img{display:block;width:100%}
  </style></head><body><header><h1>${caption}</h1>${sub ? `<p>${sub}</p>` : ''}</header><div class="phone"><img src="data:image/png;base64,${screenshot.toString('base64')}"></div></body></html>`;
};

const featureGraphicHtml = (icon) => `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0}
  body{width:1024px;height:500px;overflow:hidden;background:linear-gradient(135deg,${TEAL_LIGHT},${TEAL});display:flex;align-items:center;gap:56px;padding:0 80px;
       font-family:-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#fff;box-sizing:border-box}
  img{width:220px;height:220px;border-radius:50px;box-shadow:0 12px 40px rgba(0,0,0,.3)}
  h1{font-size:76px;font-weight:800;letter-spacing:-0.02em}
  p{font-size:34px;opacity:.95;margin-top:12px;line-height:1.25}
  </style></head><body><img src="data:image/png;base64,${icon.toString('base64')}">
  <div><h1>Nomad Days</h1><p>Count your days abroad.<br>Private by design.</p></div></body></html>`;

const renderHtml = async (page, html, { width, height }, file) => {
  await page.setViewportSize({ width, height });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width, height } });
};

(async () => {
  if (!process.argv.includes('--no-build')) {
    console.log('Building the web app…');
    execSync(`npx expo export --platform web --output-dir ${DIST}`, { cwd: ROOT, stdio: 'inherit', env: { ...process.env, CI: '1' } });
  }
  const { chromium } = loadPlaywright();
  const server = await serve(DIST);
  const base = `http://127.0.0.1:${server.address().port}`;
  // Date inputs follow Chromium's UI language, not the page locale
  const browser = await chromium.launch({ args: ['--lang=en-GB'], env: { ...process.env, LANG: 'en_GB.UTF-8', LANGUAGE: 'en_GB' } });
  const errors = [];

  for (const [store, { viewport, canvas }] of Object.entries(TARGETS)) {
    fs.mkdirSync(OUT[store], { recursive: true });
    // en-GB: dates in native-style day/month order (web date inputs follow the browser locale)
    const context = await browser.newContext({ viewport, deviceScaleFactor: 3, locale: 'en-GB' });
    const app = await context.newPage();
    app.on('pageerror', (e) => errors.push(`${store}: ${e.message}`));
    const framer = await browser.newPage();
    for (const [i, shot] of SHOTS.entries()) {
      await app.goto(`${base}${shot.path}?demo`);
      await app.waitForTimeout(2000);
      if (shot.scroll === 'end') {
        // React Native Web scroll views are scrollable divs, not the window
        await app.evaluate(() => {
          for (const el of document.querySelectorAll('div')) if (el.scrollHeight > el.clientHeight + 10 && getComputedStyle(el).overflowY !== 'visible') el.scrollTop = el.scrollHeight;
        });
        await app.waitForTimeout(500);
      }
      const raw = await app.screenshot();
      const file = path.join(OUT[store], `${String(i + 1).padStart(2, '0')}-${shot.name}.png`);
      await renderHtml(framer, frameHtml(canvas, shot, raw), canvas, file);
      console.log('wrote', path.relative(ROOT, file));
    }
    await context.close();
    await framer.close();
  }

  // Google Play feature graphic, and the F-Droid copies
  const page = await browser.newPage();
  const icon = fs.readFileSync(path.join(ROOT, 'assets/images/icon.png'));
  await renderHtml(page, featureGraphicHtml(icon), { width: 1024, height: 500 }, path.join(OUT.android, 'feature-graphic.png'));
  fs.mkdirSync(path.join(FDROID, 'phoneScreenshots'), { recursive: true });
  for (const f of fs.readdirSync(path.join(FDROID, 'phoneScreenshots'))) fs.rmSync(path.join(FDROID, 'phoneScreenshots', f));
  SHOTS.forEach((s, i) =>
    fs.copyFileSync(path.join(OUT.android, `${String(i + 1).padStart(2, '0')}-${s.name}.png`), path.join(FDROID, 'phoneScreenshots', `${i + 1}.png`)),
  );
  fs.copyFileSync(path.join(OUT.android, 'feature-graphic.png'), path.join(FDROID, 'featureGraphic.png'));
  await renderHtml(page, `<body style="margin:0"><img src="data:image/png;base64,${icon.toString('base64')}" style="width:512px;height:512px">`, { width: 512, height: 512 }, path.join(FDROID, 'icon.png'));
  console.log('wrote feature graphic and F-Droid images');

  await browser.close();
  server.close();
  if (errors.length) {
    console.error('Page errors:\n' + errors.join('\n'));
    process.exit(1);
  }
})();
