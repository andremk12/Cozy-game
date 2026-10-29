// Read-only release checks: inspect the shipped archive, never a personal profile.
import assert from 'node:assert/strict';
import { listPackage, extractFile } from '@electron/asar';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const archive = path.join(root, 'outputs/desktop/win-unpacked/resources/app.asar');
const files = listPackage(archive).map((name) => name.replaceAll('\\', '/').replace(/^\//, ''));
const expectedRoots = new Set(['node_modules', 'dist', 'electron', 'shared', 'public', 'package.json']);
assert.ok(files.every((name) => expectedRoots.has(name.split('/')[0])), 'Unexpected archive root.');
assert.deepEqual(files.filter((name) => /(^|\/)(?:\.git|\.env(?:\..*)?|work|tests|scripts|outputs|src|preferences\.json|garden\.json|board\.json|id_rsa)(?:\/|$)/i.test(name)
  || /\.(?:pem|key|pfx|haven-memory)$/i.test(name)), [], 'Private/development file candidate in archive.');

const required = ['dist/index.html', 'electron/main/index.js', 'electron/preload/index.cjs',
  'electron/services/developerContacts.js', 'electron/services/singleInstance.js', 'shared/developer.js',
  'public/assets/icons/haven.png', 'dist/assets/icons/haven.svg',
  'dist/licenses/Audio-CREDITS.txt', 'dist/licenses/Audio-CC0-1.0.txt', 'dist/licenses/Audio-CC-BY-3.0.txt',
  'dist/licenses/DM-Sans-OFL.txt', 'dist/licenses/Fraunces-OFL.txt', 'dist/licenses/Pixelify-Sans-OFL.txt'];
for (const name of required) assert.ok(files.includes(name), `Missing shipped resource: ${name}`);
const sourcePackage = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const shippedPackage = JSON.parse(extractFile(archive, 'package.json').toString('utf8'));
assert.equal(shippedPackage.version, sourcePackage.version);
assert.equal(shippedPackage.main, 'electron/main/index.js');
// Report only filenames if a token signature appears, never the value itself.
const tokenPattern = /(?:^|[\s"'])(?:sk-(?:proj-)?[A-Za-z0-9_-]{32,}|gh[pousr]_[A-Za-z0-9]{30,}|AKIA[A-Z0-9]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/m;
const matches = [];
for (const name of files.filter((name) => !name.startsWith('node_modules/') && /\.(?:js|cjs|html|json|css|txt|md)$/.test(name))) {
  if (tokenPattern.test(extractFile(archive, path.normalize(name)).toString('utf8'))) matches.push(name);
}
assert.deepEqual(matches, [], 'Possible credential signature in shipped application.');
const report = { version: shippedPackage.version, entries: files.length, allowedRoots: [...expectedRoots],
  requiredResources: required, unexpectedFiles: [], credentialSignatureMatches: [],
  limitation: 'Static names/signatures are a bounded check, not a guarantee against every possible secret.' };
await mkdir(path.join(root, 'outputs'), { recursive: true });
await writeFile(path.join(root, 'outputs/package-inspection.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
