import * as Promise from 'bluebird'

import CourseService from '../../services/course-service'
import ExerciseHelper from '../utils/exercise-helper'
import TopicExerciseService, { GeneratedTopicExerciseDetail } from '../../services/topic-exercise-service'

let path = require('path')

let log = require('npmlog')
let pug = require('pug')

let BaseController = require(path.join(__dirname, 'base-controller'))
let PathFormatter = require(path.join(__dirname, '../../lib/path-formatter'))
let PassportHelper = require(path.join(__dirname, '../utils/passport-helper'))
let Utils = require(path.join(__dirname, '../../lib/utils'))

const TAG = 'CourseController'

class CourseController extends BaseController {
  constructor (initData) {
    super(initData)

    this.addInterceptor((req, res, next) => {
      next()
    })

    this.routeGet('/', (req, res, next) => {
      CourseService.getTopicDetails(req.user ? req.user.id : null).then(resp => {
        if (resp.status && resp.data) {
          res.locals.topics = resp.data.topics
          // console.log(JSON.stringify(resp.data, null, 2))
          res.render('topics')
        } else {
          next(resp.errMessage)
        }
      })
    })

    this.routeGet('/topics/:topicId/:topicSlug/review', PassportHelper.ensureLoggedIn(), (req, res, next) => {
      let topicId = req.params.topicId
      let userId = req.user.id
      TopicExerciseService.getFormattedExercise(topicId, userId).then(resp => {
        if (resp.status && resp.data) {
          res.locals.idealTime = resp.data.idealTime
          res.locals.elapsedTime = resp.data.elapsedTime
          res.locals.topicName = resp.data.topicName
          res.locals.bundle = this._assetBundle
          res.locals.formattedExercises = resp.data.formattedExercises
          res.render('topic-exercise')
        } else {
          next(resp.errMessage)
        }
      }).catch(err => {
        console.error(err)
        next(err)
      })
    })

    this.routeGet('/topics/:topicId/getLeaderboard', (req, res, next) => {
      let topicId = req.params.topicId

      if (topicId === undefined) {
        res.json({ status: false, errMessage: `topicId is needed` })
      } else if (!req.isAuthenticated) {
        res.json({ status: false, errMessage: `Unauthorized` })
      } else {
        TopicExerciseService.getExerciseLeaderboard(topicId).then(resp => {
          res.json(resp)
        }).catch(err => {
          next(err)
        })
      }
    })

    this.routePost('/topics/:topicId/:topicSlug/review', (req, res, next) => {
      // [{"x":"5","y":"1"},{"x":"2","y":"3"},{"x":""},{"x":""},{"x":""},{"x":""},{"x":""},{"x":""},{"x":""},{"x":""},{"x":""},{"x":""}]
      let userAnswers = req.body.userAnswers
      let topicId = req.params.topicId
      let userId = req.user.id
      log.verbose(TAG, `submitAnswer.POST(): userId=${userId} topicId=${topicId} userAnswers=${userAnswers}`)
      return TopicExerciseService.getGeneratedTopicExercise(userId, topicId).then(resp => {
        if (resp.status && resp.data) {
          const generatedTopicExercise = resp.data
          const generatedTopicExerciseId = resp.data.id
          let exerciseDetails: GeneratedTopicExerciseDetail[] = JSON.parse(resp.data.exerciseDetail)
          return TopicExerciseService.gradeExercise(exerciseDetails, userAnswers).then(resp2 => {
            console.log(JSON.stringify(resp2, null, 2))
            if (resp2.status && resp2.data) {
              const grade = resp2.data
              const timeFinish = ExerciseHelper.countTimeFinish(generatedTopicExercise.createdAt)
              return TopicExerciseService.finishExercise(generatedTopicExerciseId, grade.score, timeFinish, exerciseDetails, userAnswers).then(resp3 => {
                if (resp3.status) {
                  Promise.join(
                    TopicExerciseService.getExerciseStars(userId, topicId),
                    TopicExerciseService.getCurrentRanking(timeFinish, topicId),
                    TopicExerciseService.getTotalRanking(topicId),
                    TopicExerciseService.getExerciseLeaderboard(topicId),
                    TopicExerciseService.getExerciseTimers(userId, topicId)
                  ).spread((resp11: NCResponse<any>, resp12: NCResponse<any>, resp13: NCResponse<any>, resp14: NCResponse<any>, resp15: NCResponse<any>) => {
                    res.json({
                      status: true,
                      data: {
                        grade,
                        starsHTML: resp11.data,
                        timersHTML: resp15.data,
                        ranking: resp14.data,
                        timeFinish,
                        currentRanking: resp12.data.count,
                        totalRanking: resp13.data.count
                      }
                    })
                  })
                } else {
                  return res.json({
                    status: false,
                    errMessage: resp3.errMessage
                  })
                }
              })
            } else {
              return res.json({
                status: false,
                errMessage: resp2.errMessage
              })
            }
          })
        } else {
          throw (new Error(resp.errMessage))
        }
      })
    })
  }

  initialize () {
    return new Promise((resolve, reject) => {
      PathFormatter.hashAsset('app', '/assets/js/topic-exercise-app-bundle.js').then(result => {
        this._assetBundle = result
        resolve()
      }).catch(err => {
        reject(err)
      })
    })
  }
}

module.exports = CourseController
