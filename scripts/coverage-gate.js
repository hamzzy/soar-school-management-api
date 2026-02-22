const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const minLineCoverage = Number(process.env.COVERAGE_MIN_LINES || 40);

if (Number.isNaN(minLineCoverage)) {
  console.error('Invalid COVERAGE_MIN_LINES value.');
  process.exit(1);
}

function collectTestFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTestFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.test.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

const testFiles = collectTestFiles(path.resolve(__dirname, '..', 'tests'));

if (testFiles.length === 0) {
  console.error('Coverage gate failed: no test files found in tests/.');
  process.exit(1);
}

const run = spawnSync(process.execPath, ['--test', '--experimental-test-coverage', ...testFiles], {
  encoding: 'utf8',
});

if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);

if (run.status !== 0) {
  process.exit(run.status || 1);
}

const combinedOutput = `${run.stdout || ''}\n${run.stderr || ''}`;
const match = combinedOutput.match(/all files\s+\|\s*([0-9]+(?:\.[0-9]+)?)/i);

if (!match) {
  console.error('Coverage gate failed: unable to parse line coverage from test output.');
  process.exit(1);
}

const lineCoverage = Number(match[1]);

if (lineCoverage < minLineCoverage) {
  console.error(
    `Coverage gate failed: line coverage ${lineCoverage}% is below required ${minLineCoverage}%.`
  );
  process.exit(1);
}

console.log(`Coverage gate passed: line coverage ${lineCoverage}% (required ${minLineCoverage}%).`);
