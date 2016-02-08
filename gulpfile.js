'use strict';

const autoprefixer = require('autoprefixer');
const cprocess = require('child_process');
const del = require('del');
const dotenv = require('dotenv');
const gulp = require('gulp');
const jspm = require('jspm');
const precss = require('precss')
const cssnano = require('gulp-cssnano');
const postcss = require('gulp-postcss');
const preprocess = require('gulp-preprocess');
const replace = require('gulp-rev-replace');
const rev = require('gulp-rev');
const sourcemaps = require('gulp-sourcemaps');
const ts = require('gulp-typescript');
const typescript = require('typescript');

dotenv.config({ silent: true });

const buildTasks = gulp.parallel(buildServer, buildSocket, buildClient, buildDriver, buildCss, copyAssets);

const watchTasks = gulp.parallel(watchServer, watchSocket, watchClient, watchDriver, watchCss, watchAssets);

gulp.task('default', gulp.series(clean, buildTasks, startHttp, watchTasks));

function clean() {
  return del('dist');
}

// Listen

var httpProcess = null;

function startHttp(done) {
  httpProcess = cprocess.spawn('node', ['bin/web'], { stdio: 'inherit' });
  done();
}

function closeHttp(done) {
  httpProcess && httpProcess.kill();
  done();
}

// Server

const serverProject = ts.createProject('app/server/tsconfig.json', { typescript: typescript });

function buildServer() {
  const source = ['{app/server,lib}/**/*.{ts,tsx}', 'typings/main.d.ts'];
  const result = gulp.src(source).pipe(sourcemaps.init()).pipe(preprocess({ context: { SERVER: true }, includeBase: __dirname })).pipe(ts(serverProject));

  return result.js.pipe(sourcemaps.write()).pipe(gulp.dest('dist/server'));
}

function watchServer() {
  gulp.watch('{app/server,lib}/**/*.{ts,tsx}', gulp.series(gulp.parallel(buildServer, closeHttp), startHttp));
}

// Socket

const socketProject = ts.createProject('app/socket/tsconfig.json', { typescript: typescript });

function buildSocket() {
  const source = ['{app/socket,lib}/**/*.{ts,tsx}', 'typings/main.d.ts'];
  const result = gulp.src(source).pipe(sourcemaps.init()).pipe(preprocess({ context: { SOCKET: true }, includeBase: __dirname })).pipe(ts(socketProject));

  return result.js.pipe(sourcemaps.write()).pipe(gulp.dest('dist/socket'));
}

function watchSocket() {
  gulp.watch('{app/socket,lib}/**/*.{ts,tsx}', gulp.series(gulp.parallel(buildSocket, closeHttp), startHttp));
}

// Client

const clientProject = ts.createProject('app/client/tsconfig.json', { typescript: typescript });

function buildClient() {
  const source = ['{app/client,lib}/**/*.{ts,tsx}', 'node_modules/typescript/lib/lib.es6.d.ts', 'typings/browser.d.ts'];
  const result = gulp.src(source).pipe(sourcemaps.init()).pipe(preprocess({ context: { CLIENT: true }, includeBase: __dirname })).pipe(ts(clientProject));

  return result.js.pipe(sourcemaps.write()).pipe(gulp.dest('dist/client'));
}

function watchClient() {
  gulp.watch('{app/client,lib}/**/*.{ts,tsx}', buildClient);
}

// Driver

const driverProject = ts.createProject('app/client/tsconfig.json', { typescript: typescript });

function buildDriver() {
  const source = ['{app/driver,lib,test/playground}/**/*.{ts,tsx}', 'node_modules/typescript/lib/lib.es6.d.ts', 'typings/browser.d.ts'];
  const result = gulp.src(source).pipe(sourcemaps.init()).pipe(preprocess({ context: { DRIVER: true }, includeBase: __dirname })).pipe(ts(driverProject));

  return result.js.pipe(sourcemaps.write()).pipe(gulp.dest('dist/driver'));
}

function watchDriver() {
  gulp.watch('{app/driver,lib,test/playground}/**/*.{ts,tsx}', buildDriver);
}

// Public

function buildCss() {
  const manifests = ['public/css/**/*.css', '!public/css/**/_*.css'];

  return gulp.src(manifests).pipe(sourcemaps.init()).pipe(postcss([precss, autoprefixer])).pipe(sourcemaps.write()).pipe(gulp.dest('dist/public'));
}

function watchCss() {
  gulp.watch('public/css/**/*.css', buildCss);
}

function copyAssets() {
  return gulp.src('public/{images,fonts}/**/*.{jpg,woff}').pipe(gulp.dest('dist/public'));
}

function watchAssets() {
  gulp.watch('public/{images,fonts}/**/*.{jpg,woff}', copyAssets);
}
