/**
 * Stamp partials/header.html and partials/footer.html into every page.
 * The only per-page difference is which nav link is marked active.
 *
 *   node scripts/sync-chrome.mjs
 *   node scripts/sync-chrome.mjs --check
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");

const pages = {
  "index.html": "home",
  "fishing.html": "fishing",
  "hunting.html": "hunting",
  "rivers.html": "rivers",
  "reports.html": "reports"
};

const headerTpl = fs.readFileSync(path.join(root, "partials/header.html"), "utf8").trim();
const footerTpl = fs.readFileSync(path.join(root, "partials/footer.html"), "utf8").trim();

const NAV = [
  ["home", "index.html", "Home"],
  ["fishing", "fishing.html", "Fishing"],
  ["hunting", "hunting.html", "Hunting"],
  ["rivers", "rivers.html", "Rivers"],
  ["reports", "reports.html", "Reports"]
];

function navMarkup(active) {
  const items = NAV.map(([key, href, label]) => {
    const attrs = key === active ? ' class="active" aria-current="page"' : "";
    return `        <li><a href="${href}"${attrs}>${label}</a></li>`;
  }).join("\n");
  return `${items}
        <li class="nav-cta"><a href="index.html#booking-section" class="btn btn-gold" onclick="openBooking();return false">Book Now</a></li>`;
}

function render(template, active) {
  return template.replaceAll("{{nav}}", navMarkup(active));
}

function block(name, html) {
  return `<!-- RIMEWILD:${name} start -->\n${html}\n<!-- RIMEWILD:${name} end -->`;
}

const headerMarked = /<!-- RIMEWILD:HEADER start -->[\s\S]*?<!-- RIMEWILD:HEADER end -->/;
const footerMarked = /<!-- RIMEWILD:FOOTER start -->[\s\S]*?<!-- RIMEWILD:FOOTER end -->/;
const headerLoose = /<!-- NAV -->\s*<nav class="nav[\s\S]*?<\/nav>/;
const footerLoose = /<!-- FOOTER -->\s*<footer[\s\S]*?<\/footer>\s*(?:<!-- MOBILE BAR -->\s*)?<nav class="mobile-bar[\s\S]*?<\/nav>/;

let drifted = false;

for (const [file, active] of Object.entries(pages)) {
  const filePath = path.join(root, file);
  const original = fs.readFileSync(filePath, "utf8");
  const header = block("HEADER", render(headerTpl, active));
  const footer = block("FOOTER", render(footerTpl, active));
  let next = original;

  if (headerMarked.test(next)) next = next.replace(headerMarked, header);
  else if (headerLoose.test(next)) next = next.replace(headerLoose, header);
  else throw new Error(`No header slot in ${file}`);

  if (footerMarked.test(next)) next = next.replace(footerMarked, footer);
  else if (footerLoose.test(next)) next = next.replace(footerLoose, footer);
  else throw new Error(`No footer slot in ${file}`);

  if (next !== original) {
    drifted = true;
    if (!check) fs.writeFileSync(filePath, next);
    console.log(`${check ? "drift" : "synced"} ${file}`);
  } else {
    console.log(`ok ${file}`);
  }
}

if (check && drifted) {
  console.error("Header/footer drifted from partials. Run: node scripts/sync-chrome.mjs");
  process.exit(1);
}
