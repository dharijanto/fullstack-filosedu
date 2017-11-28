var path = require('path')

var log = require('npmlog')
var marked = require('marked')
var getSlug = require('speakingurl')
var Promise = require('bluebird')

var BaseController = require(path.join(__dirname, 'base-controller'))
var CourseService = require(path.join(__dirname, '../../services/course-service'))
var ExerciseGenerator = require(path.join(__dirname, '../../lib/exercise_generator/exercise-generator'))
var PassportHelper = require(path.join(__dirname, '../utils/passport-helper'))

const TAG = 'CredentialController'

class ExerciseController extends BaseController {
  constructor (initData) {
    super(initData)
    const courseService = new CourseService(this.getDb().sequelize, this.getDb().models)

    this.addInterceptor((req, res, next) => {
      log.verbose(TAG, 'req.path=' + req.path)
      log.verbose(TAG, 'loggedIn=' + req.isAuthenticated())
      log.verbose(TAG, 'req.on=' + JSON.stringify(req.session))
      res.locals.site = req.site
      res.locals.user = req.user
      res.locals.getSlug = getSlug
      res.locals.marked = marked
      res.locals.loggedIn = req.isAuthenticated()
      next()
    })

    // Helper function: data that are used for exercise view
    function getExerciseData (exercise, generatedExercise, exerciseId) {
      const data = {}
      var knowns = JSON.parse(generatedExercise.knowns)

      data.allQuestion = {
        unknowns: exercise._question.unknowns,
        questions: knowns.map(known => exercise.formatQuestion(known)),
        userAnswers: generatedExercise.userAnswer
      }

      data.generateExerciseId = generatedExercise.id
      data.exerciseId = exerciseId

      return data
    }

    // route to get exercise table
    this.routeGet('/:topicId/:topicSlug/:subtopicId/:subtopicSlug/:exerciseId/:exerciseSlug', PassportHelper.ensureLoggedIn(), (req, res, next) => {
      var exerciseId = req.params.exerciseId
      var subtopicId = req.params.subtopicId
      var topicId = req.params.topicId
      Promise.join(
        courseService.read({modelName: 'Exercise', searchClause: {id: exerciseId}}),
        courseService.read({modelName: 'Subtopic', searchClause: {id: subtopicId}}),
        courseService.read({modelName: 'Topic', searchClause: {id: topicId}})
      ).spread((resp, resp2, resp3) => {
        if (resp.status && resp2.status) {
          var exerciseHash = ExerciseGenerator.getHash(resp.data[0].data)
          var exerciseSolver = ExerciseGenerator.getExerciseSolver(resp.data[0].data)
          res.locals.subtopic = resp2.data[0]
          res.locals.topic = resp3.data[0]

          // Check whether previous exercise has been submitted or not. If submitted,
          // we create new question for student otherwise, restore previous exercise.
          return courseService.read({
            modelName: 'GeneratedExercise',
            searchClause: {
              userId: req.user.id,
              exerciseHash,
              submitted: false
            }
          }).then(resp2 => {
            if (resp2.status) {
              Object.assign(res.locals, getExerciseData(exerciseSolver, resp2.data[0], exerciseId))
              res.render('exercise')
            } else {
              return courseService.createGenerateExercise(
                exerciseHash,
                exerciseSolver.generateQuestions(),
                exerciseId,
                req.user.id
              ).then(resp3 => {
                if (resp3.status) {
                  Object.assign(res.locals, getExerciseData(exerciseSolver, resp3.data, exerciseId))
                  res.render('exercise')
                } else {
                  throw new Error('Cannot create exercise!')
                }
              })
            }
          })
        } else {
          next()
        }
      }).catch(err => {
        next(err)
      })
    })

    this.routePost('/checkAnswer', PassportHelper.ensureLoggedIn(), (req, res, next) => {
      const userId = req.user.id
      const exerciseId = req.body.exerciseId

      log.verbose(TAG, `checkAnswer.POST(): userId=${userId} exerciseId=${exerciseId}`)
      Promise.join(
        courseService.getCurrentExercise({userId, exerciseId}), // Exercise that's currently being graded
        courseService.getSubmittedExercises({userId, exerciseId}),
        courseService.read({modelName: 'Exercise', searchClause: {id: exerciseId}})
      ).spread((geResp, sgeResp, eResp) => {
        if (!geResp.status) {
          log.error(TAG, 'geResp.status=' + geResp.status + ' geResp.errMessage=' + geResp.errMessage)
          res.json({status: false, errMessage: 'Current exercise cannot be found'})
        } else if (!eResp.status) {
          res.json({status: false, errMessage: 'Exercise information be found'})
        } else {
          const generatedExercise = geResp.data[0]
          const generatedQuestions = JSON.parse(generatedExercise.knowns)
          const submittedExercises = sgeResp.status ? sgeResp.data : []
          const exerciseSolver = ExerciseGenerator.getExerciseSolver(eResp.data[0].data)
          const userAnswers = req.body.userAnswers // [{'x': '2', 'y': '3'}, {'x': '1', 'y': '3'}]. This is string based

          log.verbose(TAG, `checkAnswer.POST(): userAnswer=${JSON.stringify(userAnswers)}`)
          if (userAnswers.length !== generatedQuestions.length) {
            res.json({status: false, errMessage: 'Number of submitted answers doesn\'t match number of questions!'})
          } else {
            // Flag array identifying which user answer is correct/wrong
            const isAnswerCorrect = []
            // Compute the score of current exercise
            const currentScore = generatedQuestions.reduce((numCorrect, knowns, index) => {
              const unknowns = userAnswers

              log.verbose(TAG, `checkAnswer.POST(): knowns=${JSON.stringify(knowns)}, unknowns=${JSON.stringify(unknowns[index])} isAnswer=${exerciseSolver.isAnswer(knowns, unknowns[index])}`)
              const isCorrect = exerciseSolver.isAnswer(knowns, unknowns[index])
              isAnswerCorrect.push(isCorrect)
              return isCorrect ? numCorrect + 1 : numCorrect
            }, 0) / parseFloat(generatedQuestions.length) * 100

            // Compute the best score
            const bestScore = submittedExercises.reduce((bestScore, submitedExercise) => {
              return submitedExercise.score > bestScore ? submitedExercise.score : bestScore
            }, 0)

            courseService.update({
              modelName: 'GeneratedExercise',
              data: {
                id: generatedExercise.id,
                score: currentScore,
                userAnswer: JSON.stringify(userAnswers),
                submitted: true}
            }).then(resp => {
              if (resp.status) {
                res.json({
                  status: true,
                  data: {
                    realAnswers: JSON.parse(generatedExercise.unknowns),
                    isAnswerCorrect,
                    currentScore,
                    bestScore
                  }
                })
              } else {
                res.json({status: false, errMessage: 'Failed to save generated exercise'})
              }
            })
          }
        }
      })
    })
  }
}

module.exports = ExerciseController
