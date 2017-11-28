const path = require('path')

var getSlug = require('speakingurl')
var log = require('npmlog')
var Promise = require('bluebird')
var PassportHelper = require(path.join(__dirname, 'utils/passport-helper'))
var passport = require('passport')
var marked = require('marked')

var BaseController = require(path.join(__dirname, 'base-controller'))
var CourseService = require(path.join(__dirname, '../services/course-service'))
var UserService = require(path.join(__dirname, '../services/user-service'))
var ExerciseGenerator = require(path.join(__dirname, '../lib/exercise_generator/exercise-generator'))
var Formatter = require(path.join(__dirname, '../lib/utils/formatter.js'))

const TAG = 'FiloseduAppController'

class Controller extends BaseController {
  constructor (initData) {
    super(initData)

    // const userService = new UserService(this.getDb().sequelize, this.getDb().models)
    const courseService = new CourseService(this.getDb().sequelize, this.getDb().models)
    const userService = new UserService(this.getDb().sequelize, this.getDb().models)

    this.addInterceptor((req, res, next) => {
      log.verbose(TAG, 'req.path=' + req.path)
      log.verbose(TAG, 'loggedIn=' + req.isAuthenticated())
      log.verbose(TAG, 'req.on=' + JSON.stringify(req.session))
      res.locals.site = req.site
      res.locals.user = req.user
      res.locals.getSlug = getSlug
      res.locals.marked = marked
      res.locals.loggedIn = req.isAuthenticated()
      next()
    })

    this.routeGet('/', (req, res, next) => {
      Promise.join(
        courseService.read({modelName: 'Subtopic', searchClause: {}}),
        courseService.read({modelName: 'Topic', searchClause: {}})
      ).spread((subtopicContent, topicContent) => {
        if (topicContent.status && subtopicContent.status) {
          res.locals.subtopics = subtopicContent.data
          res.locals.topics = topicContent.data
        } else {
          res.locals.subtopics = []
          res.locals.topics = []
        }
        res.render('topics')
      }).catch(err => {
        next(err)
      })
    })

    this.routeGet('/login', (req, res, next) => {
      res.locals.error = req.flash('error')
      res.render('login')
    })

    this.routeGet('/register', (req, res, next) => {
      // Used by pre-defined passport 'app_register'
      res.locals.error = req.flash('error')
      res.render('register')
    })

    this.routePost('/register', passport.authenticate('app_register', {
      failureRedirect: '/register',
      failureFlash: true
    }), (req, res, next) => {
      res.redirect(req.session.returnTo || '/')
    })

    this.routePost('/login', passport.authenticate('app_login', {
      failureRedirect: '/login',
      failureFlash: true
    }), (req, res, next) => {
      log.verbose(TAG, 'submitlogin.POST(): redirecting to: ' + req.session.returnTo)
      res.redirect(req.session.returnTo || '/')
    })

    this.routeGet('/logout', PassportHelper.logOut())

    this.routeGet('/:topicId/:topicSlug/:subtopicId/:subtopicSlug', (req, res, next) => {
      var subtopicId = req.params.subtopicId
      if (subtopicId) {
        Promise.join(
          courseService.read({modelName: 'Subtopic', searchClause: {id: subtopicId}}),
          courseService.read({modelName: 'Exercise', searchClause: {subtopicId}})
        ).spread((resp, resp2) => {
          if (resp.status) {
            const subtopic = resp.data[0]
            return courseService.read({modelName: 'Topic', searchClause: {id: subtopic.topicId}}).then(resp3 => {
              res.locals.topic = resp3.data[0]
              res.locals.subtopic = subtopic
              res.locals.embedYoutube = Formatter.getYoutubeEmbedURL
              res.locals.exercises = resp2.data || []
              res.locals.isAuthenticated = req.isAuthenticated()

              // If user isn't logged in, we tell them they need to login/register to
              // access exercise. And when they do, we want to redirect here
              if (!req.isAuthenticated()) {
                req.session.returnTo = req.originalUrl || req.url
                res.render('subtopic')
              } else {
                return Promise.map(res.locals.exercises, exercise => {
                  return userService.getExerciseStar(req.user.id, exercise.id)
                }).then(results => {
                  results.forEach((result, index) => {
                    log.verbose(TAG, 'subtopic.GET(): star=' + result.data.stars)
                    res.locals.exercises[index].stars = result.data.stars
                  })
                  res.render('subtopic')
                })
              }
            })
          } else {
            next() // 404
          }
        }).catch(err => {
          next(err)
        })
      } else {
        next() // 404
      }
    })

    // Helper function: data that are used for exercise view
    function getExerciseData (exercise, generatedExercise, exerciseId) {
      const data = {}
      var knowns = JSON.parse(generatedExercise.knowns)

      data.allQuestion = {
        unknowns: exercise._question.unknowns,
        questions: knowns.map(known => exercise.formatQuestion(known)),
        userAnswers: generatedExercise.userAnswer
      }

      data.generateExerciseId = generatedExercise.id
      data.exerciseId = exerciseId

      return data
    }

    // route to get exercise table
    this.routeGet('/:topicId/:topicSlug/:subtopicId/:subtopicSlug/:exerciseId/:exerciseSlug', PassportHelper.ensureLoggedIn(), (req, res, next) => {
      var exerciseId = req.params.exerciseId
      var subtopicId = req.params.subtopicId
      var topicId = req.params.topicId
      Promise.join(
        courseService.read({modelName: 'Exercise', searchClause: {id: exerciseId}}),
        courseService.read({modelName: 'Subtopic', searchClause: {id: subtopicId}}),
        courseService.read({modelName: 'Topic', searchClause: {id: topicId}})
      ).spread((resp, resp2, resp3) => {
        if (resp.status && resp2.status) {
          var exerciseHash = ExerciseGenerator.getHash(resp.data[0].data)
          var exerciseSolver = ExerciseGenerator.getExerciseSolver(resp.data[0].data)
          res.locals.subtopic = resp2.data[0]
          res.locals.topic = resp3.data[0]

          // Check whether previous exercise has been submitted or not. If submitted,
          // we create new question for student otherwise, restore previous exercise.
          return courseService.read({
            modelName: 'GeneratedExercise',
            searchClause: {
              userId: req.user.id,
              exerciseHash,
              submitted: false
            }
          }).then(resp2 => {
            if (resp2.status) {
              Object.assign(res.locals, getExerciseData(exerciseSolver, resp2.data[0], exerciseId))
              res.render('exercise')
            } else {
              return courseService.createGenerateExercise(
                exerciseHash,
                exerciseSolver.generateQuestions(),
                exerciseId,
                req.user.id
              ).then(resp3 => {
                if (resp3.status) {
                  Object.assign(res.locals, getExerciseData(exerciseSolver, resp3.data, exerciseId))
                  res.render('exercise')
                } else {
                  throw new Error('Cannot create exercise!')
                }
              })
            }
          })
        } else {
          next()
        }
      }).catch(err => {
        next(err)
      })
    })

    this.routePost('/checkAnswer', PassportHelper.ensureLoggedIn(), (req, res, next) => {
      const userId = req.user.id
      const exerciseId = req.body.exerciseId

      log.verbose(TAG, `checkAnswer.POST(): userId=${userId} exerciseId=${exerciseId}`)
      Promise.join(
        courseService.getCurrentExercise({userId, exerciseId}), // Exercise that's currently being graded
        courseService.getSubmittedExercises({userId, exerciseId}),
        courseService.read({modelName: 'Exercise', searchClause: {id: exerciseId}})
      ).spread((geResp, sgeResp, eResp) => {
        if (!geResp.status) {
          log.error(TAG, 'geResp.status=' + geResp.status + ' geResp.errMessage=' + geResp.errMessage)
          res.json({status: false, errMessage: 'Current exercise cannot be found'})
        } else if (!eResp.status) {
          res.json({status: false, errMessage: 'Exercise information be found'})
        } else {
          const generatedExercise = geResp.data[0]
          const generatedQuestions = JSON.parse(generatedExercise.knowns)
          const submittedExercises = sgeResp.status ? sgeResp.data : []
          const exerciseSolver = ExerciseGenerator.getExerciseSolver(eResp.data[0].data)
          const userAnswers = req.body.userAnswers // [{'x': '2', 'y': '3'}, {'x': '1', 'y': '3'}]. This is string based

          log.verbose(TAG, `checkAnswer.POST(): userAnswer=${JSON.stringify(userAnswers)}`)
          if (userAnswers.length !== generatedQuestions.length) {
            res.json({status: false, errMessage: 'Number of submitted answers doesn\'t match number of questions!'})
          } else {
            // Flag array identifying which user answer is correct/wrong
            const isAnswerCorrect = []
            // Compute the score of current exercise
            const currentScore = generatedQuestions.reduce((numCorrect, knowns, index) => {
              const unknowns = userAnswers

              log.verbose(TAG, `checkAnswer.POST(): knowns=${JSON.stringify(knowns)}, unknowns=${JSON.stringify(unknowns[index])} isAnswer=${exerciseSolver.isAnswer(knowns, unknowns[index])}`)
              const isCorrect = exerciseSolver.isAnswer(knowns, unknowns[index])
              isAnswerCorrect.push(isCorrect)
              return isCorrect ? numCorrect + 1 : numCorrect
            }, 0) / parseFloat(generatedQuestions.length) * 100

            // Compute the best score
            const bestScore = submittedExercises.reduce((bestScore, submitedExercise) => {
              return submitedExercise.score > bestScore ? submitedExercise.score : bestScore
            }, 0)

            courseService.update({
              modelName: 'GeneratedExercise',
              data: {
                id: generatedExercise.id,
                score: currentScore,
                userAnswer: JSON.stringify(userAnswers),
                submitted: true}
            }).then(resp => {
              if (resp.status) {
                res.json({
                  status: true,
                  data: {
                    realAnswers: JSON.parse(generatedExercise.unknowns),
                    isAnswerCorrect,
                    currentScore,
                    bestScore
                  }
                })
              } else {
                res.json({status: false, errMessage: 'Failed to save generated exercise'})
              }
            })
          }
        }
      })
    })
  }
}

module.exports = Controller
