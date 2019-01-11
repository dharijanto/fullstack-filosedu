var fs = require('fs')
var path = require('path')

var browserify = require('browserify')
var log = require('fancy-log')
var tsify = require('tsify')
var watchify = require('watchify')

const sourceDir = path.join(__dirname, 'src')
const modules = fs.readdirSync(sourceDir).filter(filename => {
  const split = filename.split('-')
  // Valid source folder ends with '-cms' or '-app'
  const validSourceDirName = split[split.length - 1] === 'cms' || split[split.length - 1] === 'app'
  return fs.statSync(path.join(sourceDir,filename)).isDirectory() && validSourceDirName
}).map(dir => {
  const split = dir.split('-')
  if (split.length < 2) {
    throw new Error('Unexpected browser-js-src source directory: ' + dir)
  }
  return {
    input: dir,
    output: split[split.length - 1]
  }
})

modules.forEach(module => {
  const pathToMainJS = path.join(__dirname, 'src', module.input, 'main.js')
  const pathToMainTS = path.join(__dirname, 'src', module.input, 'main.ts')
  let browserifyModule

  // TODO: We should use tsify even for .js compilation. Now though, it won't compile because
  //       of the following error:
  //       node_modules/nc-input-library/index.d.ts(73,79): Error TS2702: 'JQuery' only refers to a type, but is being used as a namespace here.
  // We should fix them when we get the chance!
  if (fs.existsSync(pathToMainTS)) {
    browserifyModule = browserify(
                  [path.join(__dirname, 'src', module.input, 'main.ts'), path.join(__dirname, 'src/index.d.ts')],
                  {cache: {}, packageCache: {}, debug: true})
                // When option 'files: []' passed, only browserify entry point is watched.
                // Otherwise, any changes in any of the .ts file, even unrelated ones, will trigger 'update' events
                .plugin(tsify, {target: 'es6', files: []})
                .transform('babelify', {presets: ['es2015']})
                .transform({global: true}, 'browserify-shim')
                /* .transform('uglifyify', {global: true}) */
                .plugin(watchify)
  } else if (fs.existsSync(pathToMainJS)) {
    browserifyModule = watchify(browserify(pathToMainJS), {cache: {}, packageCache: {}})
              .transform({global: true}, 'browserify-shim')
              .transform('babelify', {presets: ['es2015']})
              // .transform('uglifyify', {global: true})
  } else {
    throw new Error(`Neither main.ts nor main.js is found at ${path.join(__dirname, module.input)}`)
  }
  
  // .plugin(watchify)
  browserifyModule.on('update', () => bundle(browserifyModule, module.input, module.output))
  browserifyModule.on('error', err => log.error(err.message))
  // b.on('log', msg => console.log(msg))

  bundle(browserifyModule, module.input, module.output)
})

function bundle (b, module, outputFolder) {
  log(`Bundling module: ${module}...`)
  b.bundle()
    .on('error', err => console.error(err.message))
    .pipe(fs.createWriteStream(path.join(__dirname, `../dist/${outputFolder}/views/assets/js/${module}-bundle.js`)))
    .on('finish', () => {
      log(`Finished Bundling module: ${module}...`)
    })
}
