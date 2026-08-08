import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolsDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.dirname(toolsDirectory);
const workspaceDirectory = path.dirname(projectDirectory);
const referenceDirectory = path.join(workspaceDirectory, 'rent-check-reference');

const copies = [
  ['calc.html', 'calc/index.html', 'redevelopment', '../'],
  ['youth_score.html', 'tools/youth-score/index.html', 'youth-score', '../../'],
  ['index.html', 'tools/rent-check/index.html', 'rent-check', '../../'],
  ['hwagok_map_widget.html', 'tools/apartment/index.html', 'apartment', '../../']
];

function read(base, relativePath) {
  return fs.readFileSync(path.join(base, relativePath), 'utf8').replaceAll('\r\n', '\n');
}

function inlineScripts(html) {
  return [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/giu)]
    .map((match) => match[1].replace(/[ \t]+$/gmu, '').trim())
    .filter(Boolean);
}

for (const [sourcePath, destinationPath, toolId, root] of copies) {
  const destination = read(projectDirectory, destinationPath);
  assert.match(destination, new RegExp(`class="v2-tool-page"[^>]*data-v2-root="${root.replaceAll('.', '\\.')}"[^>]*data-tool-id="${toolId}"`, 'u'));
  assert.match(destination, /tool-shell\.css/u);
  assert.match(destination, /tool-common\.js/u);

  if (fs.existsSync(referenceDirectory)) {
    const source = read(referenceDirectory, sourcePath);
    assert.deepEqual(
      inlineScripts(destination),
      inlineScripts(source),
      `${toolId}: inline source logic changed`
    );
  }
}

const tools = JSON.parse(read(projectDirectory, 'data/tools.json'));
const expectedPaths = new Map([
  ['redevelopment', 'calc/'],
  ['youth-score', 'tools/youth-score/'],
  ['rent-check', 'tools/rent-check/'],
  ['apt-widget', 'tools/apartment/']
]);
for (const [id, expectedPath] of expectedPaths) {
  const tool = tools.find((item) => item.id === id);
  assert.equal(tool?.status, 'available', `${id}: not available`);
  assert.equal(tool?.url, expectedPath, `${id}: wrong V2 URL`);
}

for (const relativePath of [
  'tools/rent-check/widget_data.json',
  'tools/apartment/gangseo_apt_summary.json',
  'tools/apartment/gangseo_apt_detail.json'
]) {
  JSON.parse(read(projectDirectory, relativePath));
}

if (fs.existsSync(referenceDirectory)) {
  const dataCopies = [
    ['widget_data.json', 'tools/rent-check/widget_data.json'],
    ['gangseo_apt_summary.json', 'tools/apartment/gangseo_apt_summary.json'],
    ['gangseo_apt_detail.json', 'tools/apartment/gangseo_apt_detail.json']
  ];
  for (const [sourcePath, destinationPath] of dataCopies) {
    const hash = (filePath) => crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
    assert.equal(
      hash(path.join(projectDirectory, destinationPath)),
      hash(path.join(referenceDirectory, sourcePath)),
      `${destinationPath}: copied data differs from the source`
    );
  }
}

console.log('Four V2 tools are local and registered.');
console.log('Shared header/font assets are attached to every tool page.');
console.log(fs.existsSync(referenceDirectory)
  ? 'Inline tool logic and copied data match the read-only source.'
  : 'Reference checkout not present; local structure and data JSON were validated.');
