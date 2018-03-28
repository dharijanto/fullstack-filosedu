var path = require('path')

var log = require('npmlog')
var Promise = require('bluebird')
var pug = require('pug')

var BaseController = require(path.join(__dirname, 'base-controller'))
var CourseService = require(path.join(__dirname, '../../services/course-service'))
var ExerciseService = require(path.join(__dirname, '../../services/exercise-service'))
var ExerciseGenerator = require(path.join(__dirname, '../../lib/exercise_generator/exercise-generator'))
var ExerciseHelper = require(path.join(__dirname, '../utils/exercise-helper'))
var PathFormatter = require(path.join(__dirname, '../../lib/path-formatter'))

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
          return Promise.map(res.locals.subtopics, subtopic => {
            return courseService.getSubtopicStar(req.user.id, subtopic.id)
          }).then(datas => {
            datas.forEach((resp, index) => {
              res.locals.subtopics[index].stars = resp.data.stars
            })
            res.render('topics')
          })
        } else {
          res.locals.subtopics.forEach((subtopic, index) => {
            subtopic.stars = 0
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
        exerciseService.getGeneratedTopicExercise(userId, topicId)
      ).spread((resp, resp2) => {
        // log.verbose(TAG, 'exercise.review.GET: resp=' + JSON.stringify(resp))
        // log.verbose(TAG, 'exercise.review.GET: resp2=' + JSON.stringify(resp2))

        if (resp2.status) {
          const generatedExercises = JSON.parse(resp2.data.exerciseDetail)
          return exerciseService.checkHash(generatedExercises).then(resp3 => {
            // log.verbose(TAG, 'exercise.review.GET: resp3=' + JSON.stringify(resp3))
            if (resp3.status) {
              console.log('ahahahah')
              return exerciseService.formatExercises(generatedExercises).then(resp4 => {
                if (resp4.status) {
                  return resp4.data.formatted
                } else {
                  throw new Error(resp4.errMessage)
                }
              })
            } else {
              // Update the exercise if the hash is not valid
              const exercises = resp.data

              return exerciseService.generateExercises(exercises).then(resp4 => {
                if (resp4.status) {
                  const generatedExercises = resp4.data.exerciseData
                  const formattedExercises = resp4.data.formatted

                  return exerciseService.updateGeneratedTopicExercise(resp2.data.id, generatedExercises).then(resp5 => {
                    if (resp5.status) {
                      return formattedExercises
                    } else {
                      throw new Error(resp5.errMessage)
                    }
                  })
                } else {
                  throw new Error(resp4.errMessage)
                }
              })
            }
          })
        } else {
          if (resp.status) {
            const exercises = resp.data

            return exerciseService.generateExercises(exercises).then(resp4 => {
              if (resp4.status) {
                const generatedExercises = resp4.data.exerciseData
                const formattedExercises = resp4.data.formatted

                return exerciseService.createGeneratedTopicExercise(topicId, userId, generatedExercises).then(resp5 => {
                  if (resp5.status) {
                    return formattedExercises
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
      }).then(formattedExercises => {
        /*
        Content of formattedExercises:
        {
          "formatted": [{
              "renderedQuestions": ["\n2 + 3 = ?\n", "\n1 + 2 = ?\n"],
              "unknowns": [
                  ["x"],
                  ["x"]
              ]
          }]
        }
        */
        log.verbose(TAG, '/topics/:topicId/review.GET: formattedExercises=' + JSON.stringify(formattedExercises))
        res.locals.bundle = this._assetBundle
        res.locals.formattedExercises = formattedExercises
        res.render('topic-exercise')
      }).catch(err => {
        console.error(err)
        next(err)
      })
    })

    function getExerciseStars (userId, exerciseId) {
      return courseService.getExerciseStar(userId, exerciseId).then(resp => {
        if (resp.status) {
          const stars = resp.data.stars
          const html = pug.renderFile(path.join(__dirname, '../views/non-pages/stars.pug'), {stars})
          return {status: true, data: html}
        } else {
          return (resp)
        }
      })
    }

    function getRenderedExercise (exerciseId, timeFinish) {
      return courseService.getRankingExercise({exerciseId, timeFinish}).then(resp => {
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

      var indexPointer = 0
      var totalAnswer = 0
      var totalCorrectAnswer = 0
      var dateCreatedAt
      return exerciseService.getGeneratedTopicExercise(userId, topicId).then(resp => {
        if (resp.status) {
          dateCreatedAt = resp.data.createdAt
          var exerciseDetail = JSON.parse(resp.data.exerciseDetail)
          // check jawaban secara berurutan
          return Promise.map(exerciseDetail, data => {
            var userAnswer = userAnswers[indexPointer].split('=')[1]

            // increment at end of variable means, processing is called first,
            // then increment this indexPointer by 1
            indexPointer++

            return exerciseService.checkAnswer(data.exerciseId, JSON.parse(data.knowns)[0], userAnswer).then(resp => {
              if (resp.data.isCorrect) {
                totalCorrectAnswer++
              }
              totalAnswer++
              return {
                x: userAnswer
              }
            })
          }).then(userAnswers => {
            const timeStart = new Date(dateCreatedAt).getTime()
            const timeSubmit = Date.now()
            const timeFinish = ((timeSubmit - timeStart) / 1000).toFixed(2)

            var currentScore = parseInt((totalCorrectAnswer / totalAnswer) * 100)
            var exerciseDetail = JSON.parse(resp.data.exerciseDetail)
            var i = 0
            exerciseDetail.forEach(exercise => {
              exercise.userAnswer.push({x: userAnswers[i].x})
              i++
            })

            exerciseService.update({
              modelName: 'generatedTopicExercise',
              data: {
                id: resp.data.id,
                submitted: true,
                score: currentScore,
                timeFinish,
                exerciseDetail: JSON.stringify(exerciseDetail)
              }
            }).then(resp => {
              // Promise.join(
              //   getExerciseStars(userId, resp.data.id),
              //   getRenderedExercise(resp.data.id, timeFinish)
              // ).spread((resp4, resp5, resp6, resp7) => {
              // })
              res.json({
                status: true,
                data: {
                  // realAnswers: JSON.parse(generatedExercise.unknowns),
                  // isAnswerCorrect,
                  currentScore,
                  bestScore: 100,
                  // starsHTML: resp2.data,
                  // ranking: resp3.data,
                  currentTimeFinish: timeFinish,
                  currentRanking: 11,
                  totalRanking: 12,
                  isPerfectScore: currentScore === 100 ? true : false
                }
              })
            })
          })
        } else {

        }
      })
    })
  }

  initialize () {
    return new Promise((resolve, reject) => {
      PathFormatter.hashAsset('app', '/assets/js/course-app-bundle.js').then(result => {
        this._assetBundle = result
        resolve()
      }).catch(err => {
        reject(err)
      })
    })
  }
}

module.exports = CourseController
