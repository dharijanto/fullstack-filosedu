import * as Promise from 'bluebird'

import CourseService from '../../services/course-service'
import ExerciseHelper from '../utils/exercise-helper'
import TopicExerciseService from '../../services/topic-exercise-service'

let path = require('path')

let log = require('npmlog')
let pug = require('pug')

let BaseController = require(path.join(__dirname, 'base-controller'))
let PathFormatter = require(path.join(__dirname, '../../lib/path-formatter'))
let PassportHelper = require(path.join(__dirname, '../utils/passport-helper'))
let Utils = require(path.join(__dirname, '../../lib/utils'))

const TAG = 'CourseController'

// TODO: Should move Topic Exercise-related code to different controller
class CourseController extends BaseController {
  // Since we're caching static files, we need to hash
  // bundled JS so that they're renewed
  // TODO: Better approach is to create pug utlity function
  //       that does the caching there.
  private topicExerciseFrontendJS: string
  constructor (initData) {
    super(initData)

    this.addInterceptor((req, res, next) => {
      log.verbose(TAG, 'req.path=' + req.path)
      next()
    })

    // Landing page
    this.routeGet('/', PassportHelper.ensureLoggedIn(), (req, res, next) => {
      CourseService.getTopicDetails(req.user && req.user.id).then(resp => {
        if (resp.status && resp.data) {
          res.locals.topics = resp.data
          console.log(JSON.stringify(resp.data, null, 2))
          res.render('topics')
        } else {
          next(new Error('Failed to getTopicDetails(): ' + resp.errMessage))
        }
      })
    })

    this.routeGet('/:topicId/penjumlahan', (req, res, next) => {

    })

    // TopicExercise leaderboard
    this.routeGet('/topics/:topicId/getLeaderboard', (req, res, next) => {
      let topicId = req.params.topicId
      if (topicId === undefined) {
        res.json({ status: false, errMessage: `topicId is needed` })
      } else if (!req.isAuthenticated) {
        res.json({ status: false, errMessage: `Unauthorized` })
      } else {
        TopicExerciseService.getRenderedLeaderboard(topicId).then(resp => {
          res.json(resp)
        }).catch(err => {
          next(err)
        })
      }
    })

    // Topic Exercise
    this.routeGet('/:topicId/:topicSlug/review', PassportHelper.ensureLoggedIn(), (req, res, next) => {
      let topicId = req.params.topicId
      let userId = req.user.id

      Promise.join<NCResponse<any>>(
        TopicExerciseService.getFormattedExercise(topicId, userId),
        TopicExerciseService.getRenderedStarBadges(userId, topicId),
        TopicExerciseService.getRenderedCheckmark(userId, topicId)
      ).spread((resp, resp2, resp3) => {
        if (resp.status && resp.data && resp2.status && resp2.data && resp3.status && resp3.data) {
          res.locals.starsHTML = resp2.data
          res.locals.checkmarkHTML = resp3.data
          res.locals.idealTime = resp.data.idealTime
          res.locals.elapsedTime = resp.data.elapsedTime
          res.locals.topicName = resp.data.topicName
          res.locals.bundle = this.topicExerciseFrontendJS
          res.locals.formattedExercises = resp.data.formattedExercises
          res.render('topic-exercise')
        } else {
          next(resp.errMessage)
        }
      }).catch(err => {
        next(err)
      })
    })

    // TopicExercise submission
    // TODO: Perhaps we should call getGeneratedTopicExercise and gradeExercise inside of finishExercise to make
    //       the code cleaner?
    this.routePost('/:topicId/:topicSlug/review', (req, res, next) => {
      // [{"x":"5","y":"1"},{"x":"2","y":"3"},{"x":""},{"x":""},{"x":""},{"x":""},{"x":""},{"x":""},{"x":""},{"x":""},{"x":""},{"x":""}]
      let userAnswers = req.body.userAnswers
      let topicId = req.params.topicId
      let userId = req.user.id
      log.verbose(TAG, `submitAnswer.POST(): userId=${userId} topicId=${topicId} userAnswers=${userAnswers}`)
      return TopicExerciseService.getGeneratedTopicExercise(userId, topicId).then(resp => {
        if (resp.status && resp.data) {
          const generatedTopicExercise = resp.data
          const generatedTopicExerciseId = resp.data.id
          let exerciseDetails: Partial<GeneratedExercise>[] = JSON.parse(resp.data.exerciseDetail)
          return TopicExerciseService.gradeExercise(exerciseDetails, userAnswers).then(resp2 => {
            // console.log(JSON.stringify(resp2, null, 2))
            if (resp2.status && resp2.data) {
              const grade = resp2.data
              const timeFinish = ExerciseHelper.countTimeFinish(generatedTopicExercise.createdAt)
              return TopicExerciseService.finishExercise(
                generatedTopicExerciseId, grade.score,
                timeFinish, exerciseDetails, userAnswers
              ).then(resp3 => {
                if (resp3.status) {
                  Promise.join(
                    TopicExerciseService.getRenderedStarBadges(userId, topicId),
                    TopicExerciseService.getCurrentRanking(timeFinish, topicId),
                    TopicExerciseService.getTotalRanking(topicId),
                    TopicExerciseService.getRenderedLeaderboard(topicId),
                    TopicExerciseService.getRenderedCheckmark(userId, topicId)
                  ).spread((
                    resp11: NCResponse<any>, resp12: NCResponse<any>,
                    resp13: NCResponse<any>, resp14: NCResponse<any>,
                    resp15: NCResponse<any>
                  ) => {

                    if (resp11.status && resp11.data && resp12.status &&
                        resp12.data && resp13.status && resp13.data &&
                        resp14.status && resp14.data && resp15.status&& resp15.data) {
                      res.json({
                        status: true,
                        data: {
                          grade,
                          starsHTML: resp11.data,
                          checkmarkHTML: resp15.data,
                          ranking: resp14.data,
                          timeFinish,
                          currentRanking: resp12.data.count,
                          totalRanking: resp13.data.count
                        }
                      })
                    } else {
                      res.json({ status: false, errMessage: resp11.errMessage || resp12.errMessage
                        || resp13.errMessage || resp14.errMessage || resp15.errMessage })
                    }
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
        this.topicExerciseFrontendJS = result
        resolve()
      }).catch(err => {
        reject(err)
      })
    })
  }
}

module.exports = CourseController
