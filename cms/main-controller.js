const path = require('path')
const log = require('npmlog')
const BaseController = require(path.join(__dirname, 'base-controller'))

class DynamicHostCMSController extends BaseController {
  constructor (initData) {
    initData.logTag = 'DynamicHostCMSController'
    super(initData)

    this.addInterceptor((req, res, next) => {
      res.locals.site = req.site
      res.locals.user = req.user
      next()
    })

    this.routeGet('/', (req, res, next) => {
      res.render('index')
    })
  }

  // View path is under [templateName]/app/view
  getViewPath () {
    return this._viewPath
  }

  getDebug () {
    return this._debug
  }

  getSidebar () {
    return [
      {
        title: 'Course Management',
        url: '/course-management',
        faicon: 'fa-dashboard'
      },
      {
        title: 'Dependency Visualizer',
        url: '/dependency-visualizer',
        faicon: 'fa-bar-chart-o',
        children: [
          {title: 'A', url: '/dependency-visualizer/a'},
          {title: 'B', url: '/dependency-visualizer/b'}]
      }
    ]
  }

  setDebug (debug) {
    this._debug = debug
  }
}

module.exports = DynamicHostCMSController
