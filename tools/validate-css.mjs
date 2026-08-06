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
  [1440, /\.hero-grid\{[^}]*grid-template-columns:\.94fr 1\.06fr/u, /\.calculator-grid\{[^}]*repeat\(4,minmax\(0,1fr\)\)/u],
  [1024, /@media\(max-width:1024px\)/u, /calculator-grid\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/u],
  [768, /@media\(max-width:768px\)[\s\S]*?hero-grid\{[^}]*grid-template-columns:1fr/u, /calculator-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/u],
  [520, /@media\(max-width:520px\)/u, /insight\{min-width:90%/u],
  [360, /@media\(max-width:359px\)/u, /calculator-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/u],
];

for (const [viewport, layout, content] of responsiveChecks) {
  if (!layout.test(css)) failures.push(`${viewport}px: expected responsive layout is missing`);
  if (!content.test(css)) failures.push(`${viewport}px: expected content grid is missing`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log("styles.css: units, functions, grid columns, and media queries are valid");
  console.log("Responsive hero, calculator, and insight rules verified from 1440px through 360px");
}
