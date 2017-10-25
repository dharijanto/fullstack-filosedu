var fs = require('fs')
var browserify = require('browserify')
var watchify = require('watchify')

const b = browserify('./subtopic-cms/main.js', {cache: {}, packageCache: {}})
  .transform({global: true}, 'browserify-shim')
  .transform('babelify', {presets: ['es2015']})
  .transform('uglifyify', {global: true})
  .plugin(watchify)
  .on('update', bundle)

function bundle () {
  console.time('bundle-compile')
  b.bundle()
  .on('error', err => console.error(err))
  .pipe(fs.createWriteStream('../cms/view/assets/js/subtopic-cms-bundle.js'))
  console.timeEnd('bundle-compile')
}

// When the command is frist run, execute bundle
bundle()
