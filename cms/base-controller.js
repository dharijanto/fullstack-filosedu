const express = require('express')
const path = require('path')
const log = require('npmlog')

class BaseController {
  constructor ({site, user, socketIO, db, logTag}) {
    this._siteHash = site.hash
    // Since the path is prefixed with /:hash/, we don't wanna handle it manually everytime, hence we use two routers
    this._logTag = logTag
    this._router = express()
    this._subRouter = express()
    this._router.use(`/${this._siteHash}`, this._subRouter)
    this._subRouter.use(express.static(path.join(__dirname, 'view')))

    this._subRouter.locals.rootifyPath = this.rootifyPath.bind(this)

    this._subRouter.use((req, res, next) => {
      log.verbose(this.getTag(), 'req.path=' + req.path)
      log.verbose(this.getTag(), 'site.id=' + site.id)
      next()
    })
    this._subRouter.set('views', path.join(__dirname, 'view'))
    this._subRouter.set('view engine', 'pug')
    this._interceptors = []
  }

  // Since we're using /:hash/path, we have to prepend :hash
  // as the root of the path, when referring to an asset
  rootifyPath (filename) {
    return `/${this._siteHash}/${filename}`
  }

  getRouter () {
    return this._router
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
    this._subRouter.get(this.getMountPath(path), this._extendInterceptors(fns))
  }

  routePost (path, ...fns) {
    this._subRouter.post(this.getMountPath(path), this._extendInterceptors(fns))
  }

  routeUse (...fns) {
    this._subRouter.use(this.getMountPath(''), this._extendInterceptors(fns))
  }

  // Nusantara-cloud hosting is of format:
  // [username].nusantara-cloud.com/[sitename]
  // Mount path is to acommodate [sitename]
  getMountPath (strPath) {
    // return path.join('/:hash', strPath || '')
    return strPath || ''
    // return path.join('/')
  }

  getTag () {
    return this._logTag
  }

  getSidebar () {
    throw new Error('Not implemented')
  }
}

module.exports = BaseController
