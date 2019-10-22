import * as Promise from 'bluebird'
import CourseService from '../../services/course-service'
import ExerciseService, { ExerciseAnswer } from '../../services/exercise-service'
import CompetencyExerciseService from '../../services/competency-exercise-service'
import ExerciseGenerator from '../../lib/exercise_generator/exercise-generator'
import ExerciseHelper from '../utils/exercise-helper'
import TopicExerciseService from '../../services/topic-exercise-service'

let path = require('path')

let log = require('npmlog')

let AnalyticsService = require(path.join(__dirname, '../../services/analytics-service'))
let BaseController = require(path.join(__dirname, 'base-controller'))
let PassportHelper = require(path.join(__dirname, '../utils/passport-helper'))
let PathFormatter = require(path.join(__dirname, '../../lib/path-formatter'))

let Formatter = require(path.join(__dirname, '../../lib/utils/formatter'))

const TAG = 'ExerciseController'

export default class CompetencyExerciseController extends BaseController {
  private competencyExerciseLogiscticJS: string
  private competencyExerciseJS: string

  initialize () {
    return Promise.join(
      PathFormatter.hashAsset('app', '/assets/js/competency-exercise-logistic-app-bundle.js'),
      PathFormatter.hashAsset('app', '/assets/js/competency-exercise-app-bundle.js')
    ).spread((result: string, result2: string) => {
      this.competencyExerciseLogiscticJS = result
      this.competencyExerciseJS = result2
    })
  }

  constructor (initData) {
    super(initData)
    const analyticsService = new AnalyticsService(this.getDb().sequelize, this.getDb().models)
    this.addInterceptor((req, res, next) => {
      next()
    })

    // POST competency-exercise code and see if it's registered
    // This is used as a "stupid" protection to prevent untracked access
    // to competency exercise
    this.routePost('/exercise-code', (req, res, next) => {
      const code = req.body.code
      CompetencyExerciseService.submitExerciseCode(code).then(resp => {
        res.json(resp)
        if (!resp.status) {
          // TODO: Send email to us so we know there's a wrong attempt
        }
      }).catch(err => {
        log.error(TAG, err)
        res.json({ status: false, errMessage: err.message })
      })
    })

    // Update state from 'pendingExercise' -> 'exercising'
    this.routePost('/start-topic', (req, res, next) => {
      const competencyExerciseId = req.session.competencyExerciseId || 0
      if (competencyExerciseId) {
        CompetencyExerciseService.getGeneratedExercise(competencyExerciseId).then(resp => {
          if (resp.status && resp.data) {
            return CompetencyExerciseService.startExercise(resp.data).then(resp => {
              if (resp.status && resp.data) {
                res.json({ status: true })
              } else {
                res.json({ status: false, errMessage: `Failed to startExercise: ${resp.errMessage}` })
              }
            })
          } else {
            return res.json({ status: false, errMessage: `Failed to getGeneratedExercise: ${resp.errMessage}` })
          }
        }).catch(next)
      } else {
        res.json({ status: false, errMessage: `competencyExerciseId is not found! Session expired?`, errCode: 1 })
      }
    })

    this.routePost('/abandon-exercise', (req, res, next) => {
      const competencyExerciseId = req.session.competencyExerciseId || 0
      if (competencyExerciseId) {
        CompetencyExerciseService.getGeneratedExercise(competencyExerciseId).then(resp => {
          if (resp.status && resp.data) {
            return CompetencyExerciseService.abandonExercise(resp.data, req.user ? req.user.id : null).then(resp => {
              if (resp.status) {
                // Delete id from session, so that user can re-take the competency test
                delete req.session['competencyExerciseId']
                req.session.save(err => {
                  if (err) {
                    res.json({ status: false, errMessage: err.message })
                  } else {
                    res.json({ status: true })
                  }
                })
              } else {
                res.json({ status: false, errMessage: `Failed to abandonExercise: ${resp.errMessage}` })
              }
            })
          } else {
            return res.json({ status: false, errMessage: `Failed to getGeneratedExercise: ${resp.errMessage}` })
          }
        }).catch(err => {
          log.error(TAG, err)
          res.json({ status: false, errMessage: 'Failed: ' + err.message })
        })
      } else {
        res.json({ status: false, errMessage: `competencyExerciseId is not found! Session expired?`, errCode: 1 })
      }
    })

    this.routePost('/skip-topic', (req, res, next) => {
      const competencyExerciseId = req.session.competencyExerciseId || 0
      if (competencyExerciseId) {
        CompetencyExerciseService.getGeneratedExercise(competencyExerciseId).then(resp => {
          if (resp.status && resp.data) {
            return CompetencyExerciseService.skipTopic(resp.data).then(resp => {
              if (resp.status) {
                res.json({ status: true })
              } else {
                res.json({ status: false, errMessage: `Failed to abandonExercise: ${resp.errMessage}` })
              }
            })
          } else {
            return res.json({ status: false, errMessage: `Failed to getGeneratedExercise: ${resp.errMessage}` })
          }
        })
      } else {
        res.json({ status: false, errMessage: `competencyExerciseId is not found! Session expired?`, errCode: 1 })
      }
    })

    this.routePost('/submit', (req, res, next) => {
      const competencyExerciseId = req.session.competencyExerciseId || 0
      const { name, phone, email } = req.body
      log.info(TAG, '/.GET: competencyExerciseId=' + competencyExerciseId)
      CompetencyExerciseService.submitExercise(competencyExerciseId, { name, phone, email }).then(resp => {
        res.json(resp)
      }).catch(err => {
        log.error(TAG, err)
        res.json({ status: false, errMessage: err.message })
      })
    })

    this.routeGet('/debug/finished', (req, res, next) => {
      res.render('competency-exercise/finished')
    })

    this.routeGet('/debug/submitted', (req, res, next) => {
      res.render('competency-exercise/submitted')
    })

    this.routePost('/retake-exercise', (req, res, next) => {
      delete req.session['competencyExerciseId']
      req.session.save(err => {
        if (err) {
          res.json({ status: false, errMessage: `Failed to save session: ${err.message}` })
        } else {
          res.json({ status: true })
        }
      })
    })

    this.routeGet('/', (req, res, next) => {
      const competencyExerciseId = req.session.competencyExerciseId || 0
      log.info(TAG, '/.GET: competencyExerciseId=' + competencyExerciseId)
      CompetencyExerciseService.getGeneratedExercise(competencyExerciseId).then(resp => {
        if (resp.status && resp.data) {
          return resp.data
        } else {
          return CompetencyExerciseService.generateAndSaveExercise(req.user ? req.user.id : null).then(resp => {
            if (resp.status && resp.data) {
              // Save generated exercise id to user session
              req.session.competencyExerciseId = resp.data.id
              return resp.data
            } else {
              throw new Error(`Failed to create generatedCompetencyExercise: ${resp.errMessage}`)
            }
          })
        }
      }).then((generatedExercise: GeneratedCompetencyExercise) => {
        const resp2 = CompetencyExerciseService.getExerciseState(generatedExercise)
        if (resp2.status && resp2.data) {
          const state = resp2.data
          console.log('Exercise state=' + state)
          if (state === 'exercising') {
            // Continue to exercise page
            CompetencyExerciseService.continueExercise(generatedExercise).then(resp => {
              if (resp.status && resp.data) {
                const formattedExercise = resp.data
                res.locals.topicName = formattedExercise.topicName
                res.locals.formattedExercises = formattedExercise.formattedExercises
                res.locals.idealTime = formattedExercise.idealTime
                res.locals.elapsedTime = formattedExercise.elapsedTime
                res.locals.bundle = this.competencyExerciseJS
                res.render('competency-exercise/exercising')
              } else {
                throw new Error(`Failed to continue exercise: ${resp.errMessage}`)
              }
            })
          } else if (state === 'pendingExercise') {
            CompetencyExerciseService.getPendingTopicInformation(generatedExercise).then(resp => {
              if (resp.status && resp.data) {
                const topicInformation = resp.data
                res.locals.topicName = topicInformation.topicName
                res.locals.topicNo = topicInformation.topicNo
                res.locals.topicQuantity = topicInformation.topicQuantity
                res.locals.questionQuantity = topicInformation.questionQuantity
                res.locals.idealTime = topicInformation.idealTime
                res.locals.bundle = this.competencyExerciseLogiscticJS
                res.render('competency-exercise/pending')
              } else {
                throw new Error(`Failed to getPendingTopicInformation: ${resp.errMessage}`)
              }
            })
            // Show "Start Exercising" page
          } else if (state === 'finished') {
            // Show submission page here
            // Send email so that we know somebody completes an exercise!
            res.locals.bundle = this.competencyExerciseLogiscticJS
            res.render('competency-exercise/finished')
          } else if (state === 'submitted') {
            CompetencyExerciseService.getSubmittedExerciseInformation(generatedExercise).then(resp => {
              if (resp.status && resp.data) {
                res.locals.topicResults = resp.data
                // Show score here
                res.locals.bundle = this.competencyExerciseLogiscticJS
                res.render('competency-exercise/submitted')
              } else {
                throw new Error(`Failed to get submitted exercise information: ${resp.errMessage}`)
              }
            })
          } else if (state === 'abandoned') {
            res.render('competency-exercise/abandoned')
          } else {
            throw new Error(`Unexpected state: ${state}!`)
          }
        }
      }).catch(err => {
        next(err)
      })
    })

    // Exercise submission
    // TODO: Refactor this onto CompetencyExerciseService
    this.routePost('/', (req, res, next) => {
      const competencyExerciseId = req.session.competencyExerciseId
      CompetencyExerciseService.submitTopicExercise(competencyExerciseId, req.body.userAnswers).then(res.json.bind(res)).catch(next)
    })
  }
}
