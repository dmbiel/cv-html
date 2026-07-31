import { accessSync, constants, mkdirSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { PDFDocument } from "pdf-lib";
import { chromium } from "playwright-core";
import { PNG } from "pngjs";
import { startPreviewServer } from "./server.mjs";

const projectRoot = process.cwd();
const outputDirectory = resolve(projectRoot, "artifacts");
const pdfDirectory = resolve(projectRoot, "output", "pdf");
const expectedPageCount = 2;
const cssPixelsPerCentimeter = 96 / 2.54;
const expectedA4 = {
  width: 21 * cssPixelsPerCentimeter,
  height: 29.7 * cssPixelsPerCentimeter,
};

const executableCandidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);

const findBrowserExecutable = () => {
  for (const candidate of executableCandidates) {
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Try the next supported Chrome/Chromium location.
    }
  }

  throw new Error(
    "Chrome or Chromium was not found. Set CHROME_PATH to its executable.",
  );
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

mkdirSync(outputDirectory, { recursive: true });
mkdirSync(pdfDirectory, { recursive: true });

const preview = await startPreviewServer({
  host: "127.0.0.1",
  port: 0,
  root: projectRoot,
  silent: true,
});

const browser = await chromium.launch({
  executablePath: findBrowserExecutable(),
  headless: true,
});

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(preview.url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  const layout = await page.evaluate(() => ({
    title: document.title,
    pageCount: document.querySelectorAll(".page-sheet").length,
    fontsReady:
      document.fonts.status === "loaded" &&
      document.fonts.check('15px "Roboto Mono"'),
    fontResources: performance
      .getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter((name) => name.includes("RobotoMono-")),
    imagesReady: Array.from(document.images).every(
      (image) => image.complete && image.naturalWidth > 0,
    ),
    pages: Array.from(document.querySelectorAll(".page-sheet")).map(
      (sheet, index) => {
        const content = sheet.querySelector(".content");
        const footer = sheet.querySelector(".footer");
        const sheetRect = sheet.getBoundingClientRect();
        const footerRect = footer.getBoundingClientRect();

        return {
          number: index + 1,
          width: sheetRect.width,
          height: sheetRect.height,
          overflowX: sheet.scrollWidth - sheet.clientWidth,
          overflowY: sheet.scrollHeight - sheet.clientHeight,
          contentOverflowX: content.scrollWidth - content.clientWidth,
          contentOverflowY: content.scrollHeight - content.clientHeight,
          contentBottom: content.getBoundingClientRect().bottom - sheetRect.top,
          footerTop: footerRect.top - sheetRect.top,
          footerBottom: footerRect.bottom - sheetRect.top,
        };
      },
    ),
  }));

  assert(
    layout.pageCount === expectedPageCount,
    `Expected ${expectedPageCount} pages, found ${layout.pageCount}`,
  );
  assert(layout.fontsReady, "Roboto Mono did not load");
  assert(layout.fontResources.length >= 2, "Local font files were not requested");
  assert(layout.imagesReady, "One or more contact icons did not load");

  layout.pages.forEach((pageLayout) => {
    assert(
      Math.abs(pageLayout.width - expectedA4.width) < 1,
      `Page ${pageLayout.number} width is not A4`,
    );
    assert(
      Math.abs(pageLayout.height - expectedA4.height) < 1,
      `Page ${pageLayout.number} height is not A4`,
    );
    assert(
      pageLayout.overflowX === 0 && pageLayout.overflowY === 0,
      `Page ${pageLayout.number} overflows its A4 sheet`,
    );
    assert(
      pageLayout.contentOverflowX === 0 && pageLayout.contentOverflowY === 0,
      `Page ${pageLayout.number} content area overflows`,
    );
    assert(
      pageLayout.footerBottom <= pageLayout.height,
      `Page ${pageLayout.number} footer is outside the A4 sheet`,
    );
    assert(
      pageLayout.contentBottom <= pageLayout.footerTop,
      `Page ${pageLayout.number} content overlaps its footer`,
    );
  });

  const sheets = page.locator(".page-sheet");
  const visualChecks = [];

  for (let index = 0; index < layout.pageCount; index += 1) {
    const screenshotPath = join(outputDirectory, `page-${index + 1}.png`);
    await sheets.nth(index).screenshot({
      path: screenshotPath,
    });

    const screenshot = PNG.sync.read(await readFile(screenshotPath));
    const footerStart = Math.floor(screenshot.height * 0.84);
    const footerEnd = Math.floor(screenshot.height * 0.98);
    let footerInkPixels = 0;

    for (let y = footerStart; y < footerEnd; y += 1) {
      for (let x = 0; x < screenshot.width; x += 1) {
        const offset = (screenshot.width * y + x) * 4;
        const average =
          (screenshot.data[offset] +
            screenshot.data[offset + 1] +
            screenshot.data[offset + 2]) /
          3;

        if (screenshot.data[offset + 3] > 0 && average < 220) {
          footerInkPixels += 1;
        }
      }
    }

    assert(
      footerInkPixels > 100,
      `Page ${index + 1} footer is not visible in its screenshot`,
    );
    visualChecks.push({ page: index + 1, footerInkPixels });
  }

  const pdfPath = join(pdfDirectory, "Dmytro-Bieliaiev-CV.pdf");
  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    tagged: true,
    outline: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });

  const pdf = await PDFDocument.load(await readFile(pdfPath));
  const pdfPageCount = pdf.getPageCount();
  assert(
    pdfPageCount === expectedPageCount,
    `Generated PDF has ${pdfPageCount} pages instead of ${expectedPageCount}`,
  );

  const report = {
    generatedAt: new Date().toISOString(),
    browser: await browser.version(),
    pdfPageCount,
    visualChecks,
    ...layout,
  };
  writeFileSync(
    join(outputDirectory, "layout-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );

  console.log(
    `Verified ${layout.pageCount} A4 pages and generated artifacts in ${outputDirectory}`,
  );
} finally {
  await browser.close();
  await preview.close();
}
