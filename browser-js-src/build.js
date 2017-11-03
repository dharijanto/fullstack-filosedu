var fs = require('fs')
var path = require('path')

var browserify = require('browserify')

const modules = [
  {
    input: 'subtopic-cms',
    output: 'cms'
  },
  {
    input: 'course-management-cms',
    output: 'cms'
  },
  {
    input: 'subtopic-app',
    output: 'app'
  }]

modules.forEach(module => {
  console.log(`Building module: ${module.input}...`)
  console.time(module.input)
  browserify(path.join(__dirname, module.input, 'main.js'), {cache: {}, packageCache: {}})
  .transform({global: true}, 'browserify-shim')
  .transform('babelify', {presets: ['es2015']})
  .transform('uglifyify', {global: true})
  .bundle()
  .on('error', err => console.error(err.message))
  .pipe(fs.createWriteStream(path.join(__dirname, `../${module.output}/views/assets/js/${module.input}-bundle.js`)))
  .on('finish', () => {
    console.log('Success!')
    console.timeEnd(module.input)
  })
})
