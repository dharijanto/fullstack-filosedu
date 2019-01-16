import * as Promise from 'bluebird'
import CourseService from '../../services/course-service'
import ExerciseService, { ExerciseAnswer } from '../../services/exercise-service'
import CompetencyExerciseService from '../../services/competency-exercise-service'
import ExerciseGenerator from '../../lib/exercise_generator/exercise-generator'
import ExerciseHelper from '../utils/exercise-helper'
import TopicExerciseService from '../../services/topic-exercise-service'

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

    this.routePost('/start-competency-exercise', (req, res, next) => {
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
            res.json({ status: false, errMessage: `Failed to getGeneratedExercise: ${resp.errMessage}` })
          }
        })
      } else {
        res.json({ status: false, errMessage: `competencyExerciseId is not found! Session expired?`, errCode: 1 })
      }
    })

    this.routeGet('/abandoned-competency-exercise', (req, res, next) => {
      // Delete id from session, so that user can re-take the competency test
      delete req.session['competencyExerciseId']
      res.render('competency-exercise/abandoned')
    })

    this.routePost('/abandon-competency-exercise', (req, res, next) => {
      const competencyExerciseId = req.session.competencyExerciseId || 0
      if (competencyExerciseId) {
        CompetencyExerciseService.getGeneratedExercise(competencyExerciseId).then(resp => {
          if (resp.status && resp.data) {
            return CompetencyExerciseService.abandonExercise(resp.data, req.user ? req.user.id : null).then(resp => {
              if (resp.status) {
                // Delete id from session, so that user can re-take the competency test
                delete req.session['competencyExerciseId']
                res.json({ status: true })
              } else {
                res.json({ status: false, errMessage: `Failed to abandonExercise: ${resp.errMessage}` })
              }
            })
          } else {
            res.json({ status: false, errMessage: `Failed to getGeneratedExercise: ${resp.errMessage}` })
          }
        })
      } else {
        res.json({ status: false, errMessage: `competencyExerciseId is not found! Session expired?`, errCode: 1 })
      }
    })

    this.routeGet('/uji-kompetensi', (req, res, next) => {
      const competencyExerciseId = req.session.competencyExerciseId || 0
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
                res.render('competency-exercise/exercise')
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
          } else if (state === 'submitted') {
            // haha
          } else if (state === 'abandoned') {
            res.redirect('/abandoned-competency-exercise')
            // Show take competency test again here
            // send email so that we know somebody abandons an exercise!
          }
        }
      }).catch(err => {
        next(err)
      })
    })

    // TODO: Refactor this onto CompetencyExerciseService
    this.routePost('/uji-kompetensi', (req, res, next) => {
      const competencyExerciseId = req.session.competencyExerciseId
      CompetencyExerciseService.getGeneratedExercise(competencyExerciseId).then(resp => {
        if (resp.status && resp.data) {
          const generatedExercise = resp.data
          const resp2 = CompetencyExerciseService.getExerciseState(generatedExercise)
          if (resp2.status && resp2.data) {
            const state = resp2.data
            console.log('Exercise state=' + state)
            if (state === 'exercising') {
              const userAnswers = req.body.userAnswers
              const resp3 = CompetencyExerciseService.getGenExerciseWithExercisingState(generatedExercise)
              if (resp3.status && resp3.data) {
                const exerciseDetails = JSON.parse(resp3.data.exerciseDetail) as Partial<GeneratedExercise>[]
                return TopicExerciseService.gradeExercise(exerciseDetails, userAnswers).then(resp2 => {
                  return { status: true }
                })
              } else {
                return { status: false, errMessage: `Failed to get 'exercising' exercise: ${resp3.errMessage}` }
              }
            } else {
              return { status: false, errMessage: `Expecting 'exercising' state, but get '${state}' instead!` }
            }
          } else {
            return { status: false, errMessage: `Failed to getExerciseState: ${resp2.errMessage}` }
          }
        } else {
          return { status: false, errMessage: `Failed to getGeneratedExercise: ${resp.errMessage}` }
        }
      })
    })
  }
}
