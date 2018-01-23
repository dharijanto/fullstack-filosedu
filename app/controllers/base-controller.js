const express = require('express')
const path = require('path')
const fs = require('fs')
const log = require('npmlog')

class BaseController {
  constructor ({site, user, socketIO, db, logTag}) {
    this._router = express()
    this._viewPath = path.join(__dirname, '../views')
    this._db = db
    this.getRouter().set('views', this._viewPath)
    this.getRouter().set('view engine', 'pug')
    this.getRouter().use(express.static(this._viewPath))
    this._interceptors = []
  }

  initialize () {
    this._initializeStaticHostRoute()
    return Promise.resolve()
  }

  getDb () {
    return this._db
  }

  isUpToDate () {
    return Promise.resolve(true)
  }

  getRouter () {
    return this._router
  }

  _fileExists (path) {
    return new Promise((resolve, reject) => {
      fs.access(path, fs.constants.F_OK, err => {
        if (err) {
          resolve(false)
        } else {
          resolve(true)
        }
      })
    })
  }

  _initializeStaticHostRoute () {
    // When the specified path isn't serverable static file, assume it's pug
    this.routeUse((req, res, next) => {
      log.info(this.getTag(), 'req.path=' + req.path)
      const firstSlash = req.path.indexOf('/')
      log.info(this.getTag(), 'firstSlash=' + firstSlash)
      // The path isn't www.domain.com or www.domain.com/, but www.domain.com/heheh
      if (firstSlash !== -1 && firstSlash !== (req.path.length - 1)) {
        const afterSlash = req.path.substring(firstSlash) + '.pug'
        const fullPath = path.resolve(path.join(this._viewPath, afterSlash))
        log.info(this.getTag(), 'PrivateHostController: fullPath=' + fullPath)
        this._fileExists(fullPath).then(exists => {
          if (exists) {
            res.render(fullPath)
          } else {
            // When there is no matching pug template file, forward the request to the next middleware
            next()
          }
        })
      } else { // When no path is given, try to render index.pug
        const indexPug = path.resolve(path.join(this._viewPath, 'index.pug'))
        this._fileExists(indexPug).then(exist => {
          if (exist) {
            res.render(indexPug)
          } else {
            throw new Error()
          }
        }).catch(() => {
          res.status(404).send('Not Found!')
        })
      }
    })
  }

  _extendInterceptors (fns) {
    return this._interceptors.concat(fns)
  }

  // fn: Express route function (i.e. (req, res, next) => ...)
  //     which will be called before any of GET/POST defined in the class is called.
  addInterceptor (fns) {
    // log.verbose(this.getTag(), 'addInterceptor(): this._interceptors.length=' + this._interceptors.length)
    this._interceptors = this._extendInterceptors(fns)
  }

  routeGet (path, ...fns) {
    this._router.get(this.getMountPath(path), this._extendInterceptors(fns))
  }

  routePost (path, ...fns) {
    this._router.post(this.getMountPath(path), this._extendInterceptors(fns))
  }

  routeUse (path, ...fns) {
    this._router.use(this.getMountPath(path), this._extendInterceptors(fns))
  }

  getMountPath (strPath) {
    return strPath || ''
  }

  getTag () {
    return this._logTag
  }
}

module.exports = BaseController
