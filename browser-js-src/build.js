var fs = require('fs')
var path = require('path')

var browserify = require('browserify')

const modules = ['subtopic-cms', 'course-management-cms']

modules.forEach(module => {
  console.log(`Building module: ${module}...`)
  console.time(module)
  browserify(path.join(__dirname, module, 'main.js'), {cache: {}, packageCache: {}})
  .transform({global: true}, 'browserify-shim')
  .transform('babelify', {presets: ['es2015']})
  .transform('uglifyify', {global: true})
  .bundle()
  .on('error', err => console.error(err.message))
  .pipe(fs.createWriteStream(path.join(__dirname, `../cms/view/assets/js/${module}-bundle.js`)))
  .on('finish', () => {
    console.log('Success!')
    console.timeEnd(module)
  })
})
