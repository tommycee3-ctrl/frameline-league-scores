import { readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const source = await readFile(path.join(process.cwd(), "public", "frameline-mark.svg"));
const dataUrl = `data:image/svg+xml;base64,${source.toString("base64")}`;
const browser = await chromium.launch({ headless: true });

try {
  for (const size of [192, 512]) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(`<style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;background:#101b2b}body{display:grid;place-items:center;padding:9%}img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 8px 0 rgba(0,0,0,.22))}</style><img src="${dataUrl}" alt="">`);
    await page.screenshot({ path: path.join(process.cwd(), "public", `icon-${size}.png`) });
    await page.close();
  }
} finally {
  await browser.close();
}
