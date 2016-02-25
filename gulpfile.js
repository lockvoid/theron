'use strict';

const autoprefixer = require('autoprefixer');
const cprocess = require('child_process');
const del = require('del');
const dotenv = require('dotenv');
const gulp = require('gulp');
const jspm = require('jspm');
const precss = require('precss')
const typescript = require('typescript');
const babel = require('gulp-babel');
const cssnano = require('gulp-cssnano');
const postcss = require('gulp-postcss');
const preprocess = require('gulp-preprocess');
const replace = require('gulp-rev-replace');
const rev = require('gulp-rev');
const sourcemaps = require('gulp-sourcemaps');
const ts = require('gulp-typescript');

dotenv.config({ silent: true });

const buildTasks = gulp.parallel(buildServer, buildClient, buildCss, copyAssets);

const watchTasks = gulp.parallel(watchServer, watchClient, watchCss, watchAssets);

gulp.task('default', gulp.series(clean, buildTasks, startHttp, watchTasks));

function clean() {
  return del('dist');
}

// Listen

var httpProcess = null;

function startHttp(done) {
  if (!httpProcess) {
    httpProcess = cprocess.spawn('node', ['--harmony_destructuring', '--harmony_default_parameters', '--harmony_rest_parameters', 'bin/web'], { stdio: 'inherit' });
  }

  done();
}

function closeHttp(done) {
  httpProcess && httpProcess.kill();
  httpProcess = null;

  done();
}

// Server

const serverProject = ts.createProject('app/server/tsconfig.json', { typescript: typescript });

function buildServer() {
  const source = ['{app/server,lib,db}/**/*.{ts,tsx}', 'typings/main.d.ts'];
  const result = gulp.src(source).pipe(sourcemaps.init()).pipe(preprocess({ context: { NODE: true }, includeBase: __dirname })).pipe(ts(serverProject));

  return result.js.pipe(sourcemaps.write()).pipe(gulp.dest('dist/server'));
}

function watchServer() {
  gulp.watch('{app/server,lib,db}/**/*.{ts,tsx}', gulp.series(gulp.parallel(buildServer, closeHttp), startHttp));
}

// Client

const clientProject = ts.createProject('app/client/tsconfig.json', { typescript: typescript });

function buildClient() {
  const source = ['{app/client,lib}/**/*.{ts,tsx}', 'typings/browser.d.ts'];
  const result = gulp.src(source).pipe(sourcemaps.init()).pipe(preprocess({ includeBase: __dirname })).pipe(ts(clientProject));

  return result.js.pipe(babel({ presets: ['es2015'] })).pipe(sourcemaps.write()).pipe(gulp.dest('dist/client'));
}

function watchClient() {
  gulp.watch('{app/client,lib}/**/*.{ts,tsx}', buildClient);
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
