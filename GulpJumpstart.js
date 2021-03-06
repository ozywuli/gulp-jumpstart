const path = require('path')

const autoprefixer = require('autoprefixer');
const babelify = require('babelify')
const babel = require('gulp-babel');
const browserify = require('browserify');
const browsersync = require('browser-sync').create();
const buffer = require('vinyl-buffer');
const notifier = require('node-notifier');
const postcss = require('gulp-postcss');
const rename = require('gulp-rename');
const rimraf = require('rimraf');
const sass = require('gulp-sass');
const source = require('vinyl-source-stream');
const sourcemaps = require('gulp-sourcemaps');
const uglify = require('gulp-uglify');
const util = require('gulp-util');

/**
 * Constructor
 *
 */
function GulpJumpstart(gulp, userOptions) {

    /**
     * Default options
     * @desc Default plugin options
     * @access Private
     */
    let defaultOptions = {
        pluginName: 'Plugin',
        standalone: undefined,
        includePaths: undefined
    };

    // Merge/overwrite default options with user options
    let options = Object.assign(defaultOptions, userOptions);

    // Included paths
    let includePaths = ['.', 'node_modules'];

    // Standalone state;
    let standalone;

    // Concat additional paths for compilation
    if (options.includePaths) {
        includePaths = includePaths.concat(options.includePaths);
    }

    // If options.standalone isn't set, then set it to be equal to the options.pluginName
    if (options.standalone) {
        standalone = options.standalone;
    } else {
        standalone = options.pluginName;
    }

    gulp.task('clean', (cb) => {
        return rimraf('./dist', cb);
    });

    gulp.task('build', gulp.series('clean', gulp.parallel(buildSCSS, buildJS)));

    /**
     * Show error
     * @desc Show error message
     * @access Private
     */
    function showError(arg) {
        notifier.notify({
            title: 'Error',
            message: '' + arg,
            sound: 'Basso'
        })
        console.log(arg)
        this.emit('end');
    };

    function buildSCSS() {
        return gulp.src(path.join('examples', 'assets', 'styles.scss'))
            .pipe(sass({
                outputStyle: 'nested',
                precision: 10,
                includePaths: includePaths,
                onError: showError
            }).on('error', function(error) {
                showError(error);
                this.emit('end');
            }))
            .pipe(postcss([
                autoprefixer({
                    browsers: ['last 2 versions', 'Firefox ESR', 'Explorer >= 9', 'Android >= 4.0', '> 2%']
                })
            ]))
            .pipe(gulp.dest(path.join('examples', 'assets')))
            .pipe(browsersync.stream({match: '**/*.css'}))
    }

    function buildJS() {
        return browserify({
            entries: path.join('src', `${options.pluginName}.js`),
            debug: false,
            standalone: standalone
        })
            .bundle().on('error', showError)
            .pipe(source(`${options.pluginName}.js`))
            .pipe(buffer())
            .pipe(gulp.dest('dist'))
            .pipe(rename(`${options.pluginName}.min.js`))
            .pipe(sourcemaps.init({
                loadMaps: true
            }))
            .pipe(babel())
            .pipe(uglify()).on('error', showError)
            .pipe(sourcemaps.write('./'))
            .pipe(gulp.dest('dist'))
            .pipe(browsersync.stream({match: path.join('**','*.js')}))
    }

    function watch(done) {
        browsersync.init({
            open: false,
            notify: false,
            port: 9000,
            server: {
                baseDir: [
                    path.join('tests'),
                    path.join('examples', 'tests'),
                    path.join('examples', 'pages'),
                    path.join('examples', 'assets'),
                    'dist'
                ],
                directory: true
            }
        })
        gulp.watch(
            path.join('src', '*.js'),
            gulp.series(buildJS)
        );
        gulp.watch(
            path.join('examples', 'assets', '*.scss'),
            gulp.series(buildSCSS)
        );
        gulp.watch(
            path.join('examples', 'pages', '*.html'),
            browsersync.reload
        );

        done();
    }

    gulp.task('default', gulp.series('build', watch));
}

module.exports = GulpJumpstart;