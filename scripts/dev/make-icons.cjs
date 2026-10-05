/**
 * Generates the app icon set from one SVG mark: assets/source/mark.svg.
 *   node scripts/dev/make-icons.cjs
 * The mark is on a 1024 canvas with a transparent background, in two groups: `calendar` (the outline and
 * rings) and `today` (the star). The one-colour Android icon draws both in white.
 * Renders with Playwright's Chromium (no image libraries needed).
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { chromium } = require(require.resolve('playwright', { paths: [execSync('npm root -g').toString().trim()] }));

// Icon background (the splash screen keeps the brand teal, set in app.json)
const BACKGROUND = '#192E45';

const source = fs.readFileSync(path.join(__dirname, '../../assets/source/mark.svg'), 'utf8');
const group = (id) => new RegExp(`<g id="${id}">([\\s\\S]*?)</g>`).exec(source)[1];
const sourceDefs = /<defs>([\s\S]*?)<\/defs>/.exec(source)?.[1] ?? '';
const recolour = (shapes, colour) => shapes.replace(/fill="[^"]*"/g, `fill="${colour}"`);
// Source bbox (x 141–882, y 135–879 of 1024) mapped into a 100×100 box: x ≈ 19.6–80.4, y 19–80
const FIT = 'translate(50 49.5) scale(0.08199) translate(-511.5 -507)';

/** The mark in a 100×100 box, in colour or in white for the one-colour (themed) Android icon */
const mark = (mono = false) => {
  const shapes = group('calendar') + group('today');
  return `<g transform="${FIT}">${mono ? recolour(shapes, '#fff') : shapes}</g>`;
};

const svg = (size, inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100"><defs>${sourceDefs}</defs>${inner}</svg>`;
/** Mark scaled about the centre (s < 1 adds padding) */
const scaled = (s, inner) => `<g transform="translate(50 50) scale(${s}) translate(-50 -50)">${inner}</g>`;

const assets = path.join(__dirname, '../../assets');
const outputs = {
  'images/icon.png': svg(1024, `<rect width="100" height="100" fill="${BACKGROUND}"/>${scaled(1.2, mark())}`),
  'images/favicon.png': svg(48, `<rect width="100" height="100" rx="22" fill="${BACKGROUND}"/>${scaled(1.35, mark())}`),
  // Adaptive icons: launchers show the middle 66% of the layer, masked to a circle or squircle,
  // so the whole mark must fit inside a circle of ~60% of the canvas
  'images/android-icon-foreground.png': svg(512, scaled(0.66, mark())),
  'images/android-icon-background.png': svg(512, `<rect width="100" height="100" fill="${BACKGROUND}"/>`),
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
    `<svg xmlns="http://www.w3.org/2000/svg" width="608" height="610" viewBox="19.6 19 60.8 61"><defs>${sourceDefs}</defs>${mark()}</svg>\n`,
  );
  fs.writeFileSync(
    path.join(icon, 'icon.json'),
    JSON.stringify(
      {
        fill: { solid: 'extended-srgb:0.09804,0.18039,0.27059,1.00000' }, // BACKGROUND
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
