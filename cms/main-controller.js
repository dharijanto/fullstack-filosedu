const path = require('path')
const log = require('npmlog')
const moment = require('moment')
const BaseController = require(path.join(__dirname, 'base-controller'))

const CourseService = require(path.join(__dirname, '../course-service'))

class DynamicHostCMSController extends BaseController {
  constructor (initData) {
    initData.logTag = 'FiloseduCMSController'
    super(initData)

    this.addInterceptor((req, res, next) => {
      res.locals.site = req.site
      res.locals.user = req.user
      req.courseService = new CourseService(this.getDb().sequelize, this.getDb().models)
      next()
    })

    this.routeGet('/', (req, res, next) => {
      res.render('index')
    })

    this.routeGet('/get/:model', (req, res, next) => {
      req.courseService.read({modelName: req.params.model, searchClause: req.query}).then(resp => {
        log.verbose(this.getTag(), `/get/${req.params.model}.get(): resp=${JSON.stringify(resp)}`)
        res.json(resp)
      }).catch(err => next(err))
    })

    this.routePost('/add/:model', (req, res, next) => {
      // Path is of format /add/Topic?subjectId=5
      req.courseService.create({modelName: req.params.model, data: Object.assign(req.body, req.query)}).then(resp => {
        res.json(resp)
      }).catch(err => next(err))
    })

    this.routePost('/edit/:model', (req, res, next) => {
      // Path is of format /add/Topic?subjectId=5
      req.courseService.update({modelName: req.params.model, data: req.body}).then(resp => {
        res.json(resp)
      }).catch(err => next(err))
    })

    this.routePost('/delete/:model', (req, res, next) => {
      req.courseService.delete({modelName: req.params.model, data: req.body}).then(resp => {
        res.json(resp)
      }).catch(err => next(err))
    })

    // Controller for subtopic page
    this.routeGet('/subtopic/:id', (req, res, next) => {
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
