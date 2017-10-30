var fs = require('fs')
var path = require('path')

var browserify = require('browserify')
var watchify = require('watchify')

const modules = ['subtopic-cms', 'course-management-cms']

modules.forEach(module => {
  console.log(`Watching module: ${module}...`)
  const b = watchify(browserify(path.join(__dirname, module, 'main.js'), {cache: {}, packageCache: {}})
    .transform({global: true}, 'browserify-shim')
    .transform('babelify', {presets: ['es2015']})
    .transform('uglifyify', {global: true}))
    // .plugin(watchify)
  b.on('update', () => bundle(b, module))
  b.on('error', err => console.error(err.message))
  // b.on('log', msg => console.log(msg))

  bundle(b, module)
})

function bundle (b, module) {
  console.log(`Bundling module: ${module}...`)
  console.time(module)
  b.bundle()
  .on('error', err => console.error(err.message))
  .pipe(fs.createWriteStream(path.join(__dirname, `../cms/view/assets/js/${module}-bundle.js`)))
  .on('finish', () => {
    console.log('success!')
    console.timeEnd(module)
  })
}
