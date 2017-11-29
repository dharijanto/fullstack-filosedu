const path = require('path')

const log = require('npmlog')

const BaseController = require(path.join(__dirname, 'controllers/base-controller'))
const CourseManagementController = require(path.join(__dirname, 'controllers/course-management-controller'))
const SubtopicController = require(path.join(__dirname, 'controllers/subtopic-controller'))

class MainController extends BaseController {
  constructor (initData) {
    initData.logTag = 'FiloseduCMSController'
    super(initData)

    this.addInterceptor((req, res, next) => {
      log.verbose(this.getTag(), 'req.path=' + req.path)
      next()
    })

    this.routeHashlessUse((new CourseManagementController(initData)).getRouter())
    this.routeHashlessUse((new SubtopicController(initData)).getRouter())
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

module.exports = MainController
