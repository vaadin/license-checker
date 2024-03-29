'use strict';

const gulp = require('gulp');
const path = require('path');
const fs = require('fs-extra');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

async function rebuild() {
  await fs.remove(path.join(__dirname, 'vaadin-license-checker.html'));

  const template = await fs.readFile(
    path.join(__dirname, 'src/vaadin-license-checker.tpl.html'), 'utf-8');

  await exec('npm run transpile');
  const bundle = await fs.readFile(
    path.join(__dirname, 'vaadin-license-checker.es5.js'), 'utf-8');

  // Remove tree-shaking comments added by Rollup
  const js = bundle.replace(/(\/\*#__PURE__\*\/)/g, '');

  await fs.outputFile(
    path.join(__dirname, 'vaadin-license-checker.html'),
    '<!-- This file is autogenerated from src/vaadin-license-checker.tpl.html -->\n' +
    template.replace('${vaadin-license-checker.js}', js));

  await fs.remove(path.join(__dirname, 'vaadin-license-checker.es5.js'));
}

// Check if any dependency of 'vaadin-license-checker.html' is staged for commit,
// and if yes, rebuild 'vaadin-license-checker.html' and add it to the commit
// as well.
gulp.task('auto-amend-commit', async() => {
  const deps = [
    'src/vaadin-license-checker.js',
    'src/vaadin-license-checker.tpl.html',
  ];

  const rc = await exec('git diff --name-only --cached');
  const depsStaged = rc.stdout.split('\n').some(file => deps.includes(file));
  if (depsStaged) {
    await rebuild();
    await exec('git add vaadin-license-checker.html');
  }
});

gulp.task('rebuild', async() => {
  await rebuild();
});
