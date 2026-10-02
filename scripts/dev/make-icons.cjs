/**
 * Generates the placeholder app icon set from one SVG mark (calendar with "today" highlighted).
 *   node scripts/dev/make-icons.cjs
 * Renders with Playwright's Chromium (no image libraries needed). Replace when there's a real design.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { chromium } = require(require.resolve('playwright', { paths: [execSync('npm root -g').toString().trim()] }));

const TEAL = '#0F766E', TEAL_LIGHT = '#14B8A6', INK = '#134E4A', MINT = '#99F6E4', HEADER = '#CCFBF1', AMBER = '#F59E0B';
const GRADIENT = `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${TEAL_LIGHT}"/><stop offset="1" stop-color="${TEAL}"/></linearGradient>`;
const DAYS = [32, 44, 56, 68].flatMap((x) => [52, 62, 72].map((y) => [x, y]));
const TODAY = [56, 62];

/** The mark in a 100×100 box (bbox ≈ x 22–78, y 20–80), in colour or as a one-colour silhouette */
const mark = (mono = false) => {
  const fg = '#fff';
  const dots = DAYS.map(([x, y]) =>
    x === TODAY[0] && y === TODAY[1]
      ? `<circle cx="${x}" cy="${y}" r="4.6" fill="${mono ? '#000' : AMBER}"/>`
      : `<circle cx="${x}" cy="${y}" r="2.6" fill="${mono ? '#000' : MINT}"/>`,
  ).join('');
  const body = `
    <rect x="22" y="26" width="56" height="54" rx="9" fill="${fg}"/>
    <path d="M22 35a9 9 0 0 1 9-9h38a9 9 0 0 1 9 9v7H22z" fill="${mono ? '#000' : HEADER}"/>
    <rect x="33" y="19" width="6" height="14" rx="3" fill="${mono ? fg : INK}"/>
    <rect x="61" y="19" width="6" height="14" rx="3" fill="${mono ? fg : INK}"/>`;
  // Silhouette: black parts become holes
  return mono
    ? `<mask id="m"><rect width="100" height="100" fill="#000"/>${body}${dots}</mask><rect width="100" height="100" fill="#fff" mask="url(#m)"/>`
    : body + dots;
};

const svg = (size, inner, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100"><defs>${GRADIENT}${defs}</defs>${inner}</svg>`;
/** Mark scaled about the centre (s < 1 adds padding) */
const scaled = (s, inner) => `<g transform="translate(50 50) scale(${s}) translate(-50 -50)">${inner}</g>`;

const assets = path.join(__dirname, '../../assets');
const outputs = {
  'images/icon.png': svg(1024, `<rect width="100" height="100" fill="url(#bg)"/>${scaled(1.2, mark())}`),
  'images/favicon.png': svg(48, `<rect width="100" height="100" rx="22" fill="url(#bg)"/>${scaled(1.35, mark())}`),
  // Adaptive icons: launchers show the middle 66% of the layer, masked to a circle or squircle,
  // so the whole mark must fit inside a circle of ~60% of the canvas
  'images/android-icon-foreground.png': svg(512, scaled(0.66, mark())),
  'images/android-icon-background.png': svg(512, `<rect width="100" height="100" fill="url(#bg)"/>`),
  'images/android-icon-monochrome.png': svg(432, scaled(0.66, mark(true))),
  'images/splash-icon.png': svg(512, scaled(1.6, mark())),
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const [file, markup] of Object.entries(outputs)) {
    const size = +/width="(\d+)"/.exec(markup)[1];
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0;background:transparent">${markup}</body></html>`);
    await page.screenshot({ path: path.join(assets, file), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
    console.log('wrote', file, `${size}×${size}`);
  }
  await browser.close();

  // iOS 26+ Icon Composer bundle: the mark as one SVG layer on a teal glass fill
  const icon = path.join(assets, 'expo.icon');
  fs.rmSync(path.join(icon, 'Assets'), { recursive: true, force: true });
  fs.mkdirSync(path.join(icon, 'Assets'));
  fs.writeFileSync(
    path.join(icon, 'Assets', 'calendar.svg'),
    `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="600" viewBox="22 19 56 61">${mark()}</svg>\n`,
  );
  fs.writeFileSync(
    path.join(icon, 'icon.json'),
    JSON.stringify(
      {
        fill: { 'automatic-gradient': 'extended-srgb:0.05882,0.46275,0.43137,1.00000' }, // TEAL
        groups: [
          {
            layers: [{ 'image-name': 'calendar.svg', name: 'calendar', position: { scale: 1, 'translation-in-points': [0, 0] } }],
            shadow: { kind: 'neutral', opacity: 0.5 },
            translucency: { enabled: true, value: 0.5 },
          },
        ],
        'supported-platforms': { circles: ['watchOS'], squares: 'shared' },
      },
      null,
      2,
    ) + '\n',
  );
  console.log('wrote expo.icon (calendar.svg + icon.json)');
})();
