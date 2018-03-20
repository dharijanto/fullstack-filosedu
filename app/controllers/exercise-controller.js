var path = require('path')

var log = require('npmlog')
var Promise = require('bluebird')
var pug = require('pug')

var AnalyticsService = require(path.join(__dirname, '../../services/analytics-service'))
var BaseController = require(path.join(__dirname, 'base-controller'))
var CourseService = require(path.join(__dirname, '../../services/course-service'))
var ExerciseGenerator = require(path.join(__dirname, '../../lib/exercise_generator/exercise-generator'))
var PassportHelper = require(path.join(__dirname, '../utils/passport-helper'))
var PathFormatter = require(path.join(__dirname, '../../lib/path-formatter'))

const TAG = 'ExerciseController'

class ExerciseController extends BaseController {
  constructor (initData) {
    super(initData)
    const courseService = new CourseService(this.getDb().sequelize, this.getDb().models)
    const analyticsService = new AnalyticsService(this.getDb().sequelize, this.getDb().models)

    this.addInterceptor((req, res, next) => {
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
          res.locals.bundle = this._assetBundle

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

    function getExerciseLeaderboard (exerciseId) {
      return courseService.getExerciseRanking({exerciseId}).then(resp => {
        if (resp.status) {
          const exerciseData = resp.data
          const html = pug.renderFile(path.join(__dirname, '../views/non-pages/ranking.pug'), {exerciseData})
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

    this.routePost('/exercise/getLeaderboard', (req, res, next) => {
      const exerciseId = parseInt(req.body.exerciseId)
      if (exerciseId === undefined) {
        res.json({status: false, errMessage: `exerciseId is needed`})
      } else if (!req.isAuthenticated) {
        res.json({status: false, errMessage: `Unauthorized`})
      } else {
        getExerciseLeaderboard(exerciseId).then(resp => {
          res.json(resp)
        }).catch(err => {
          next(err)
        })
      }
    })

    this.routePost('/exercise/submitAnswers', (req, res, next) => {
      const userId = req.user.id
      const exerciseId = req.body.exerciseId
      log.verbose(TAG, `submitAnswer.POST(): userId=${userId} exerciseId=${exerciseId}`)

      if (!req.isAuthenticated) {
        log.verbose(TAG, 'submitAnswer.POST: request is not authenticated!')
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

              const timeStart = new Date(generatedExercise.createdAt).getTime()
              const timeSubmit = Date.now()
              const timeFinish = ((timeSubmit - timeStart) / 1000).toFixed(2)
              return courseService.update({
                modelName: 'GeneratedExercise',
                data: {
                  id: generatedExercise.id,
                  score: currentScore,
                  userAnswer: JSON.stringify(userAnswers),
                  submitted: true,
                  timeFinish
                }
              }).then(resp => {
                if (resp.status) {
                  Promise.join(
                    getExerciseStars(userId, exerciseId),
                    getExerciseLeaderboard(exerciseId),
                    courseService.getCurrentRanking(timeFinish, exerciseId),
                    courseService.getTotalRanking(exerciseId)
                  ).spread((resp2, resp3, resp4, resp5) => {
                    res.json({
                      status: true,
                      data: {
                        realAnswers: JSON.parse(generatedExercise.unknowns),
                        isAnswerCorrect,
                        currentScore,
                        bestScore,
                        starsHTML: resp2.data,
                        ranking: resp3.data,
                        currentTimeFinish: timeFinish,
                        currentRanking: resp4.data.count,
                        totalRanking: resp5.data.count,
                        isPerfectScore: parseInt(currentScore) === 100 ? true : false
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
