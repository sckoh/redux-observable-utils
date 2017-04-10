const gulp = require('gulp');
const del = require('del');
const babel = require('gulp-babel');
const eslint = require('gulp-eslint');
const sourcemaps = require('gulp-sourcemaps');

const distFile = './dist';

function cleanDist(done) {
  del([distFile]).then(() => done());
}

gulp.task('lint', () =>
  gulp
    .src(['./src/**/*.js', './tests/**/*.js'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failOnError()));

// Remove the built files
gulp.task('clean', cleanDist);

gulp.task('build', ['clean', 'lint'], () =>
  gulp
    .src('./src/**/*.js')
    .pipe(sourcemaps.init())
    .pipe(babel())
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest(distFile)));
