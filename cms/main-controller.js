const path = require('path')
const log = require('npmlog')
const moment = require('moment')
const Promise = require('bluebird')

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
      const subtopicId = req.params.id
      Promise.join(
        req.courseService.getSubTopic(req.params.id),
        req.courseService.read({modelName: 'Question', data: {subtopicId: subtopicId}}),
        function (subtopic, question) {
          var resultObject = {}
          if (subtopic.status && question.status) {
            resultObject = {
              status: true,
              subtopic: subtopic.data,
              question: question.data
            }
          } else {
            resultObject = {
              status: true,
              subtopic: subtopic.data
            }
          }
          return resultObject
        }
      ).then(resp => {
        if (resp.question.length > 0) {
          res.locals.question = resp.question
        }

        if (resp.status) {
          res.locals.subtopic_id = subtopicId
          res.locals.subtopic = resp.subtopic.subtopic
          res.locals.description = resp.subtopic.description
          res.locals.data = null
          if (resp.subtopic.data) {
            res.locals.data = JSON.parse(resp.subtopic.data)
          }

          if (req.session['status']) {
            res.locals.status = req.session['status']
            req.session['status'] = null
          }
        }
        res.render('cms')
      })
    })

    // Controller for submit subtopic
    this.routePost('/subtopic/submit/:id', (req, res, next) => {
      const subtopicId = req.params.id
      console.log('nyari exercise')
      console.log(req.body)

      req.courseService.updateSubTopic(req.params.id, req.body).then(resp => {
        var index = 0

        while (index < req.body.exercise_code.length) {
          var contentQuery = {
            subtopicId: subtopicId,
            data: req.body.exercise_code[index]
          }
          req.courseService.create({modelName: 'Question', data: contentQuery}).then(resp => {
            console.log('di bagian create')
            console.log(resp)
          })
          index++
        }
        req.session['status'] = 'Update Subtopic was successfully'
        res.json(resp)
      }).catch(err => next(err))
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
