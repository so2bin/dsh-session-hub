#!/usr/bin/env node
/**
 * Repository self-check: manifest wiring, JavaScript syntax, locale metadata,
 * runtime dictionary parity, and that every translation key the view reads is
 * present in both dictionaries.
 *
 * Dependency-free on purpose: the bundle has no build step.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const read = (file) => readFileSync(join(root, file), 'utf8');
const check = (condition, message) => {
  if (!condition) problems.push(message);
};

for (const file of ['client.js', 'index.js']) {
  try {
    execFileSync(process.execPath, ['--check', join(root, file)], { stdio: 'pipe' });
  } catch (error) {
    problems.push(`${file} does not parse: ${String(error.stderr ?? error.message).trim()}`);
  }
}

const manifest = JSON.parse(read('package.json'));
check(manifest.name === 'dsh-session-hub', 'package.json name must be dsh-session-hub');
check(manifest.type === 'module', 'package.json type must be module');
check(manifest.license === 'MIT', 'package.json license must be MIT');
check(manifest.dsh?.bundle?.patch === './cordis.patch.yml', 'package.json must declare dsh.bundle.patch');
check(manifest.dsh?.client?.platform === 'web', 'package.json dsh.client.platform must be web');
check(Array.isArray(manifest.dsh?.client?.inject) && manifest.dsh.client.inject.length > 0, 'package.json dsh.client.inject must list load-order packages');

const requiredFiles = ['client.js', 'cordis.patch.yml', 'icon.svg', 'index.js', 'locale/en.json', 'locale/zh.json', 'scripts/check.mjs'];
for (const file of requiredFiles) {
  try {
    statSync(join(root, file));
  } catch {
    problems.push(`missing file: ${file}`);
  }
}
try {
  const iconBytes = statSync(join(root, 'icon.svg')).size;
  check(iconBytes > 0 && iconBytes <= 256 * 1024, 'icon.svg must be non-empty and at most 256 KiB');
} catch {
  /* already reported above */
}

const patch = read('cordis.patch.yml');
check(/id:\s*session-hub/.test(patch), 'cordis.patch.yml must insert the session-hub row');
check(/name:\s*dsh-session-hub/.test(patch), 'cordis.patch.yml must reference the dsh-session-hub package');

for (const locale of ['en', 'zh']) {
  const meta = JSON.parse(read(`locale/${locale}.json`));
  check(typeof meta.meta?.title === 'string' && meta.meta.title.length > 0, `locale/${locale}.json needs meta.title`);
  check(typeof meta.meta?.description === 'string' && meta.meta.description.length > 0, `locale/${locale}.json needs meta.description`);
}

function extractObject(source, name) {
  const marker = `const ${name} = {`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`missing dictionary ${name}`);
  const begin = source.indexOf('{', start);
  let depth = 0;
  for (let index = begin; index < source.length; index += 1) {
    const character = source[index];
    if (character === '{') depth += 1;
    if (character !== '}') continue;
    depth -= 1;
    if (depth !== 0) continue;
    return new Function(`return (${source.slice(begin, index + 1)});`)();
  }
  throw new Error(`unterminated dictionary ${name}`);
}

const client = read('client.js');
const en = extractObject(client, 'EN');
const zh = extractObject(client, 'ZH');
const enKeys = Object.keys(en).sort();
const zhKeys = Object.keys(zh).sort();
check(JSON.stringify(enKeys) === JSON.stringify(zhKeys), `dictionary keys differ:\nen=${enKeys.join(',')}\nzh=${zhKeys.join(',')}`);

const used = new Set([...client.matchAll(/\btranslate\('([A-Za-z0-9_]+)'/g)].map((match) => match[1]));
// Keys selected by a runtime branch instead of a literal call.
for (const key of ['statusRunning', 'statusDone']) used.add(key);
for (const key of used) {
  check(key in en, `missing en translation: ${key}`);
  check(key in zh, `missing zh translation: ${key}`);
}

if (problems.length > 0) {
  console.error('dsh-session-hub check failed:');
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exitCode = 1;
} else {
  console.log(`dsh-session-hub check ok: ${used.size} translation keys, ${enKeys.length} dictionary entries, manifest and patch wired`);
}
