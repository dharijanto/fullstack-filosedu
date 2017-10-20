const path = require('path')
const log = require('npmlog')
const moment = require('moment')
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

    this.routeGet('/getSubjects', (req, res, next) => {
      res.json({
        status: true,
        data: [
          {'id': 3, subject: 'Hello', description: 'My Chonny!', lastModified: moment().format()},
          {'id': 3, subject: 'World', description: 'My Hello!', lastModified: moment().format()}
        ]
      })
    })

    this.routeGet('/getTopics', (req, res, next) => {
      const subjectId = req.query.subject
      res.json({
        status: true,
        data: [
          {subjectId, id: 1, topic: `Topic for ${subjectId}`, description: `This data is generated because ${subjectId} was clicked`, lastModified: moment().format()}
        ]
      })
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
