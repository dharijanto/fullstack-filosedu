var path = require('path')

var log = require('npmlog')
var Promise = require('bluebird')
var pug = require('pug')

var BaseController = require(path.join(__dirname, 'base-controller'))
var CourseService = require(path.join(__dirname, '../../services/course-service'))
var ExerciseService = require(path.join(__dirname, '../../services/exercise-service'))
var PathFormatter = require(path.join(__dirname, '../../lib/path-formatter'))

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
          Promise.join(
            Promise.map(res.locals.subtopics, subtopic => {
              return courseService.getSubtopicStar(req.user.id, subtopic.id)
            }),
            Promise.map(res.locals.topics, topic => {
              return exerciseService.getTopicExerciseStars(req.user.id, topic.id)
            })
          ).spread((subtopics, topics) => {
            subtopics.forEach((resp, index) => {
              res.locals.subtopics[index].stars = resp.data.stars
            })

            topics.forEach((resp, index) => {
              res.locals.topics[index].stars = resp.data.stars
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

    this.routeGet('/topics/:topicId/review', (req, res, next) => {
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
        var topicExerciseHash = null
        if (resp3.status) {
          topicExerciseHash = resp3.data.topicExerciseHash
        } else {
          throw new Error(resp3.errMessage)
        }

        if (resp2.status) {
          const generatedExercises = JSON.parse(resp2.data.exerciseDetail)

          // log.verbose(TAG, 'exercise.review.GET: resp4=' + JSON.stringify(resp4))
          if (topicExerciseHash === resp2.data.topicExerciseHash) {
            return exerciseService.formatExercises(generatedExercises).then(resp5 => {
              if (resp5.status) {
                return {formatted: resp5.data.formatted, topicName: resp7.data.topic}
              } else {
                throw new Error(resp5.errMessage)
              }
            })
          } else {
            // Update the exercise if the hash is not valid
            const exercises = resp.data

            return exerciseService.generateExercises(exercises).then(resp5 => {
              if (resp5.status) {
                const generatedExercises = resp5.data.exerciseData
                const formattedExercises = resp5.data.formatted

                return exerciseService.updateGeneratedTopicExercise(resp2.data.id, generatedExercises, topicExerciseHash).then(resp6 => {
                  if (resp6.status) {
                    return {formatted: formattedExercises, topicName: resp7.data.topic}
                  } else {
                    throw new Error(resp6.errMessage)
                  }
                })
              } else {
                throw new Error(resp5.errMessage)
              }
            })
          }
        } else {
          if (resp.status) {
            const exercises = resp.data

            return exerciseService.generateExercises(exercises).then(resp4 => {
              if (resp4.status) {
                const generatedExercises = resp4.data.exerciseData
                const formattedExercises = resp4.data.formatted

                return exerciseService.createGeneratedTopicExercise(topicId, userId, generatedExercises, topicExerciseHash).then(resp5 => {
                  if (resp5.status) {
                    return {formatted: formattedExercises, topicName: resp7.data.topic}
                  } else {
                    throw new Error(resp5.errMessage)
                  }
                })
              } else {
                throw new Error(resp4.errMessage)
              }
            })
          } else {
            next(new Error(resp.errMessage))
          }
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
              ]
          }]
          "topic": {
            id: 1
            topic: "penjumlahan"
          }
        }
        */
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
        getTopicExerciseLeaderboard(topicId).then(resp => {
          res.json(resp)
        }).catch(err => {
          next(err)
        })
      }
    })

    // TODO: move to utils, exercise in topic and subtopic same usage
    function getTopicExerciseStars (userId, topicId) {
      return exerciseService.getTopicExerciseStars(userId, topicId).then(resp => {
        if (resp.status) {
          const stars = resp.data.stars
          const html = pug.renderFile(path.join(__dirname, '../views/non-pages/stars.pug'), {stars})
          return {status: true, data: html}
        } else {
          return (resp)
        }
      })
    }

    // TODO: move to utils, exercise in topic and subtopic same usage
    function getTopicExerciseLeaderboard (topicId) {
      return exerciseService.getExerciseRanking({topicId}).then(resp => {
        if (resp.status) {
          const exerciseData = resp.data
          const html = pug.renderFile(path.join(__dirname, '../views/non-pages/ranking.pug'), {exerciseData})
          return {status: true, data: html}
        } else {
          return (resp)
        }
      })
    }

    this.routePost('/topics/:topicId/review', (req, res, next) => {
      var userAnswers = req.body.userAnswers.split('&')

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
              var pointerIndex = 0
              exerciseDetail.forEach((exercise, index) => {
                JSON.parse(exercise.unknowns).forEach(unknown => {
                  exercise.userAnswer.push({x: userAnswers[pointerIndex].split('=')[1] || ''})
                  pointerIndex++
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
              getTopicExerciseStars(userId, topicId),
              exerciseService.getCurrentRanking(resultAnswers.timeFinish, topicId),
              exerciseService.getTotalRanking(topicId),
              getTopicExerciseLeaderboard(topicId)
            ).spread((resp11, resp12, resp13, resp14) => {
              res.json({
                status: true,
                data: {
                  summaryAnswers: resultAnswers.data,
                  currentScore: resultAnswers.currentScore,
                  starsHTML: resp11.data,
                  ranking: resp14.data,
                  currentTimeFinish: resultAnswers.timeFinish,
                  currentRanking: resp12.data.count,
                  totalRanking: resp13.data.count,
                  isPerfectScore: resultAnswers.currentScore === 100 ? true : false
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
