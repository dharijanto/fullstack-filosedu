const path = require('path')

var getSlug = require('speakingurl')
var log = require('npmlog')
var Promise = require('bluebird')
var PassportHelper = require(path.join(__dirname, 'utils/passport-helper'))
var passport = require('passport')
var marked = require('marked')

var BaseController = require(path.join(__dirname, 'base-controller'))
var CourseService = require(path.join(__dirname, '../course-service'))
var ExerciseGenerator = require(path.join(__dirname, '../lib/exercise_generator/exercise-generator'))
var Formatter = require(path.join(__dirname, '../lib/utils/formatter.js'))

const TAG = 'FiloseduAppController'

class Controller extends BaseController {
  constructor (initData) {
    super(initData)

    // const userService = new UserService(this.getDb().sequelize, this.getDb().models)
    const courseService = new CourseService(this.getDb().sequelize, this.getDb().models)

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
        res.render('home')
      }).catch(err => {
        next(err)
      })
    })

    this.routeGet('/login', (req, res, next) => {
      res.render('login')
    })

    this.routeGet('/register', (req, res, next) => {
      // Used by pre-defined passport 'app_register'
      res.locals.siteId = req.site.id
      res.render('register')
    })

    this.routePost('/register', passport.authenticate('app_register', {
      failureRedirect: '/register'
    }), (req, res, next) => {
      // Need to wait until user logged state is saved before redirecting to avoid
      // race condition
      req.session.save(() => {
        res.redirect(req.session.returnTo || '/')
      })
    })

    this.routePost('/submitlogin', passport.authenticate('app_login', {
      failureRedirect: '/login'
    }), (req, res, next) => {
      log.verbose(TAG, 'submitlogin.POST(): redirecting to: ' + req.session.returnTo)
      // Need to wait until user logged state is saved before redirecting to avoid
      // race condition
      req.session.save(() => {
        res.redirect(req.session.returnTo || '/')
      })
    })

    this.routeGet('/logout', PassportHelper.logOut())

    this.routeGet('/topic/:subtopicId/:subtopicSlug', (req, res, next) => {
      var subtopicId = req.params.subtopicId
      if (subtopicId) {
        Promise.join(
          courseService.read({modelName: 'Subtopic', searchClause: {id: subtopicId}}),
          courseService.read({modelName: 'Exercise', searchClause: {subtopicId}}),
          (subtopic, exercise) => {
            if (subtopic.status) {
              res.locals.data = subtopic.data
              res.locals.embedYoutube = Formatter.getYoutubeEmbedURL
              res.locals.exercise = exercise.data || []
              res.render('subtopic')
            } else {
              next() // 404
            }
          })
      } else {
        next() // 404
      }
    })

    function displayQuestion (exercise, generatedExercise, exerciseId, localsData) {
      var knowns = JSON.parse(generatedExercise.knowns)

      localsData.allQuestion = {
        unknowns: exercise._question.unknowns,
        questions: knowns.map(known => exercise.formatQuestion(known)),
        userAnswers: generatedExercise.userAnswer
      }

      localsData.generateExerciseId = generatedExercise.id
      localsData.exerciseId = exerciseId
    }

    // route to get exercise table
    this.routeGet('/topic/:subtopicId/:subtopicSlug/:exerciseId/:exerciseSlug', PassportHelper.ensureLoggedIn(), (req, res, next) => {
      var exerciseId = req.params.exerciseId
      courseService.read({modelName: 'Exercise', searchClause: {id: exerciseId}}).then(resp => {
        if (resp.status) {
          var exerciseHash = ExerciseGenerator.getHash(resp.data[0].data)
          var exercise = ExerciseGenerator.getExercise(resp.data[0].data)
          var questions = exercise.generateQuestions()


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
              displayQuestion(exercise, resp2.data[0], exerciseId, res.locals)
              res.render('exercise')
            } else {
              // lakukan aksi save question ke DB
              return courseService.createGenerateExercise(
                exerciseHash,
                questions,
                exerciseId,
                req.user.id
              ).then(resp3 => {
                if (resp3.status) {
                  displayQuestion(exercise, resp3.data, exerciseId, res.locals)
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
          const exerciseSolver = ExerciseGenerator.getExercise(eResp.data[0].data)
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
