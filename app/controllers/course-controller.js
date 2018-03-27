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
        if (resp2.status) {
          const exerciseSaved = JSON.parse(resp2.data.exerciseDetail)
          return exerciseService.checkHash(exerciseSaved).then(isSame => {
            if (isSame.status) {
              return exerciseService.getRenderedQuestion(exerciseSaved).then(respRendered => {
                // harus dalam bentuk array dan tipe data
                return respRendered
              })
            } else {
              // create new if hash is false / not same
              const exercises = resp.data
              return Promise.map(exercises, exercise => {
                return exerciseService.generateExercise(exercise)
              }).then(respExercise => {
                var exerciseToBeSaveToDB = []
                respExercise.forEach(content => {
                  // disini kita melakukan simpan dan tampung ke dalam array sebelum di save ke dalam database
                  // knowns menghitung 2 sebagai string dalam '[]'
                  if (content.status && (content.data.exerciseData.knowns).length > 2) {
                    exerciseToBeSaveToDB.push(content.data.exerciseData)
                  } else {
                    // dont know what to do
                  }
                })
                return exerciseService.createGeneratedTopicExercise({
                  submitted: false,
                  exerciseDetail: JSON.stringify(exerciseToBeSaveToDB),
                  topicId,
                  userId
                }).then(respCreate => {
                  return respExercise
                })
              })
            }
          })
        } else {
          if (resp.status) {
            const exercises = resp.data
            return Promise.map(exercises, exercise => {
              return exerciseService.generateExercise(exercise)
            }).then(respExercise => {
              var exerciseToBeSaveToDB = []
              respExercise.forEach(content => {
                // disini kita melakukan simpan dan tampung ke dalam array sebelum di save ke dalam database
                // knowns menghitung 2 sebagai string dalam '[]'
                if (content.status && (content.data.exerciseData.knowns).length > 2) {
                  exerciseToBeSaveToDB.push(content.data.exerciseData)
                } else {
                  // dont know what to do
                }
              })
              return exerciseService.createGeneratedTopicExercise({
                submitted: false,
                exerciseDetail: JSON.stringify(exerciseToBeSaveToDB),
                topicId,
                userId
              }).then(respCreate => {
                return respExercise
              })
            })
          } else {
            next(new Error(resp.errMessage))
          }
        }
      }).then(generatedExercises => {
        /*
        Content of generatedExercises:
        [{
            "status": true,
            "data": {
                "exerciseData": {
                    "knowns": "[{\"a\":2,\"b\":3},{\"a\":1,\"b\":2}]",
                    "unknowns": "[[\"x\"],[\"x\"]]",
                    "exerciseHash": "111753fbfe7ff0c9c59bfe98cb2e61e9",
                    "userAnswer": [],
                    "exerciseId": 26
                },
                "formatted": {
                    "renderedQuestions": ["\n2 + 3 = ?\n", "\n1 + 2 = ?\n"],
                    "unknowns": [
                        ["x"],
                        ["x"]
                    ]
                }
            }
        }]
        */
        const exerciseDatas = []
        const formattedExercises = []
        generatedExercises.forEach(resp => {
          if (resp.status) {
            exerciseDatas.push(resp.data.exerciseData)
            formattedExercises.push(resp.data.formatted)
          } else {
            exerciseDatas.push(null)
            formattedExercises.push(null)
            // Some of the exercise can't be generated
            // TODO: What do we do?
          }
        })

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
