var path = require('path')

var moment = require('moment-timezone')

var log = require('npmlog')
var Promise = require('bluebird')

var AnalyticsService = require(path.join(__dirname, '../../services/analytics-service'))
var BaseController = require(path.join(__dirname, 'base-controller'))
var CourseService = require(path.join(__dirname, '../../services/course-service'))
var ExerciseService = require(path.join(__dirname, '../../services/exercise-service'))
var ExerciseGenerator = require(path.join(__dirname, '../../lib/exercise_generator/exercise-generator'))
var ExerciseHelper = require(path.join(__dirname, '../utils/exercise-helper'))
var PassportHelper = require(path.join(__dirname, '../utils/passport-helper'))
var PathFormatter = require(path.join(__dirname, '../../lib/path-formatter'))

var Formatter = require(path.join(__dirname, '../../lib/utils/formatter'))
var Utils = require(path.join(__dirname, '../utils/utils'))

const TAG = 'ExerciseController'

class ExerciseController extends BaseController {
  constructor (initData) {
    super(initData)
    const courseService = new CourseService(this.getDb().sequelize, this.getDb().models)
    const analyticsService = new AnalyticsService(this.getDb().sequelize, this.getDb().models)
    const exerciseService = new ExerciseService(this.getDb().sequelize, this.getDb().models)

    this.addInterceptor((req, res, next) => {
      next()
    })

    this.routeGet('/:topicId/:topicSlug/:subtopicId/:subtopicSlug/:exerciseId/:exerciseSlug', PassportHelper.ensureLoggedIn(), (req, res, next) => {
      var exerciseId = req.params.exerciseId
      var subtopicId = req.params.subtopicId
      var topicId = req.params.topicId
      Promise.join(
        exerciseService.getExercise(exerciseId),
        exerciseService.getGeneratedExercise({userId: req.user.id, exerciseId}),
        courseService.getPreviousAndNextExercise(subtopicId, exerciseId),
        exerciseService.getSubtopicExerciseStars(req.user.id, exerciseId),
        exerciseService.getSubtopicExerciseTimer(req.user.id, exerciseId),
        courseService.getPreviousAndNextSubtopic(subtopicId)
      ).spread((resp, resp2, resp6, resp9, resp10, resp11) => {
        if (resp.status) {
          const exerciseHash = ExerciseGenerator.getHash(resp.data.data)
          const exerciseSolver = ExerciseGenerator.getExerciseSolver(resp.data.data)
          const starsHTML = resp9.status ? resp9.data.html : '<p style="color:red;"> Unable to retrieve stars... </p>'
          const stars = resp9.status ? resp9.data.stars : 0
          const timersHTML = resp10.status? resp10.data : '<p style="color:red;"> Unable to retrieve timers... </p>'
          const topic = resp.data.subtopic.topic
          const subtopic = resp.data.subtopic
          const prevAndNextExercise = resp6.data
          const prevAndNextSubtopic = resp11.data
          const prevLink = prevAndNextExercise && prevAndNextExercise.prev
              ? Formatter.getExerciseURL(prevAndNextExercise.prev)
              : (prevAndNextSubtopic && prevAndNextSubtopic.prev ? Formatter.getSubtopicURL(prevAndNextSubtopic.prev) : null)
          const nextLink = prevAndNextExercise && prevAndNextExercise.next
              ? Formatter.getExerciseURL(prevAndNextExercise.next)
              : (prevAndNextSubtopic &&  prevAndNextSubtopic.next ? Formatter.getSubtopicURL(prevAndNextSubtopic.next) : null)

          // If there's exercise to be restored and it's still valid
          if (resp2.status && resp2.data.exerciseHash === exerciseHash) {
            return exerciseService.formatExercise(resp2.data, exerciseSolver).then(data => {
              return Object.assign({
                elapsedTime: Utils.getElapsedTime(resp2.data.createdAt)
              }, {
                formatted: data.formatted,
                exerciseId: data.exerciseId,
                idealTime: data.idealTime,
                topic,
                subtopic,
                starsHTML,
                stars,
                timersHTML,
                prevLink,
                nextLink
              })
            })
          } else if ((resp2.status && resp2.data.exerciseHash !== exerciseHash) || !resp2.status) {
            // If there's no exercise or there's but already expired
            return exerciseService.generateExercise(resp.data).then(resp3 => {
              if (resp3.status) {
                return exerciseService.saveGeneratedExercise(
                  req.user.id,
                  resp3.data.exerciseData,
                  exerciseHash
                ).then(resp4 => {
                  if (resp4.status) {
                    return Object.assign({
                      elapsedTime: Utils.getElapsedTime(resp3.data.createdAt),
                    }, {
                      formatted: resp3.data.formatted,
                      exerciseId: resp.data.id,
                      idealTime: resp3.data.exerciseData.idealTime,
                      topic,
                      subtopic,
                      starsHTML,
                      stars,
                      timersHTML,
                      prevLink,
                      nextLink
                    })
                  } else {
                    throw new Error('Could not create new generatedExercise!')
                  }
                })
              } else {
                throw new Error('Exercise does not exists:' + resp4.errMessage)
              }
            })
          } else {
            throw new Error('Unknown error!')
          }
        } else {
          throw new Error(`exercseId${req.params.exerciseId} or subtopicId=${subtopicId} or topicId=${topicId} does not exist!`)
        }
      }).then(preparedExercise => {
        /*
          preparedExercise: {
            topic,
            subtopic,
            exerciseId,
            formatted,
            idealTime,
            elapsedTime,
            starsHTML,
            timersHTML
          }
        */

        Object.assign(res.locals, preparedExercise)
        res.locals.bundle = this._assetBundle
        res.render('exercise')
      })
    })

    this.routeGet('/getExerciseStars', (req, res, next) => {
      const exerciseId = parseInt(req.query.exerciseId)
      if (exerciseId === undefined) {
        res.json({status: false, errMessage: `exerciseId is needed`})
      } else if (!req.isAuthenticated) {
        res.json({status: false, errMessage: `Unauthorized`})
      } else {
        // subtopic stars
        exerciseService.getSubtopicExerciseStars(req.user.id, exerciseId, false).then(resp => {
          res.json(resp)
        }).catch(err => {
          next(err)
        })
      }
    })

    this.routePost('/exercise/getLeaderboard', (req, res, next) => {
      const exerciseId = parseInt(req.body.exerciseId)
      if (exerciseId === undefined) {
        res.json({status: false, errMessage: `exerciseId is needed`})
      } else if (!req.isAuthenticated) {
        res.json({status: false, errMessage: `Unauthorized`})
      } else {
        exerciseService.getExerciseLeaderboard(exerciseId, false, true).then(resp => {
          res.json(resp)
        }).catch(err => {
          next(err)
        })
      }
    })

    // Grading
    this.routePost('/:topicId/:topicSlug/:subtopicId/:subtopicSlug/:exerciseId/:exerciseSlug', (req, res, next) => {
      const userId = req.user.id
      const exerciseId = req.body.exerciseId
      log.verbose(TAG, `submitAnswer.POST(): userId=${userId} exerciseId=${exerciseId}`)

      if (!req.isAuthenticated) {
        log.verbose(TAG, 'submitAnswer.POST: request is not authenticated!')
        res.status(500).send('Request not authenticated!')
      } else {
        Promise.join(
          exerciseService.getGeneratedExercise({userId, exerciseId}), // Exercise that's currently being graded
          exerciseService.getSubmittedExercises({userId, exerciseId}),
          exerciseService.getExercise(exerciseId)
        ).spread((geResp, sgeResp, eResp) => {
          if (!geResp.status) {
            log.error(TAG, 'geResp.status=' + geResp.status + ' geResp.errMessage=' + geResp.errMessage)
            res.json({status: false, errMessage: 'Current exercise cannot be found'})
          } else if (!eResp.status) {
            res.json({status: false, errMessage: 'Exercise information be found'})
          } else {
            const generatedExercise = geResp.data
            var generatedQuestions = JSON.parse(generatedExercise.knowns)
            const submittedExercises = sgeResp.status ? sgeResp.data : []
            const exerciseSolver = ExerciseGenerator.getExerciseSolver(eResp.data.data)
            const userAnswers = req.body.userAnswers // [{'x': '2', 'y': '3'}, {'x': '1', 'y': '3'}]. This is string based

            log.verbose(TAG, `submitAnswer.POST(): userAnswer=${JSON.stringify(userAnswers)}`)
            log.verbose(TAG, `submitAnswer.POST(): generatedQuestions=${JSON.stringify(generatedQuestions)}`)
            if (userAnswers.length !== generatedQuestions.length) {
              res.json({status: false, errMessage: 'Number of submitted answers doesn\'t match number of questions!'})
            } else {
              // Get the number of non-empty answer. (i.e. the student tries to answer eventhough it's wrong)
              const attemptedAnswers = userAnswers.reduce((attemptedAnswers, answer) => {
                const keys = Object.keys(answer)
                var attempted = false
                keys.forEach(key => {
                  if (answer[key].length > 0) {
                    attempted = true
                  }
                })
                if (attempted) {
                  return attemptedAnswers + 1
                } else {
                  return attemptedAnswers
                }
              }, 0) / parseFloat(generatedQuestions.length) * 100

              log.verbose(TAG, 'submitAnswer.POST(): attemptedAnswers= ' + attemptedAnswers)

              // Flag array identifying which user answer is correct/wrong
              const isAnswerCorrect = []
              // Compute the score of current exercise
              const correctAnswers = generatedQuestions.reduce((numCorrect, knowns, index) => {
                const unknowns = userAnswers
                log.verbose(TAG, `submitAnswer.POST(): knowns=${JSON.stringify(knowns)}, unknowns=${JSON.stringify(unknowns[index])} isAnswer=${exerciseSolver.isAnswer(knowns, unknowns[index])}`)
                const isCorrect = exerciseSolver.isAnswer(knowns, unknowns[index])
                isAnswerCorrect.push(isCorrect)
                return isCorrect ? numCorrect + 1 : numCorrect
              }, 0)
              const currentScore = correctAnswers / parseFloat(generatedQuestions.length) * 100
              // Compute the best score
              const bestScore = submittedExercises.reduce((bestScore, submitedExercise) => {
                return submitedExercise.score > bestScore ? submitedExercise.score : bestScore
              }, 0)

              // Keep track of the number of correct and attempted answers
              Promise.join(
                analyticsService.addExerciseData('correctAnswers', currentScore, exerciseId, userId),
                analyticsService.addExerciseData('attemptedAnswers', attemptedAnswers, exerciseId, userId)
              ).spread((resp, resp2) => {
                if (!resp.status) {
                  log.error(TAG, 'submitAnswer.POST(): addExerciseData.resp=' + JSON.stringify(resp))
                }
                if (!resp2.status) {
                  log.error(TAG, 'submitAnswer.POST(): addExerciseData.resp2=' + JSON.stringify(resp2))
                }
              }).catch(err => {
                log.error(TAG, err)
              })

              const timeFinish = ExerciseHelper.countTimeFinish(generatedExercise.createdAt)
              return exerciseService.updateGenerateExercise({
                id: generatedExercise.id,
                score: currentScore,
                userAnswer: JSON.stringify(userAnswers),
                submitted: true,
                timeFinish
              }).then(resp => {
                if (resp.status) {
                  Promise.join(
                    exerciseService.getSubtopicExerciseStars(userId, exerciseId),
                    exerciseService.getExerciseLeaderboard(exerciseId, false),
                    exerciseService.getSubtopicCurrentRanking(timeFinish, exerciseId),
                    exerciseService.getSubtopicTotalRanking(exerciseId),
                    exerciseService.getSubtopicExerciseTimer(userId, exerciseId)
                  ).spread((resp2, resp3, resp4, resp5, resp6) => {
                    res.json({
                      status: true,
                      data: {
                        realAnswers: JSON.parse(generatedExercise.unknowns),
                        isAnswerCorrect,
                        currentScore,
                        bestScore,
                        starsHTML: resp2.data.html,
                        timersHTML: resp6.data,
                        ranking: resp3.data,
                        currentTimeFinish: timeFinish,
                        currentRanking: resp4.data.count,
                        totalRanking: resp5.data.count,
                        isPerfectScore: parseInt(currentScore) === 100
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

    this.routePost('/exercise/analytics', (req, res, next) => {
      // Event type
      const key = req.body.key
      const exerciseId = req.body.exerciseId
      const userId = (req.user && req.user.id) || -1
      const value = req.body.value
      analyticsService.addExerciseData(key, value, exerciseId, userId).then(resp => {
        res.json(resp)
      }).catch(err => {
        next(err)
      })
    })
  }

  initialize () {
    return new Promise((resolve, reject) => {
      PathFormatter.hashAsset('app', '/assets/js/exercise-app-bundle.js').then(result => {
        this._assetBundle = result
        resolve()
      }).catch(err => {
        reject(err)
      })
    })
  }
}

module.exports = ExerciseController
