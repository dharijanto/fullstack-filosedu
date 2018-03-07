const path = require('path')

const log = require('npmlog')
const marked = require('marked')

const BaseController = require(path.join(__dirname, 'base-controller'))
const CourseService = require(path.join(__dirname, '../../services/course-service'))
const PathFormatter = require(path.join(__dirname, '../../lib/path-formatter'))

const TAG = 'CourseManagementController'
class CourseManagementController extends BaseController {
  constructor (initData) {
    super(initData)

    this.addInterceptor((req, res, next) => {
      log.verbose(TAG, 'req.path=' + req.path)
      res.locals.site = req.site
      res.locals.user = req.user
      res.locals.marked = marked
      req.courseService = new CourseService(this.getDb().sequelize, this.getDb().models)
      next()
    })

    this.routeGet('/', (req, res, next) => {
      PathFormatter.hashBundle('cms', 'js/course-management-cms-bundle.js').then(resp => {
        res.locals.bundle = resp
        res.render('index')
      })
    })

    this.routePost('/add/TopicDependency', (req, res, next) => {
      const dependencyName = req.body.dependencyName || ''
      req.courseService.addTopicDependency(req.query.topicId, dependencyName, req.body.description).then(resp => {
        res.json(resp)
      }).catch(err => next(err))
    })

    this.routeGet('/get/TopicDependency', (req, res, next) => {
      log.verbose(TAG, 'get/TopicDependency.GET: req.body=' + JSON.stringify(req.body))
      req.courseService.getTopicDependencies(req.query.topicId).then(resp => {
        res.json(resp)
      }).catch(next)
    })

    this.routeGet('/get/:model', (req, res, next) => {
      req.courseService.read({modelName: req.params.model, searchClause: req.query}).then(resp => {
        log.verbose(this.getTag(), `/get/${req.params.model}.get(): resp=${JSON.stringify(resp)}`)
        // Read returns false if there's no data matching the searchClause, but in this situation
        // having no data is fine
        res.json({status: true, data: resp.data || []})
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
  }
}

module.exports = CourseManagementController
