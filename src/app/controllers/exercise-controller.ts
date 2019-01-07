import * as Promise from 'bluebird'
import CourseService from '../../services/course-service'
import ExerciseService from '../../services/exercise-service'
import ExerciseGenerator from '../../lib/exercise_generator/exercise-generator'
import ExerciseHelper from '../utils/exercise-helper'

let path = require('path')

let moment = require('moment-timezone')

let log = require('npmlog')

let AnalyticsService = require(path.join(__dirname, '../../services/analytics-service'))
let BaseController = require(path.join(__dirname, 'base-controller'))
let PassportHelper = require(path.join(__dirname, '../utils/passport-helper'))
let PathFormatter = require(path.join(__dirname, '../../lib/path-formatter'))

let Formatter = require(path.join(__dirname, '../../lib/utils/formatter'))
let Utils = require(path.join(__dirname, '../utils/utils'))

const TAG = 'ExerciseController'

class ExerciseController extends BaseController {
  private exerciseFrontendJS: string
  initialize () {
    return new Promise((resolve, reject) => {
      PathFormatter.hashAsset('app', '/assets/js/exercise-app-bundle.js').then(result => {
        this.exerciseFrontendJS = result
        resolve()
      }).catch(err => {
        reject(err)
      })
    })
  }

  constructor (initData) {
    super(initData)
    const analyticsService = new AnalyticsService(this.getDb().sequelize, this.getDb().models)
    this.addInterceptor((req, res, next) => {
      next()
    })

    this.routeGet('/:topicId/:topicSlug/:subtopicId/:subtopicSlug/:exerciseId/:exerciseSlug', PassportHelper.ensureLoggedIn(), (req, res, next) => {
      const userId = req.user.id
      const exerciseId = req.params.exerciseId
      const subtopicId = req.params.subtopicId

      Promise.join<any>(
        ExerciseService.getFormattedExercise(exerciseId, userId),
        ExerciseService.getRenderedExerciseStars(userId, exerciseId),
        ExerciseService.getRenderedExerciseTimers(userId, exerciseId),
        CourseService.getPreviousAndNextExercise(subtopicId, exerciseId),
        CourseService.getPreviousAndNextSubtopic(subtopicId),
        CourseService.getSubtopic(subtopicId)
      ).spread((resp1: NCResponse<FormattedSubtopicExercise>,
                resp2: NCResponse<string>,
                resp3: NCResponse<string>,
                resp4: NCResponse<{ next?: Exercise, prev?: Exercise}>,
                resp5: NCResponse<{ next?: Subtopic, prev?: Subtopic}>,
                resp6: NCResponse<Subtopic>) => {
        if (resp1.status && resp1.data &&
            resp4.status && resp4.data &&
            resp5.status && resp5.data &&
            resp6.status && resp6.data) {
          const prevAndNextExercise = resp4.data
          const prevAndNextSubtopic = resp5.data
          res.locals.formattedExercise = resp1.data.formattedExercise
          res.locals.elapsedTime = resp1.data.elapsedTime
          res.locals.idealTime = resp1.data.idealTime
          res.locals.exerciseId = resp1.data.exerciseId
          res.locals.prevLink = prevAndNextExercise && prevAndNextExercise.prev
              ? Formatter.getExerciseURL(prevAndNextExercise.prev)
              : (prevAndNextSubtopic && prevAndNextSubtopic.prev ?
                    Formatter.getSubtopicURL(prevAndNextSubtopic.prev) : null)
          res.locals.nextLink = prevAndNextExercise && prevAndNextExercise.next
              ? Formatter.getExerciseURL(prevAndNextExercise.next)
              : (prevAndNextSubtopic && prevAndNextSubtopic.next ?
                    Formatter.getSubtopicURL(prevAndNextSubtopic.next) : null)
          res.locals.starsHTML = resp2.status ? resp2.data : '<p style="color:red;"> Unable to retrieve stars... </p>'
          res.locals.timersHTML = resp3.status ? resp3.data : '<p style="color:red;"> Unable to retrieve timers... </p>'
          res.locals.subtopic = resp6.data

          res.locals.bundle = this.exerciseFrontendJS
          res.render('exercise')
        } else {
          next(new Error(resp1.errMessage || resp4.errMessage || resp5.errMessage || resp6.errMessage))
        }
      }).catch(next)
    })

    this.routeGet('/getExerciseStars', PassportHelper.ensureLoggedIn(), (req, res, next) => {
      const exerciseId = parseInt(req.query.exerciseId, 10)
      if (exerciseId === undefined) {
        res.json({ status: false, errMessage: `exerciseId is needed` })
      } else if (!req.isAuthenticated) {
        res.json({ status: false, errMessage: `Unauthorized` })
      } else {
        // subtopic stars
        ExerciseService.getExerciseStars(req.user.id, exerciseId).then(resp => {
          res.json(resp)
        }).catch(err => {
          next(err)
        })
      }
    })

    this.routePost('/exercise/getLeaderboard', (req, res, next) => {
      const exerciseId = parseInt(req.body.exerciseId, 10)
      if (exerciseId === undefined) {
        res.json({ status: false, errMessage: `exerciseId is needed` })
      } else if (!req.isAuthenticated) {
        res.json({ status: false, errMessage: `Unauthorized` })
      } else {
        ExerciseService.getExerciseLeaderboard(exerciseId).then(resp => {
          res.json(resp)
        }).catch(err => {
          next(err)
        })
      }
    })

    // Grading
    this.routePost('/:topicId/:topicSlug/:subtopicId/:subtopicSlug/:exerciseId/:exerciseSlug', PassportHelper.ensureLoggedIn(), (req, res, next) => {
      const userId = req.user.id
      const exerciseId = req.body.exerciseId
      log.verbose(TAG, `submitAnswer.POST(): userId=${userId} exerciseId=${exerciseId}`)

      if (!req.isAuthenticated) {
        log.verbose(TAG, 'submitAnswer.POST: request is not authenticated!')
        res.status(500).send('Request not authenticated!')
      } else {
        Promise.join<any>(
          ExerciseService.getGeneratedExercise({ userId, exerciseId }), // Exercise that's currently being graded
          ExerciseService.getSubmittedExercises({ userId, exerciseId }),
          ExerciseService.getExercise(exerciseId)
        ).spread((geResp: NCResponse<any>, sgeResp: NCResponse<any>, eResp: NCResponse<any>) => {
          if (!geResp.status) {
            log.error(TAG, 'geResp.status=' + geResp.status + ' geResp.errMessage=' + geResp.errMessage)
            return res.json({ status: false, errMessage: 'Current exercise cannot be found' })
          } else if (!eResp.status) {
            return res.json({ status: false, errMessage: 'Exercise information be found' })
          } else {
            const generatedExercise = geResp.data
            let generatedQuestions = JSON.parse(generatedExercise.knowns)
            const submittedExercises = sgeResp.status ? sgeResp.data : []
            const exerciseSolver = ExerciseGenerator.getExerciseSolver(eResp.data.data)
            const userAnswers = req.body.userAnswers // [{'x': '2', 'y': '3'}, {'x': '1', 'y': '3'}]. This is string based

            log.verbose(TAG, `submitAnswer.POST(): userAnswer=${JSON.stringify(userAnswers)}`)
            log.verbose(TAG, `submitAnswer.POST(): generatedQuestions=${JSON.stringify(generatedQuestions)}`)
            if (userAnswers.length !== generatedQuestions.length) {
              return res.json({ status: false, errMessage: 'Number of submitted answers doesn\'t match number of questions!' })
            } else {
              // Get the number of non-empty answer. (i.e. the student tries to answer eventhough it's wrong)
              const attemptedAnswers = userAnswers.reduce((attemptedAnswers, answer) => {
                const keys = Object.keys(answer)
                let attempted = false
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
              const isAnswerCorrect: boolean[] = []
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
              ).spread((resp: NCResponse<any>, resp2: NCResponse<any>) => {
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
              return ExerciseService.updateGeneratedExercise({
                id: generatedExercise.id,
                score: currentScore,
                userAnswer: JSON.stringify(userAnswers),
                submitted: true,
                submittedAt: moment().local().format('YYYY-MM-DD HH:mm:ss'),
                timeFinish
              }).then(resp => {
                if (resp.status) {
                  Promise.join(
                    ExerciseService.getRenderedExerciseStars(userId, exerciseId),
                    ExerciseService.getExerciseLeaderboard(exerciseId),
                    ExerciseService.getCurrentRanking(timeFinish, exerciseId),
                    ExerciseService.getTotalRanking(exerciseId),
                    ExerciseService.getRenderedExerciseTimers(userId, exerciseId)
                  ).spread((resp2: NCResponse<any>, resp3: NCResponse<any>,
                            resp4: NCResponse<any>, resp5: NCResponse<any>, resp6: NCResponse<any>) => {
                    res.json({
                      status: true,
                      data: {
                        realAnswers: JSON.parse(generatedExercise.unknowns),
                        isAnswerCorrect,
                        currentScore,
                        bestScore,
                        starsHTML: resp2.data,
                        timersHTML: resp6.data,
                        ranking: resp3.data,
                        currentTimeFinish: timeFinish,
                        currentRanking: resp4.data.count,
                        totalRanking: resp5.data.count,
                        isPerfectScore: currentScore === 100
                      }
                    })
                  })
                } else {
                  res.json({ status: false, errMessage: 'Failed to save generated exercise' })
                }
              })
            }
          }
        }).catch(err => {
          log.error(TAG, err)
          res.json({ status: false, errMessage: err.message })
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
}

module.exports = ExerciseController
