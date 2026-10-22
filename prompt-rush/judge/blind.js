// Build a blind A/B folder from two screenshot sets. Usage: node blind.js <oursDir> <refDir> <outDir> <keyFile>
// Writes A/ and B/ with neutral names, keeps the key outside the judge folder.
const fs = require('fs');
const path = require('path');

const [ours, ref, out, keyFile] = process.argv.slice(2);
const oursIsA = Math.random() < 0.5;
fs.rmSync(out, { recursive: true, force: true });
for (const [label, src] of [['A', oursIsA ? ours : ref], ['B', oursIsA ? ref : ours]]) {
  fs.mkdirSync(path.join(out, label), { recursive: true });
  for (const f of fs.readdirSync(src).filter(f => f.endsWith('.png'))) {
    fs.copyFileSync(path.join(src, f), path.join(out, label, f));
  }
}
fs.writeFileSync(keyFile, JSON.stringify({ ours: oursIsA ? 'A' : 'B' }));
console.log('blind set ready');
