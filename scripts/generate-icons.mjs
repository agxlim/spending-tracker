// Renders the app icons from SVG artwork with Playwright.
// Usage: node scripts/generate-icons.mjs public/icons src/app
// (run `npx playwright install chromium` first, or set CHROMIUM_PATH)
import { writeFileSync } from "node:fs";
import { chromium } from "playwright";
const art = (scale) => `
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <circle cx="256" cy="256" r="150" fill="none" stroke="#3f3f46" stroke-width="36"/>
    <circle cx="256" cy="256" r="150" fill="none" stroke="#22c55e" stroke-width="36" stroke-linecap="round"
      stroke-dasharray="${2 * Math.PI * 150 * 0.7} 9999" transform="rotate(-90 256 256)"/>
    <path d="M256 166v180M296 200c-8-16-24-24-40-24c-24 0-40 13-40 32c0 44 84 26 84 72c0 20-18 34-44 34c-18 0-36-9-44-26"
      fill="none" stroke="#fafafa" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
const svg = (scale, rounded) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" ${rounded ? 'rx="112"' : ""} fill="#171717"/>${art(scale)}
</svg>`;
(async () => {
  const [out, appDir] = process.argv.slice(2);
  writeFileSync(`${appDir}/icon.svg`, svg(1, true));
  // CHROMIUM_PATH lets you use an already-installed browser.
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  const page = await browser.newPage();
  const render = async (markup, size, path) => {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0">${markup.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`);
    await page.screenshot({ path, omitBackground: true });
  };
  await render(svg(1, false), 192, `${out}/icon-192.png`);
  await render(svg(1, false), 512, `${out}/icon-512.png`);
  await render(svg(0.78, false), 512, `${out}/icon-maskable-512.png`); // art inside the 80% safe zone
  await render(svg(1, false), 180, `${appDir}/apple-icon.png`);
  await browser.close();
})();
