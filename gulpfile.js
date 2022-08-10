'use strict'

//################################################################################################################
//
//   THEME ESPECIFIC CONSTANTS
//
//################################################################################################################

//===============================================================================================================
// GENERAL INFOS
//===============================================================================================================

//===============================================================================================================
// PATHS
//===============================================================================================================

//--------------------------------------------------------------------------
// Main Paths
//--------------------------------------------------------------------------
const srcPath = 'src/'
const distPath = 'dist/'

//################################################################################################################
//
//   FOLDER/FILE PATHS (Only needed to be updated if folder structure is changed)
//
//################################################################################################################

//===============================================================================================================
// PATHS
//===============================================================================================================

//--------------------------------------------------------------------------
// Tokens
//--------------------------------------------------------------------------
const tokensWatchPath = [
	srcPath + 'assets/tokens/**/*.json', 
	'!' + srcPath + 'assets/tokens/compiled.json'
]

//--------------------------------------------------------------------------
// SCSS
//--------------------------------------------------------------------------
const cssUtilityInputPath = srcPath + 'assets/scss/utility/**/**/*.scss'

//################################################################################################################
//
//   GULP FUNCTIONS (Don't change)
//
//################################################################################################################

//===============================================================================================================
// PLUGINS
//===============================================================================================================

//--------------------------------------------------------------------------
// Main
//--------------------------------------------------------------------------
const gulp = require('gulp')
const series = require('gulp')
const del = require('del')
const mergeJSON = require('gulp-merge-json')
const inject = require('gulp-inject-string')
const dateformat = require('date-format')

//--------------------------------------------------------------------------
// Sass
//--------------------------------------------------------------------------
const sass = require('gulp-sass')(require('sass'))
const autoprefixer = require('gulp-autoprefixer')
const concat = require('gulp-concat')
const cleanCSS = require('gulp-clean-css')
const purgecss = require('gulp-purgecss')
const StyleDictionary = require('style-dictionary')

//===============================================================================================================
// TASKS
//===============================================================================================================

//--------------------------------------------------------------------------
// Get Timestamp
//--------------------------------------------------------------------------
function getTimestamp() {
	return '\/*\n------------------------------------\n \
	Do not edit directly \n Generated: ' +
		dateformat('dd/MM/yyyy hh:mm:ss.SSS', new Date()) +
		'\n------------------------------------\n*/ \n \n';
}

//--------------------------------------------------------------------------
// Delete dist directory
//--------------------------------------------------------------------------
gulp.task("del-dist", () => {
	return del(distPath + '**', { force: true })
})

//--------------------------------------------------------------------------
// Process Tokens
//--------------------------------------------------------------------------
gulp.task('tokens:mergeJSON', () => {
	return gulp.src([srcPath + 'assets/tokens/**/*.json', '!' + srcPath + 'assets/tokens/compiled.json'])
		.pipe(mergeJSON({
			transform: (mergedJson) => {
				return {
					'global': {
						...mergedJson,
					}
				}
			},
			fileName: 'compiled.json'
		}))
		.pipe(gulp.dest(srcPath + 'assets/tokens/'))
})

gulp.task('tokens:proccess', async () => {
	StyleDictionary.registerTransform({
		name: 'utility/name',
		type: 'name',
		transformer: token => {
			const cleanNames = string => string
				.replace('/', '-slash-')
				.replace('.', '-dot-')
				.toLowerCase();
			return cleanNames(token.path.join("-"));
		},
	})
	StyleDictionary.registerTransform({
		name: 'utility/ratio',
		type: 'value',
		matcher: token => {
			return token.attributes.category === 'ratio'
		},
		transformer: token => {
			var ratio = token.value.split("x");
			var width = ratio[0];
			var height = ratio[1];
			return height / width * 100 + "%";
		},
	})
	StyleDictionary.registerTransformGroup({
		name: 'utilities',
		transforms: [
			'attribute/cti',
			'utility/name',
			'utility/ratio',
			'time/seconds',
			'content/icon',
			'color/hex8'
		]
	});
	const utilitiesStyleDictionary = StyleDictionary
		.extend({
			source: [srcPath + "assets/tokens/compiled.json"],
			parsers: [{
				pattern: /\.json$/,
				// Remove JSON wrapper key, if any
				parse: ({ contents }) => {
					let jsonObj = JSON.parse(contents);
					if (Object.keys(jsonObj).length > 0) {
						return jsonObj[Object.keys(jsonObj)[0]];
					} else {
						return contents;
					}
				}
			}],
			platforms: {
				scss: {
					transformGroup: "utilities",
					buildPath: srcPath + "assets/scss/abstracts/",
					files: [{
						destination: "_tokens.scss",
						filter: function (token) {
							if (Object.prototype.toString.call(token.value) != '[object Object]') {
								return token;
							}
						},
						format: "scss/map-deep",
						options: {
							showFileHeader: false,
							outputReferences: true
						}
					}]
				}
			}
		})
	return utilitiesStyleDictionary.buildAllPlatforms()
});

gulp.task("tokens", gulp.series("tokens:mergeJSON", "tokens:proccess"))

//--------------------------------------------------------------------------
// Process CSS, concat and minify
//--------------------------------------------------------------------------

gulp.task('styles:utilities', () => {
	return gulp
		.src(cssUtilityInputPath)
		.pipe(sass().on('error', sass.logError))
		.pipe(autoprefixer({ cascade: false }))
		.pipe(concat('utility.min.css'))
		// .pipe(purgecss({
		// 	content: [srcPath + '**/**/*.php'],
		// 	extractors: [{
		// 		extractor: (content) => {
		// 			// fix for escaped prefixes (sm:, lg:, etc)
		// 			return content.match(/[\w-:./]+(?<!:)/g) || []
		// 		},
		// 		extensions: ['css', 'php'],
		// 	}],
		// }))
		.pipe(cleanCSS())
		.pipe(inject.prepend(getTimestamp()))
		.pipe(gulp.dest(distPath))
})



//--------------------------------------------------------------------------
// Build function
//--------------------------------------------------------------------------
gulp.task("build", gulp.series("del-dist", "tokens", "styles:utilities"))

//--------------------------------------------------------------------------
// Watch function
//--------------------------------------------------------------------------
gulp.task('watch', () => {
	gulp.watch(tokensWatchPath, gulp.series("tokens", "styles:utilities"))
	gulp.watch(cssUtilityInputPath, gulp.series("styles:utilities"))
})

//--------------------------------------------------------------------------
// Default function
//--------------------------------------------------------------------------
gulp.task("default", gulp.series("del-dist", "tokens", "styles:utilities", "watch"))