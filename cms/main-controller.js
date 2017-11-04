const path = require('path')

const log = require('npmlog')
const Promise = require('bluebird')

const BaseController = require(path.join(__dirname, 'base-controller'))
const CourseService = require(path.join(__dirname, '../course-service'))
const ExerciseGenerator = require(path.join(__dirname, '../lib/exercise_generator/exercise-generator'))

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

    // Retrieve information about subtopic
    this.routeGet('/subtopic/:id', (req, res, next) => {
      const subtopicId = req.params.id
      Promise.join(
        req.courseService.read({modelName: 'Subtopic', searchClause: {id: subtopicId}}),
        req.courseService.read({modelName: 'Exercise', searchClause: {subtopicId}})).spread((sResp, eResp) => {
          // If subtopic is retrieved, it's a success. Questions are optional
          if (sResp.status) {
            return {
              status: true,
              data: {
                subtopic: sResp.data[0],
                exercises: eResp.data || []
              }
            }
          } else {
            return {status: false, errMessage: 'Failed to retrieve subtopic with id=' + subtopicId}
          }
        }).then(resp => {
          if (resp.status) {
            res.locals.subtopic = resp.data.subtopic
            res.locals.exercises = resp.data.exercises
            res.locals.subtopicData = resp.data.subtopic.data ? JSON.parse(resp.data.subtopic.data) : {}
            res.render('subtopic')
          } else {
            next() // 404 not found
          }
        })
    })

    // When subtopic is submitted, there 3 informations:
    // 1. Updated subtopic detail: req.body.subtopicData
    // 2. New exercises: req.body.new-exercise-*
    // 3. Updated exercises: req.body.exercise-*
    this.routePost('/subtopic/submit/:id', (req, res, next) => {
      log.verbose(this.getTag(), 'req.body=' + JSON.stringify(req.body))
      const subtopicId = req.params.id
      var reqBodyKeys = Object.keys(req.body || {})
      var newExercises = []
      var existingExercises = []

      // Process exercises
      reqBodyKeys.forEach(key => {
        // New exercise is identified with key new-exercise-[ID]
        if (key.startsWith('new-exercise')) {
          // frontendKey is used to map POST's key to actual question key
          newExercises.push({subtopicId, data: req.body[key], frontendKey: key})
        }
        // Existing exercise is identified with key exercise-[ID]
        if (key.startsWith('exercise-')) {
          const exerciseId = key.split('-')[1]
          existingExercises.push({subtopicId, id: exerciseId, data: req.body[key]})
        }
      })

      const updateSubtopicPromise = req.courseService.update({modelName: 'Subtopic',
        data: {
          id: subtopicId,
          data: JSON.stringify(req.body.subtopicData)
        }
      })

      const createExercisePromise = Promise.map(newExercises, newExercise => {
        return req.courseService.create({modelName: 'Exercise', data: newExercise})
      })

      const updateExercisePromises = Promise.map(existingExercises, existingExercise => {
        return req.courseService.update({modelName: 'Exercise', data: existingExercise})
      })

      log.verbose(this.getTag(), `newExercises = ${JSON.stringify(newExercises)}`)
      log.verbose(this.getTag(), `existingExercises = ${JSON.stringify(existingExercises)}`)

      // Pre-requisite of returning 'status: true'
      // 1. updateSubtopicPromise (resp1) has to succeed
      // 2. createExercisePromise (resp2) and updateExercisePromises (resp3) has to either be null or all succeeded
      //
      // Return: {status: true, data: {newExerciseIds: {new-exercise-3: 5}}}
      // newExerciseIds is used by frontend to map temporary id to real id
      Promise.join(updateSubtopicPromise, createExercisePromise, updateExercisePromises).spread((resp1, resp2, resp3) => {
        if (resp1.status) {
          var data = {newExerciseIds: {}} // newExercises: {frontendKey: exerciseId}, this is used by frontend to map temporary key to actual key
          var success = true
          var errMessage = null
          // If new exercise(s) is added, all of them has to succeed
          if (newExercises.length) {
            success = resp2.reduce((acc, resp, index) => {
              errMessage = resp.status === false ? resp.errMessage : errMessage
              const frontendKey = newExercises[index].frontendKey
              data.newExerciseIds[frontendKey] = resp.data.id
              return acc && resp.status
            }, success)
          }
          // If any exercise(s) is updated, all of them has to succeed
          if (existingExercises.length) {
            success = resp3.reduce((acc, resp) => {
              errMessage = resp.status === false ? resp.errMessage : errMessage
              return acc && resp.status
            }, success)
          }
          // errMessage is one of the returned
          res.send(Object.assign({status: success, data}, errMessage && {errMessage}))
        } else {
          res.send({status: false,
            errMessage: resp1.errMessage})
        }
      })
    })

    this.routePost('/generateExercise', (req, res, next) => {
      var valueTextCodeTobeCheck = req.body.text
      try {
        var exercise = ExerciseGenerator.getExercise(valueTextCodeTobeCheck)
        var questions = exercise.generateQuestions()
        var temporaryQuestion = []
        questions.forEach(question => {
          temporaryQuestion.push({
            question: exercise.formatQuestion(question.knowns),
            answer: question.unknowns
          })
        })
        res.json({status: true, data: temporaryQuestion})
      } catch (err) {
        res.json({status: false, errMessage: err.message})
      }
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
