'use strict';

const autoprefixer = require('autoprefixer');
const cprocess = require('child_process');
const del = require('del');
const dotenv = require('dotenv');
const fs = require('fs');
const gulp = require('gulp');
const jspm = require('jspm');
const path = require('path')
const precss = require('precss')
const typescript = require('typescript');
const babel = require('gulp-babel');
const browserify = require('gulp-browserify');
const cssnano = require('gulp-cssnano');
const insert = require('gulp-insert');
const postcss = require('gulp-postcss');
const preprocess = require('gulp-preprocess');
const rename = require('gulp-rename');
const replace = require('gulp-rev-replace');
const rev = require('gulp-rev');
const s3 = require('gulp-s3');
const sourcemaps = require('gulp-sourcemaps');
const ts = require('gulp-typescript');
const uglify = require('gulp-uglify');

dotenv.config({ silent: true });

const buildTasks = gulp.parallel(buildServer, buildClient, buildCss, buildJs, copyAssets);

const watchTasks = gulp.parallel(watchServer, watchClient, watchCss, watchJs, watchAssets);

gulp.task('build.npm.driver', gulp.series(packageBrowserDriver, packageNodeDriver, copyPackageMeta));

gulp.task('build.cdn.driver', gulp.series(buildBrowserDriver, buildGlobalDriver));

gulp.task('publish.cdn.driver', publishDriverToCDN);

gulp.task('publish.npm.driver', publishDriverToNPM);

gulp.task('default', gulp.series(clean, buildTasks, gulp.parallel(startServer, startWorker, startDiffer), gulp.parallel(watchTasks, watchStart)));

gulp.task('compile', gulp.series(clean, buildTasks, gulp.parallel(watchTasks)));

gulp.task('release', gulp.series(clean, buildTasks, gulp.parallel(bundleClient, 'build.npm.driver', 'build.cdn.driver', minifyCss, minifyJs), revPublic, repPublic));

function packageMeta() {
  return JSON.parse(fs.readFileSync('./lib/driver/meta/package.json'));
}

function clean() {
  return del('dist');
}

// Start

const HARMONY_FLAGS = [
  '--harmony_default_parameters',
  '--harmony_destructuring',
  '--harmony_modules',
  '--harmony_rest_parameters',
];

var serverProcess = null;
var workerProcess = null;
var differProcess = null;

function startServer(done) {
  serverProcess = cprocess.spawn('node', HARMONY_FLAGS.concat(['bin/server']), { stdio: 'inherit' });
  done();
}

function killServer(done) {
  if (!serverProcess) {
    return done();
  }

  serverProcess.once('close', done);
  serverProcess.kill();
  serverProcess = null;
}

function startWorker(done) {
  workerProcess = cprocess.spawn('node', HARMONY_FLAGS.concat(['bin/worker']), { stdio: 'inherit' });
  done();
}

function killWorker(done) {
  if (!workerProcess) {
    return done();
  }

  workerProcess.once('close', done);
  workerProcess.kill();
  workerProcess = null;
}

function startDiffer(done) {
  differProcess = cprocess.spawn('node', HARMONY_FLAGS.concat(['bin/differ']), { stdio: 'inherit' });
  done();
}

function killDiffer(done) {
  if (!differProcess) {
    return done();
  }

  differProcess.once('close', done);
  differProcess.kill();
  differProcess = null;
}

function watchStart() {
  gulp.watch('dist/server/**/*', gulp.series(gulp.parallel(killServer, killWorker, killDiffer), gulp.parallel(startServer, startWorker, startDiffer)));
}

const serverProject = ts.createProject('app/server/tsconfig.json', { typescript: typescript });
const clientProject = ts.createProject('app/client/tsconfig.json', { typescript: typescript });

// Server

function buildServer() {
  const source = ['{app/server,lib,db}/**/*.{ts,tsx}', 'typings/main.d.ts'];
  const result = gulp.src(source).pipe(sourcemaps.init()).pipe(preprocess({ context: { NODE_BUILD: true }, includeBase: __dirname })).pipe(ts(serverProject));

  return result.js.pipe(babel({ plugins: ['transform-es2015-parameters'] })).pipe(sourcemaps.write()).pipe(gulp.dest('dist/server'));
}

function watchServer() {
  gulp.watch('{app/server,lib,db}/**/*.{ts,tsx}', gulp.series(gulp.parallel(killServer, killWorker, killDiffer), buildServer));
}

// Client

function buildClient() {
  // Exclude non-isomorphic files until gulp-typescript#190 isn't resolved

  const source = ['{app/client,lib}/**/*.{ts,tsx}', 'typings/browser.d.ts', '!lib/core/*.ts'];
  const result = gulp.src(source).pipe(sourcemaps.init()).pipe(preprocess({ includeBase: __dirname })).pipe(ts(clientProject));

  return result.js.pipe(babel({ presets: ['es2015'] })).pipe(sourcemaps.write()).pipe(gulp.dest('dist/client'));
}

function watchClient() {
  gulp.watch('{app/client,lib}/**/*.{ts,tsx}', buildClient);
}

function bundleClient() {
  return jspm.bundleSFX('babel-polyfill + dist/client/app/client/client', 'dist/public/app.js', { minify: true, sourceMaps: true});
}

// Public

function buildCss() {
  const manifests = ['public/css/**/*.css', '!public/css/**/_*.css'];

  return gulp.src(manifests).pipe(sourcemaps.init()).pipe(postcss([precss, autoprefixer])).pipe(sourcemaps.write()).pipe(gulp.dest('dist/public'));
}

function minifyCss() {
  return gulp.src('dist/public/**/*.css').pipe(sourcemaps.init()).pipe(cssnano()).pipe(sourcemaps.write('.')).pipe(gulp.dest('dist/public'));
}

function watchCss() {
  gulp.watch('public/css/**/*.css', buildCss);
}

function buildJs() {
  return gulp.src('public/js/**/*.js').pipe(sourcemaps.init()).pipe(babel({ presets: ['es2015'] })).pipe(sourcemaps.write()).pipe(gulp.dest('dist/public'));
}

function minifyJs() {
  return gulp.src('dist/public/**/*.js').pipe(uglify()).pipe(gulp.dest('dist/public'));
}

function watchJs() {
  gulp.watch('public/js/**/*.js', buildJs);
}

function copyAssets() {
  return gulp.src('public/{images,fonts}/**/*.{jpg,woff}').pipe(gulp.dest('dist/public'));
}

function watchAssets() {
  gulp.watch('public/{images,fonts}/**/*.{jpg,woff}', copyAssets);
}

function revPublic() {
  return gulp.src('dist/public/**').pipe(rev()).pipe(gulp.dest('dist/public')).pipe(rev.manifest({ path: 'manifest.json' })).pipe(gulp.dest('dist/public'));
}

function repPublic() {
  return gulp.src('dist/public/**/*.css').pipe(replace({ manifest: gulp.src('dist/public/manifest.json') })).pipe(gulp.dest('dist/public'))
}

// Driver

const packageBuilder = new jspm.Builder();

packageBuilder.config({
  packages: {
    'rxjs': {
      defaultExtension: 'js',
    }
  },

  paths: {
    '*': '*.js',
  },

  meta: {
    'rxjs/*': {
      build: false,
    },

    'immutable': {
      build: false,
    },

    'node-fetch': {
      build: false,
    },

    'ws': {
      build: false,
    }
  },
});

function packageBrowserDriver() {
  return packageBuilder.buildStatic('dist/client/lib/driver/theron', `dist/driver/npm/lib/theron.js`, { minify: true, format: 'cjs' });
}

function packageNodeDriver() {
  return packageBuilder.buildStatic('dist/server/lib/driver/theron', `dist/driver/npm/lib/theron-node.js`, { minify: true, format: 'cjs' });
}

function copyPackageMeta() {
  return gulp.src(`lib/driver/meta/**/*`).pipe(gulp.dest(`dist/driver/npm`))
}

function buildBrowserDriver() {
  const version = packageMeta()['version'];

  return jspm.bundleSFX(`dist/client/lib/driver/theron`, `dist/driver/cdn/${version}/theron.js`, { minify: true, format: 'cjs' });
}

function buildGlobalDriver() {
  const version = packageMeta()['version'];

  const unwrapper = `
    (function() {
      var assign = Object.assign || function (target) {
        for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } }
      }

      assign(window, Theron);
    }());
  `;

  return gulp.src(`dist/driver/cdn/${version}/theron.js`).pipe(browserify({ standalone: 'Theron' })).pipe(insert.append(unwrapper)).pipe(rename('theron.umd.js')).pipe(gulp.dest(`dist/driver/cdn/${version}`));
}

function publishDriverToNPM(done) {
  process.chdir('dist/driver/npm'); cprocess.spawn('npm', ['publish'], { stdio: 'inherit' }).on('close', done);
}

function publishDriverToCDN() {
  const credentials = { key: process.env.S3_PUBLIC_KEY, secret: process.env.S3_SECRET_KEY, bucket: process.env.S3_BUCKET, region: process.env.S3_REGION };

  return gulp.src('./dist/driver/cdn/**').pipe(rename(source => source.dirname = path.join('bundles', source.dirname))).pipe(s3(credentials));
}
