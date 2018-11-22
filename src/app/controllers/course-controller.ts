import * as Promise from 'bluebird'

import ExerciseService from '../../services/exercise-service'
import { NamespaceProperties } from 'aws-sdk/clients/servicediscovery'

let path = require('path')

let log = require('npmlog')
let pug = require('pug')

let BaseController = require(path.join(__dirname, 'base-controller'))
let CourseService = require(path.join(__dirname, '../../services/course-service'))
let PathFormatter = require(path.join(__dirname, '../../lib/path-formatter'))
let PassportHelper = require(path.join(__dirname, '../utils/passport-helper'))
let Utils = require(path.join(__dirname, '../utils/utils'))

let ExerciseHelper = require(path.join(__dirname, '../utils/exercise-helper.js'))

const TAG = 'CourseController'

class CourseController extends BaseController {
  constructor (initData) {
    super(initData)
    const courseService = new CourseService(this.getDb().sequelize, this.getDb().models)
    const exerciseService = new ExerciseService(this.getDb().sequelize, this.getDb().models)

    this.addInterceptor((req, res, next) => {
      next()
    })

    this.routeGet('/', (req, res, next) => {
      Promise.join(
        courseService.getAllSubtopics(),
        courseService.getAllTopics()
      ).spread((subtopicResp: NCResponse<Subtopic[]>, topicResp: NCResponse<Topic[]>) => {
        const subtopics: Subtopic[] = subtopicResp.data || []
        const topics: Topic[] = topicResp.data || []
        res.locals.subtopics = subtopics
        res.locals.topics = topics

        if (req.isAuthenticated()) {
          // TODO: Should do SQL joins on all the following tables
          return Promise.join(
            Promise.map(subtopics, subtopic => {
              return exerciseService.getSubtopicStar(req.user.id, subtopic.id)
            }),
            Promise.map(topics, topic => {
              return exerciseService.getTopicExerciseCheckmark(req.user.id, topic.id)
            }),
            Promise.map(subtopics, subtopic => {
              return exerciseService.getSubtopicExerciseTimers(req.user.id, subtopic.id)
            }),
            Promise.map(topics, topic => {
              return exerciseService.getTopicExerciseTimer(req.user.id, topic.id, false)
            }),
            Promise.map(subtopics, subtopic => {
              return courseService.isSubtopicVideoWatched(subtopic.id, req.user.id)
            })
          ).spread((subtopicstars: Array<NCResponse<any>>, topicCheckmarks: Array<NCResponse<any>>,
                    subtopicTimers: Array<NCResponse<any>>, topicTimers: Array<NCResponse<any>>,
                    subtopicWatchStats: Array<NCResponse<any>>) => {
            log.verbose(TAG, '/: topicCheckmarks=' + JSON.stringify(topicCheckmarks))
            subtopicstars.forEach((resp, index) => {
              res.locals.subtopics[index].stars = resp.data.stars
            })

            topicCheckmarks.forEach((resp, index) => {
              res.locals.topics[index].isChecked = resp.data.isChecked
            })

            subtopicTimers.forEach((resp, index) => {
              res.locals.subtopics[index].timers = resp.data.timers
            })

            topicTimers.forEach((resp, index) => {
              res.locals.topics[index].timers = resp.data.timers
            })

            subtopicWatchStats.forEach((resp, index) => {
              res.locals.subtopics[index].watched = resp.data.watched
            })

            res.render('topics')
          })
        } else {
          res.locals.subtopics.forEach((subtopic, index) => {
            res.locals.subtopics[index].stars = 0
            res.locals.subtopics[index].timers = 0
          })
          res.locals.topics.forEach((topic, index) => {
            res.locals.topics[index].stars = 0
            res.locals.topics[index].timers = 0
          })
          res.render('topics')
        }
      }).catch(err => {
        next(err)
      })
    })

    this.routeGet('/topics/:topicId/:topicSlug/review', PassportHelper.ensureLoggedIn(), (req, res, next) => {
      let topicId = req.params.topicId
      let userId = req.user.id

      Promise.join(
        exerciseService.getTopicExercises(topicId),
        exerciseService.getGeneratedTopicExercise(userId, topicId),
        exerciseService.getTopicExerciseHash(topicId),
        exerciseService.getTopic(topicId)
      ).spread((resp: NCResponse<any>, resp2: NCResponse<any>,
                resp3: NCResponse<any>, resp7: NCResponse<any>) => {
        // log.verbose(TAG, 'exercise.review.GET: resp=' + JSON.stringify(resp))
        // log.verbose(TAG, 'exercise.review.GET: resp2=' + JSON.stringify(resp2))
        if (resp3.status && resp7.status) {
          const topic = resp7.data
          const topicExerciseHash = resp3.data.topicExerciseHash
          // If there's valid exercise to be restored
          if (resp2.status && resp2.data.topicExerciseHash === topicExerciseHash) {
            const generatedExercises = JSON.parse(resp2.data.exerciseDetail)
            return exerciseService.formatExercises(generatedExercises).then((resp5: any) => {
              if (resp5.status) {
                return {
                  formatted: resp5.data.formatted,
                  topicName: resp7.data.topic,
                  idealTime: resp2.data.idealTime,
                  elapsedTime: Utils.getElapsedTime(resp2.data.createdAt)
                }
              } else {
                throw new Error('Could not formatExercise: ' + resp5.errMessage)
              }
            })
          } else if ((resp2.status && resp2.data.topicExerciseHash !== topicExerciseHash) || !resp2.status) {
            // If there's expired generated exercise or no generated exercise to be restored
            const exercises = resp.data
            return exerciseService.generateExercises(exercises).then((resp5: NCResponse<any>) => {
              if (resp5.status) {
                const generatedExercises = resp5.data.exerciseData
                const formattedExercises = resp5.data.formatted
                return exerciseService.saveGeneratedTopicExercise(topicId, req.user.id, generatedExercises, topicExerciseHash, resp5.data.idealTime).then(resp6 => {
                  if (resp6.status) {
                    return {
                      formatted: formattedExercises,
                      topicName: topic.topic,
                      idealTime: resp5.data.idealTime,
                      elapsedTime: Utils.getElapsedTime(resp6.data.createdAt)
                    }
                  } else {
                    throw new Error('Could not saveGeneratedTopicExercise: ' + resp6.errMessage)
                  }
                })
              } else {
                throw new Error('Could not generateExercise: ' + resp5.errMessage)
              }
            })
          } else {
            throw new Error('Unexpected error!')
          }
        } else {
          throw new Error(`Could not retrieve topic or topicExerciseHash for topicId=${topicId}`)
        }
      }).then(formattedContent => {
        /*
        Content of formattedContent:
        {
          "formatted": [{
              "renderedQuestions": ["\n2 + 3 = ?\n", "\n1 + 2 = ?\n"],
              "unknowns": [
                  ["x"],
                  ["x"]
              ],
              "subtopicName": "Penjumlahan Bilangan 1-5"
          }]
          "topic": {
            id: 1
            topic: "penjumlahan"
          },
          "idealTime": 125,
          "subtopicContent": [ArrayofObject]
        }
        */
        res.locals.idealTime = formattedContent.idealTime
        res.locals.elapsedTime = formattedContent.elapsedTime
        res.locals.topicName = formattedContent.topicName
        res.locals.bundle = this._assetBundle
        res.locals.formattedExercises = formattedContent.formatted
        res.render('topic-exercise')
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
        exerciseService.getExerciseLeaderboard(topicId).then(resp => {
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

      return exerciseService.getGeneratedTopicExercise(userId, topicId).then(resp => {
        if (resp.status) {
          dateCreatedAt = resp.data.createdAt
          let exerciseDetail = JSON.parse(resp.data.exerciseDetail)
          // check jawaban secara berurutan
          return exerciseService.checkAnswer(exerciseDetail, userAnswers).then(resp2 => {
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

              return exerciseService.updateGeneratedTopicAnswer(
                resp.data.id,
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
              exerciseService.getTopicExerciseStars(userId, topicId),
              exerciseService.getTopicCurrentRanking(resultAnswers.timeFinish, topicId),
              exerciseService.getTopicTotalRanking(topicId),
              exerciseService.getExerciseLeaderboard(topicId),
              exerciseService.getTopicExerciseTimer(userId, topicId)
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
