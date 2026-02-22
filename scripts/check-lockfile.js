const fs = require('fs');
const path = require('path');

const pkgPath = path.resolve(__dirname, '..', 'package.json');
const lockPath = path.resolve(__dirname, '..', 'package-lock.json');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));

const pkgDeps = pkg.dependencies || {};
const lockDeps = (lock.packages && lock.packages[''] && lock.packages[''].dependencies) || {};

const missingInLock = Object.keys(pkgDeps).filter((dep) => !Object.prototype.hasOwnProperty.call(lockDeps, dep));
const extraInLock = Object.keys(lockDeps).filter((dep) => !Object.prototype.hasOwnProperty.call(pkgDeps, dep));

if (missingInLock.length || extraInLock.length) {
  console.error('Lockfile consistency check failed.');
  if (missingInLock.length) console.error('Missing in lockfile:', missingInLock.join(', '));
  if (extraInLock.length) console.error('Extra in lockfile:', extraInLock.join(', '));
  process.exit(1);
}

console.log('Lockfile consistency check passed.');
