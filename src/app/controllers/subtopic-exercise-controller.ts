import * as Promise from 'bluebird'
import CourseService from '../../services/course-service'
import ExerciseService, { ExerciseAnswer } from '../../services/exercise-service'
import CompetencyExerciseService from '../../services/competency-exercise-service'
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

const TAG = 'ExerciseController'

class SubtopicExerciseController extends BaseController {
  private exerciseFrontendJS: string
  private competencyExerciseLogiscticJS: string
  private competencyExerciseJS: string

  initialize () {
    return Promise.join(
      PathFormatter.hashAsset('app', '/assets/js/exercise-app-bundle.js'),
      PathFormatter.hashAsset('app', '/assets/js/competency-exercise-logistic-app-bundle.js'),
      PathFormatter.hashAsset('app', '/assets/js/competency-exercise-app-bundle.js')
    ).spread((result: string, result2: string, result3: string) => {
      this.exerciseFrontendJS = result
      this.competencyExerciseLogiscticJS = result2
      this.competencyExerciseJS = result3
    })
  }

  constructor (initData) {
    super(initData)
    const analyticsService = new AnalyticsService(this.getDb().sequelize, this.getDb().models)
    this.addInterceptor((req, res, next) => {
      next()
    })

    // Continue/start an exercise
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

    // Exercise submission
    this.routePost(
      '/:topicId/:topicSlug/:subtopicId/:subtopicSlug/:exerciseId/:exerciseSlug',
      PassportHelper.ensureLoggedIn(),
      (req, res, next) => {
        const userId = req.user.id
        const exerciseId = req.body.exerciseId
        const answers: ExerciseAnswer = req.body.answers
        console.dir(req.body)
        ExerciseService.finishExercise(exerciseId, userId, answers).then(resp => {
          if (res.status && resp.data) {
            const grade = resp.data

            // Does the student even try?
            const attemptsPercentage = answers.reduce((count, answer) => {
              const userInputs = Object.values<string>(answer)
              // Make sure at least one input is not empty
              let attempted = userInputs.reduce((acc, userInput) => acc || userInput.length > 0, false)
              return attempted ? count + 1 : 0
            }, 0) / answers.length * 100

            analyticsService.addExerciseSubmissionStats(
              grade.score,
              attemptsPercentage,
              exerciseId,
              userId
            ).then(resp => {
              if (!resp.status) {
                log.error(TAG, 'submitAnswer.POST(): failed to add analytics: ' + JSON.stringify(resp))
              }
            }).catch(err => log.error(TAG, err))

            // TODO: This should be done on the service, so that we can share type definitions with
            //       frontend
            Promise.join(
              ExerciseService.getRenderedExerciseStars(userId, exerciseId),
              ExerciseService.getExerciseLeaderboard(exerciseId),
              ExerciseService.getCurrentRanking(grade.timeFinish, exerciseId),
              ExerciseService.getTotalRanking(exerciseId),
              ExerciseService.getRenderedExerciseTimers(userId, exerciseId)
            ).spread((resp2: NCResponse<any>, resp3: NCResponse<any>,
                      resp4: NCResponse<any>, resp5: NCResponse<any>, resp6: NCResponse<any>) => {
              res.json({
                status: true,
                data: {
                  correctAnswers: grade.correctAnswers,
                  isCorrect: grade.isCorrect,
                  score: grade.score,
                  starsHTML: resp2.data,
                  timersHTML: resp6.data,
                  ranking: resp3.data,
                  timeFinish: grade.timeFinish,
                  currentRanking: resp4.data.count,
                  totalRanking: resp5.data.count
                }
              })
            })
          }
        })
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

export default SubtopicExerciseController
