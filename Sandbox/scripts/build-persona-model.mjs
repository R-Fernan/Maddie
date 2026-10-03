import { randomInt } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const sandboxDirectory = resolve(import.meta.dirname, '..');
const baseModelfile = resolve(sandboxDirectory, 'Modelfile');
const examplesFile = resolve(sandboxDirectory, 'data', 'persona-examples.json');
const generatedModelfile = resolve(sandboxDirectory, '.generated.Modelfile');
const modelName = process.env.MADDIE_MODEL || 'maddie:latest';
const requestedCount = Number(process.env.MADDIE_EXAMPLES || 4);

if (!existsSync(baseModelfile)) {
  throw new Error(`Missing base Modelfile: ${baseModelfile}`);
}

const exampleData = JSON.parse(readFileSync(examplesFile, 'utf8'));
const examples = Array.isArray(exampleData.examples) ? exampleData.examples : [];
const count = Math.min(Math.max(Number.isFinite(requestedCount) ? requestedCount : 4, 1), examples.length);

if (examples.length === 0) {
  throw new Error('No persona examples found. Add examples to data/persona-examples.json.');
}

const available = [...examples];
const selected = available.filter(example => /\bjoke\b/i.test(example.user));

for (const example of selected) {
  available.splice(available.indexOf(example), 1);
}

const targetCount = Math.max(count, selected.length);
while (selected.length < targetCount) {
  selected.push(available.splice(randomInt(available.length), 1)[0]);
}

const fewShotMessages = selected
  .map(example => `MESSAGE user ${JSON.stringify(example.user)}\nMESSAGE assistant ${JSON.stringify(example.assistant)}`)
  .join('\n');

writeFileSync(
  generatedModelfile,
  `${readFileSync(baseModelfile, 'utf8').trim()}\n\n${fewShotMessages}\n`,
  'utf8',
);

const ollamaCommand = process.platform === 'win32' ? 'ollama.exe' : 'ollama';
const result = spawnSync(ollamaCommand, ['create', modelName, '-f', generatedModelfile], {
  cwd: sandboxDirectory,
  stdio: 'inherit',
  shell: false,
});

if (result.error) {
  throw new Error(`Could not run Ollama: ${result.error.message}`);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`Built ${modelName} with ${count} randomly selected persona examples.`);
console.log(`Generated file: ${generatedModelfile}`);
