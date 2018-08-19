var path = require('path')

var log = require('npmlog')
var Promise = require('bluebird')
var pug = require('pug')

var BaseController = require(path.join(__dirname, 'base-controller'))
var CourseService = require(path.join(__dirname, '../../services/course-service'))
var ExerciseService = require(path.join(__dirname, '../../services/exercise-service'))
var PathFormatter = require(path.join(__dirname, '../../lib/path-formatter'))
var PassportHelper = require(path.join(__dirname, '../utils/passport-helper'))
var Utils = require(path.join(__dirname, '../utils/utils'))

var ExerciseHelper = require(path.join(__dirname, '../utils/exercise-helper.js'))

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
      ).spread((subtopicResp, topicResp) => {
        res.locals.subtopics = subtopicResp.data || []
        res.locals.topics = topicResp.data || []

        if (req.isAuthenticated()) {
          return Promise.join(
            Promise.map(res.locals.subtopics, subtopic => {
              return exerciseService.getSubtopicStar(req.user.id, subtopic.id)
            }),
            Promise.map(res.locals.topics, topic => {
              return exerciseService.getTopicExerciseCheckmark(req.user.id, topic.id)
            }),
            Promise.map(res.locals.subtopics, subtopic => {
              return exerciseService.getSubtopicExerciseTimers(req.user.id, subtopic.id)
            }),
            Promise.map(res.locals.topics, topic => {
              return exerciseService.getTopicExerciseTimer(req.user.id, topic.id, false)
            })
          ).spread((subtopicstars, topicCheckmarks, subtopicTimers, topicTimers) => {
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

            res.render('topics')
          })
        } else {
          res.locals.subtopics.forEach((subtopic, index) => {
            res.locals.subtopics[index].stars = 0
          })
          res.locals.topics.forEach((topic, index) => {
            res.locals.topics[index].stars = 0
          })
          res.render('topics')
        }
      }).catch(err => {
        next(err)
      })
    })

    this.routeGet('/topics/:topicId/:topicSlug/review', PassportHelper.ensureLoggedIn(), (req, res, next) => {
      var topicId = req.params.topicId
      var userId = req.user.id

      Promise.join(
        exerciseService.getTopicExercises(topicId),
        exerciseService.getGeneratedTopicExercise(userId, topicId),
        exerciseService.getTopicExerciseHash(topicId),
        exerciseService.getTopic(topicId)
      ).spread((resp, resp2, resp3, resp7) => {
        // log.verbose(TAG, 'exercise.review.GET: resp=' + JSON.stringify(resp))
        // log.verbose(TAG, 'exercise.review.GET: resp2=' + JSON.stringify(resp2))
        if (resp3.status && resp7.status) {
          const topic = resp7.data
          const topicExerciseHash = resp3.data.topicExerciseHash
          // If there's valid exercise to be restored
          if (resp2.status && resp2.data.topicExerciseHash === topicExerciseHash) {
            const generatedExercises = JSON.parse(resp2.data.exerciseDetail)
            return exerciseService.formatExercises(generatedExercises).then(resp5 => {
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
            return exerciseService.generateExercises(exercises).then(resp5 => {
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
      var topicId = req.params.topicId

      if (topicId === undefined) {
        res.json({status: false, errMessage: `topicId is needed`})
      } else if (!req.isAuthenticated) {
        res.json({status: false, errMessage: `Unauthorized`})
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
      var userAnswers = req.body.userAnswers

      var topicId = req.params.topicId
      var userId = req.user.id
      log.verbose(TAG, `submitAnswer.POST(): userId=${userId} topicId=${topicId} userAnswers=${userAnswers}`)

      var totalAnswer = 0
      var totalCorrectAnswer = 0
      var dateCreatedAt
      var isAnswerCorrect = []

      return exerciseService.getGeneratedTopicExercise(userId, topicId).then(resp => {
        if (resp.status) {
          dateCreatedAt = resp.data.createdAt
          var exerciseDetail = JSON.parse(resp.data.exerciseDetail)
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
              var currentScore = parseInt((totalCorrectAnswer / totalAnswer) * 100)

              // Adding userAnswer to existing content from exerciseDetail tobe saved in DB
              var index = 0
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
                return {data: resp2.data, timeFinish, currentScore}
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
            ).spread((resp11, resp12, resp13, resp14, resp15) => {
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
