import fs from "node:fs";

const file = new URL("../styles.css", import.meta.url);
const css = fs.readFileSync(file, "utf8");
const failures = [];

const unit = String.raw`(?:px|r?em|%|vh|vw|vmin|vmax|svh|svw|lvh|lvw|dvh|dvw|fr|deg|rad|turn|s|ms|dpi|dpcm|ch|ex|cm|mm|in|pt|pc)`;
const spacedUnit = new RegExp(String.raw`(?<![\w.-])(?:\d*\.\d+|\d+)\s+${unit}\b`, "giu");

for (const match of css.matchAll(spacedUnit)) {
  const line = css.slice(0, match.index).split("\n").length;
  failures.push(`line ${line}: whitespace separates a number and unit (${match[0]})`);
}

function checkPairs(open, close, label) {
  const stack = [];
  let quote = "";
  let comment = false;

  for (let index = 0; index < css.length; index += 1) {
    const char = css[index];
    const next = css[index + 1];

    if (comment) {
      if (char === "*" && next === "/") {
        comment = false;
        index += 1;
      }
      continue;
    }
    if (!quote && char === "/" && next === "*") {
      comment = true;
      index += 1;
      continue;
    }
    if (quote) {
      if (char === quote && css[index - 1] !== "\\") quote = "";
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === open) stack.push(index);
    if (char === close && stack.pop() === undefined) {
      failures.push(`unexpected ${close} at offset ${index} (${label})`);
    }
  }

  if (stack.length) failures.push(`${stack.length} unclosed ${open} (${label})`);
}

checkPairs("(", ")", "CSS functions");
checkPairs("{", "}", "rule blocks");

for (const match of css.matchAll(/@media\s*\(([^)]*)\)/giu)) {
  if (!/(?:max|min)-width/iu.test(match[1])) continue;
  if (!/^\s*(?:max|min)-width\s*:\s*\d+(?:\.\d+)?px\s*$/iu.test(match[1])) {
    failures.push(`invalid width media query: ${match[0]}`);
  }
}

for (const match of css.matchAll(/grid-template-columns\s*:\s*([^;{}]+)\s*;/giu)) {
  const value = match[1].trim();
  if (!/^(?:none|subgrid|(?:repeat|minmax|fit-content)\([^;{}]+\)|(?:auto|min-content|max-content|\d*\.?\d+(?:fr|px|%)))(?:\s+(?:repeat|minmax|fit-content)\([^;{}]+\)|\s+(?:auto|min-content|max-content|\d*\.?\d+(?:fr|px|%)))*$/iu.test(value)) {
    failures.push(`invalid grid-template-columns value: ${value}`);
  }
}

const responsiveChecks = [
  [1440, /\.hero-inner\s*\{[^}]*minmax\(0,\s*52fr\)\s+minmax\(0,\s*48fr\)/su, /\.action-grid\s*\{[^}]*repeat\(3,\s*minmax\(0,\s*1fr\)\)/su],
  [1280, /@media\s*\(max-width:\s*1280px\)[\s\S]*?\.hero-inner\s*\{[^}]*gap:\s*56px/su, /\.action-grid\s*\{[^}]*repeat\(3,\s*minmax\(0,\s*1fr\)\)/su],
  [1024, /@media\s*\(max-width:\s*1024px\)[\s\S]*?\.hero-inner\s*\{[^}]*minmax\(0,\s*52fr\)\s+minmax\(430px,\s*48fr\)/su, /\.action-grid\s*\{[^}]*repeat\(3,\s*minmax\(0,\s*1fr\)\)/su],
  [768, /@media\s*\(max-width:\s*768px\)[\s\S]*?\.hero-inner\s*\{[^}]*grid-template-columns:\s*1fr/su, /@media\s*\(max-width:\s*768px\)[\s\S]*?\.action-grid\s*\{[^}]*repeat\(2,\s*minmax\(0,\s*1fr\)\)/su],
  [520, /@media\s*\(max-width:\s*520px\)[\s\S]*?\.hero-inner\s*\{[^}]*gap:\s*70px/su, /@media\s*\(max-width:\s*520px\)[\s\S]*?\.action-grid\s*\{[^}]*grid-template-columns:\s*1fr/su],
];

for (const [viewport, hero, actions] of responsiveChecks) {
  if (!hero.test(css)) failures.push(`${viewport}px: expected hero layout is missing`);
  if (!actions.test(css)) failures.push(`${viewport}px: expected Quick Actions grid is missing`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log("styles.css: units, functions, grid columns, and media queries are valid");
  console.log("Responsive hero and Quick Actions rules verified at 1440px, 1280px, 1024px, 768px, and 520px");
}
