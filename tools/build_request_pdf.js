/* Renders tools/request_form.html to assets/docs/Vehicle_Request_Form_EN.pdf
   (one A4 page). Needs Playwright with Chromium:  node tools/build_request_pdf.js */
const path = require("path");
const { execSync } = require("child_process");

function loadPlaywright() {
  try { return require("playwright"); } catch (e) {
    return require(path.join(execSync("npm root -g").toString().trim(), "playwright"));
  }
}

(async () => {
  const { chromium } = loadPlaywright();
  const root = path.resolve(__dirname, "..");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("file://" + path.join(root, "tools", "request_form.html"));
  await page.evaluate(() => document.fonts.ready);
  const out = path.join(root, "assets", "docs", "Vehicle_Request_Form_EN.pdf");
  await page.pdf({ path: out, format: "A4", printBackground: true, preferCSSPageSize: true });
  await browser.close();
  console.log("wrote " + path.relative(root, out));
})();
