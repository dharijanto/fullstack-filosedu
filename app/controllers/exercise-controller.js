var path = require('path')

var log = require('npmlog')
var marked = require('marked')
var getSlug = require('speakingurl')
var Promise = require('bluebird')
var pug = require('pug')

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
    function getExerciseData (exerciseSolver, generatedExercise, exerciseId) {
      const data = {}
      var knowns = JSON.parse(generatedExercise.knowns)

      return Promise.map(knowns, known => {
        return exerciseSolver.formatQuestion(known)
      }).then(formattedQuestions => {
        data.allQuestion = {
          unknowns: exerciseSolver._question.unknowns,
          questions: formattedQuestions,
          userAnswers: generatedExercise.userAnswer
        }
        data.generateExerciseId = generatedExercise.id
        data.exerciseId = exerciseId
        return data
      })
    }

    // route to get exercise table
    this.routeGet('/:topicId/:topicSlug/:subtopicId/:subtopicSlug/:exerciseId/:exerciseSlug', PassportHelper.ensureLoggedIn(), (req, res, next) => {
      var exerciseId = req.params.exerciseId
      var subtopicId = req.params.subtopicId
      var topicId = req.params.topicId
      Promise.join(
        courseService.read({modelName: 'Exercise', searchClause: {id: exerciseId}}),
        courseService.read({modelName: 'Subtopic', searchClause: {id: subtopicId}}),
        courseService.read({modelName: 'Topic', searchClause: {id: topicId}}),
        getExerciseStars(req.user.id, exerciseId)
      ).spread((resp, resp2, resp3, resp4) => {
        if (resp.status && resp2.status) {
          var exerciseHash = ExerciseGenerator.getHash(resp.data[0].data)
          var exerciseSolver = ExerciseGenerator.getExerciseSolver(resp.data[0].data)
          if (resp4.status) {
            res.locals.starsHTML = resp4.data
          } else {
            res.locals.starsHTML = '<p style="color:red;"> Unable to retrieve stars... </p>'
          }
          res.locals.subtopic = resp2.data[0]
          res.locals.topic = resp3.data[0]

          log.verbose(TAG, `exercise.GET: exerciseHash=${exerciseHash}`)

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
              log.verbose(TAG, 'exercise.GET: exercise already generated, restoring...')
              return getExerciseData(exerciseSolver, resp2.data[0], exerciseId).then(data => {
                Object.assign(res.locals, data)
                res.render('exercise')
              })
            } else {
              log.verbose(TAG, 'exercise.GET: exercise does not exist or changed, restoring...')
              return courseService.generateExercise(
                exerciseHash,
                exerciseSolver.generateQuestions(),
                exerciseId,
                req.user.id
              ).then(resp3 => {
                if (resp3.status) {
                  return getExerciseData(exerciseSolver, resp3.data, exerciseId).then(data => {
                    Object.assign(res.locals, data)
                    res.render('exercise')
                  })
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

    function getExerciseStars (userId, exerciseId) {
      return courseService.getExerciseStar(userId, exerciseId).then(resp => {
        if (resp.status) {
          const stars = resp.data.stars
          const html = pug.renderFile(path.join(__dirname, '../views/non-pages/stars.pug'), {stars})
          return {status: true, data: html}
        } else {
          return (resp)
        }
      })
    }

    this.routeGet('/getExerciseStars', (req, res, next) => {
      const exerciseId = parseInt(req.query.exerciseId)
      if (exerciseId === undefined) {
        res.json({status: false, errMessage: `exerciseId is needed`})
      } else if (!req.isAuthenticated) {
        res.json({status: false, errMessage: `Unauthorized`})
      } else {
        getExerciseStars(req.user.id, exerciseId).then(resp => {
          res.json(resp)
        }).catch(err => {
          next(err)
        })
      }
    })

    this.routePost('/checkAnswer', (req, res, next) => {
      const userId = req.user.id
      const exerciseId = req.body.exerciseId
      log.verbose(TAG, `checkAnswer.POST(): userId=${userId} exerciseId=${exerciseId}`)

      if (!req.isAuthenticated) {
        log.verbose(TAG, 'checkAnswer.POST: request is not authenticated!')
        res.status(500).send('Request not authenticated!')
      } else {
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
            log.verbose(TAG, `checkAnswer.POST(): generatedQuestions=${JSON.stringify(generatedQuestions)}`)
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

              return courseService.update({
                modelName: 'GeneratedExercise',
                data: {
                  id: generatedExercise.id,
                  score: currentScore,
                  userAnswer: JSON.stringify(userAnswers),
                  submitted: true}
              }).then(resp => {
                if (resp.status) {
                  return getExerciseStars(userId, exerciseId).then(resp2 => {
                    res.json({
                      status: true,
                      data: {
                        realAnswers: JSON.parse(generatedExercise.unknowns),
                        isAnswerCorrect,
                        currentScore,
                        bestScore,
                        starsHTML: resp2.data
                      }
                    })
                  })
                } else {
                  res.json({status: false, errMessage: 'Failed to save generated exercise'})
                }
              })
            }
          }
        }).catch(err => {
          next(err)
        })
      }
    })
  }
}

module.exports = ExerciseController
