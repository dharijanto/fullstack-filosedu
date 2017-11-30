const path = require('path')

const log = require('npmlog')
const Promise = require('bluebird')
const marked = require('marked')

const BaseController = require(path.join(__dirname, 'base-controller'))
const CourseService = require(path.join(__dirname, '../../services/course-service'))
const ExerciseGenerator = require(path.join(__dirname, '../../lib/exercise_generator/exercise-generator'))

// const TAG = 'SubtopicController'
class SubtopicController extends BaseController {
  constructor (initData) {
    super(initData)
    const courseService = new CourseService(this.getDb().sequelize, this.getDb().models)
    this.addInterceptor((req, res, next) => {
      res.locals.site = req.site
      res.locals.user = req.user
      res.locals.marked = marked
      next()
    })

    // Retrieve information about subtopic
    this.routeGet('/subtopic/:id', (req, res, next) => {
      const subtopicId = req.params.id
      return Promise.join(
        courseService.read({modelName: 'Subtopic', searchClause: {id: subtopicId}}),
        courseService.read({modelName: 'Exercise', searchClause: {subtopicId}})).spread((sResp, eResp) => {
          if (sResp.status) {
            res.locals.subtopic = sResp.data[0]
            res.locals.exercises = eResp.data || []
            res.locals.subtopicData = res.locals.subtopic.data ? JSON.parse(res.locals.subtopic.data) : {}
            return courseService.read({modelName: 'Topic', searchClause: {id: res.locals.subtopic.topicId}}).then(tResp => {
              if (tResp.status) {
                res.locals.topic = tResp.data[0]
                res.render('subtopic')
              } else {
                next() // 404 not found
              }
            })
          } else {
            next() // 404 not found
          }
        }).then(err => {
          next(err)
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

      const updateSubtopicPromise = courseService.update({modelName: 'Subtopic',
        data: {
          id: subtopicId,
          data: JSON.stringify(req.body.subtopicData)
        }
      })

      const createExercisePromise = Promise.map(newExercises, newExercise => {
        return courseService.create({modelName: 'Exercise', data: newExercise})
      })

      const updateExercisePromises = Promise.map(existingExercises, existingExercise => {
        return courseService.update({modelName: 'Exercise', data: existingExercise})
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
        var exerciseSolver = ExerciseGenerator.getExerciseSolver(valueTextCodeTobeCheck)
        var questions = exerciseSolver.generateQuestions()
        var temporaryQuestion = []
        questions.forEach(question => {
          temporaryQuestion.push({
            question: exerciseSolver.formatQuestion(question.knowns),
            answer: question.unknowns
          })
        })
        res.json({status: true, data: temporaryQuestion})
      } catch (err) {
        res.json({status: false, errMessage: err.message})
      }
    })
  }
  getRouter () {
    return this._router
  }
}

module.exports = SubtopicController
