import * as Promise from 'bluebird'

import CourseService from '../../services/course-service'
import ExerciseService from '../../services/exercise-service'
import TopicExerciseService from '../../services/topic-exercise-service'
import { json } from 'body-parser';

let path = require('path')

let log = require('npmlog')
let pug = require('pug')

let BaseController = require(path.join(__dirname, 'base-controller'))
let PathFormatter = require(path.join(__dirname, '../../lib/path-formatter'))
let PassportHelper = require(path.join(__dirname, '../utils/passport-helper'))
let Utils = require(path.join(__dirname, '../../lib/utils'))

let ExerciseHelper = require(path.join(__dirname, '../utils/exercise-helper.js'))

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
          console.log(JSON.stringify(resp.data, null, 2))
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
        ExerciseService.getExerciseLeaderboard(topicId).then(resp => {
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

      let totalAnswer = 0
      let totalCorrectAnswer = 0
      let dateCreatedAt
      let isAnswerCorrect: boolean[] = []

      return TopicExerciseService.getGeneratedTopicExercise(userId, topicId).then(resp => {
        if (resp.status && resp.data) {
          const generatedTopicExerciseId = resp.data.id
          dateCreatedAt = resp.data.createdAt
          let exerciseDetail = JSON.parse(resp.data.exerciseDetail)
          // check jawaban secara berurutan
          return TopicExerciseService.checkAnswer(exerciseDetail, userAnswers).then(resp2 => {
            if (resp2.status) {
              resp2.data.forEach((data, index) => {
                if (data.isCorrect) {
                  totalCorrectAnswer++
                }
                isAnswerCorrect.push(data.isCorrect)
              })
              totalAnswer = resp2.data.length

              const timeFinish = ExerciseHelper.countTimeFinish(dateCreatedAt)
              let currentScore = totalCorrectAnswer / totalAnswer * 100

              // Adding userAnswer to existing content from exerciseDetail tobe saved in DB
              let index = 0
              exerciseDetail.forEach((exercise) => {
                JSON.parse(exercise.unknowns).forEach((val) => {
                  exercise.userAnswer.push(userAnswers[index])
                  index++
                })
              })

              return TopicExerciseService.updateGeneratedTopicAnswer(
                generatedTopicExerciseId,
                currentScore,
                timeFinish,
                JSON.stringify(exerciseDetail)
              ).then(resp3 => {
                return { data: resp2.data, timeFinish, currentScore }
              })
            } else {
              throw new Error(resp.errMessage)
            }
          }).then(resultAnswers => {
            /*
            content of resultAnswers
            { data:
               [ { isCorrect: false, userAnswer: '4', unknown: [Object] },
                 { isCorrect: false, userAnswer: '4', unknown: [Object] },
                 { isCorrect: true, userAnswer: '4', unknown: [Object] },
                 { isCorrect: false, userAnswer: '4', unknown: [Object] },
                 { isCorrect: false, userAnswer: '4', unknown: [Object] },
                 { isCorrect: false, userAnswer: '4314', unknown: [Object] },
                 { isCorrect: false, userAnswer: '', unknown: [Object] },
                 { isCorrect: false, userAnswer: '4', unknown: [Object] } ],
              timeFinish: '73437.55',
              currentScore: 100 }
            */
            Promise.join(
              TopicExerciseService.getExerciseStars(userId, topicId),
              TopicExerciseService.getCurrentRanking(resultAnswers.timeFinish, topicId),
              TopicExerciseService.getTotalRanking(topicId),
              TopicExerciseService.getExerciseLeaderboard(topicId),
              TopicExerciseService.getExerciseTimers(userId, topicId)
            ).spread((resp11: NCResponse<any>, resp12: NCResponse<any>, resp13: NCResponse<any>, resp14: NCResponse<any>, resp15: NCResponse<any>) => {
              res.json({
                status: true,
                data: {
                  summaryAnswers: resultAnswers.data,
                  currentScore: resultAnswers.currentScore,
                  starsHTML: resp11.data,
                  timersHTML: resp15.data,
                  ranking: resp14.data,
                  currentTimeFinish: resultAnswers.timeFinish,
                  currentRanking: resp12.data.count,
                  totalRanking: resp13.data.count,
                  isPerfectScore: resultAnswers.currentScore === 100
                }
              })
            })
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
