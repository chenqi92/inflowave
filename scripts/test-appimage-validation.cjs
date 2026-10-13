const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { validateAppDir } = require('./validate-appimage.cjs');

function fixture(t) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'inflowave-appdir-test-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const appDir = path.join(temp, 'InfloWave.AppDir');
  fs.mkdirSync(path.join(appDir, 'usr/share/applications'), { recursive: true });
  fs.writeFileSync(path.join(appDir, 'AppRun'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
  fs.copyFileSync(path.join(__dirname, '../src-tauri/icons/256x256.png'), path.join(appDir, 'InfloWave.png'));
  fs.writeFileSync(path.join(appDir, 'usr/share/applications/InfloWave.desktop'),
    '[Desktop Entry]\nType=Application\nName=InfloWave\nExec=InfloWave\nIcon=InfloWave\n');
  fs.symlinkSync('InfloWave.png', path.join(appDir, '.DirIcon'));
  fs.symlinkSync('usr/share/applications/InfloWave.desktop', path.join(appDir, 'InfloWave.desktop'));
  return appDir;
}

test('relative metadata links still work after moving the AppDir', t => {
  const appDir = fixture(t);
  const moved = path.join(path.dirname(appDir), 'moved with spaces.AppDir');
  fs.renameSync(appDir, moved);
  assert.doesNotThrow(() => validateAppDir(moved));
});

for (const name of ['.DirIcon', 'InfloWave.desktop']) {
  test(`rejects build-machine absolute links for ${name} even while the target exists`, t => {
    const appDir = fixture(t);
    const link = path.join(appDir, name);
    const target = fs.realpathSync(link);
    fs.unlinkSync(link);
    fs.symlinkSync(target, link);
    assert.throws(() => validateAppDir(appDir), /absolute symlink/);
  });
  test(`rejects missing ${name}`, t => {
    const appDir = fixture(t);
    fs.unlinkSync(path.join(appDir, name));
    assert.throws(() => validateAppDir(appDir));
  });
}

test('rejects a dangling icon link', t => {
  const appDir = fixture(t);
  fs.unlinkSync(path.join(appDir, 'InfloWave.png'));
  assert.throws(() => validateAppDir(appDir), /ENOENT/);
});

test('rejects relative links escaping the AppDir', t => {
  const appDir = fixture(t);
  fs.copyFileSync(path.join(appDir, 'InfloWave.png'), path.join(appDir, '../outside.png'));
  fs.unlinkSync(path.join(appDir, '.DirIcon'));
  fs.symlinkSync('../outside.png', path.join(appDir, '.DirIcon'));
  assert.throws(() => validateAppDir(appDir), /inside the AppDir/);
});

test('rejects an invalid PNG icon', t => {
  const appDir = fixture(t);
  fs.writeFileSync(path.join(appDir, 'InfloWave.png'), 'not a PNG');
  assert.throws(() => validateAppDir(appDir), /PNG/);
});

test('rejects multiple desktop files', t => {
  const appDir = fixture(t);
  fs.copyFileSync(path.join(appDir, 'InfloWave.desktop'), path.join(appDir, 'extra.desktop'));
  assert.throws(() => validateAppDir(appDir), /exactly one/);
});

test('rejects a desktop icon that does not match a root icon', t => {
  const appDir = fixture(t);
  const desktop = path.join(appDir, 'InfloWave.desktop');
  fs.writeFileSync(desktop, fs.readFileSync(desktop, 'utf8').replace('Icon=InfloWave', 'Icon=Other'));
  assert.throws(() => validateAppDir(appDir), /icon Other is missing/);
});

test('accepts a regular PNG .DirIcon', t => {
  const appDir = fixture(t);
  fs.unlinkSync(path.join(appDir, '.DirIcon'));
  fs.copyFileSync(path.join(appDir, 'InfloWave.png'), path.join(appDir, '.DirIcon'));
  assert.doesNotThrow(() => validateAppDir(appDir));
});
