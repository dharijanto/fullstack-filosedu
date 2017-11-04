const path = require('path')

var getSlug = require('speakingurl')
var log = require('npmlog')
var Promise = require('bluebird')
var PassportHelper = require('connect-ensure-login')
var passport = require('passport')

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
      res.locals.site = req.site
      res.locals.user = req.user
      res.locals.getSlug = getSlug
      res.locals.loggedIn = req.isAuthenticated()
      log.verbose(TAG, 'loggedIn=' + req.isAuthenticated())
      next()
    })

    this.routeGet('/', (req, res, next) => {
      // TODO: error handling
      courseService.read({modelName: 'Subtopic', searchClause: {}}).then(resp => {
        if (resp.status) {
          res.locals.data = resp.data
        } else {
          res.locals.data = []
        }
        res.render('home')
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
      res.redirect('/')
    })

    this.routePost('/submitlogin', passport.authenticate('app_login', {
      failureRedirect: '/login'
    }), (req, res, next) => {
      res.redirect('/')
    })

    this.routeGet('/logout', (req, res, next) => {
      req.logout()
      res.redirect('/login')
    })

    this.routeGet('/topic/:subtopicSlug', (req, res, next) => {
      // pop() mean get the very last element in array.
      var subtopicId = req.params.subtopicSlug.split('-').pop()
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
        questions: knowns.map(known => exercise.formatQuestion(known)),
        userAnswers: generatedExercise.userAnswer
      }

      localsData.generateExerciseId = generatedExercise.id
      localsData.exerciseId = exerciseId
    }

    // route to get exercise table
    this.routeGet('/topic/:subtopicSlug/:exerciseSlug', PassportHelper.ensureLoggedIn(), (req, res, next) => {
      // pop() means get the very last element in array.
      var exerciseId = req.params.exerciseSlug.split('-').pop()
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

          // TODO: User answer should be array of objects of unknowns
          const userAnswer = req.body.answer // [5,3,1,2,5]
          log.verbose(TAG, `checkAnswer.POST(): userAnswer=${JSON.stringify(userAnswer)}`)
          if (userAnswer.length !== generatedQuestions.length) {
            res.json({status: false, errMessage: 'Number of submitted answers doesn\'t match number of questions!'})
          } else {
            // Flag array identifying which user answer is correct/wrong
            const isAnswerCorrect = []
            // Compute the score of current exercise
            const currentScore = generatedQuestions.reduce((numCorrect, knowns, index) => {
              // TODO: User answer should be array of objects of unknowns
              const unknowns = {x: parseFloat(userAnswer[index])}
              log.verbose(TAG, `checkAnswer.POST(): knowns=${JSON.stringify(knowns)}, unknowns=${JSON.stringify(unknowns)} isAnswer=${exerciseSolver.isAnswer(knowns, unknowns)}`)
              const isCorrect = exerciseSolver.isAnswer(knowns, unknowns)
              isAnswerCorrect.push(isCorrect)
              return isCorrect ? numCorrect + 1 : numCorrect
            }, 0) / parseFloat(generatedQuestions.length) * 100

            // Compute the best score
            const bestScore = submittedExercises.reduce((bestScore, submitedExercise) => {
              return submitedExercise.score > bestScore ? submitedExercise.score : bestScore
            }, 0)

            // TODO: Update current exercise
            courseService.update({
              modelName: 'GeneratedExercise',
              data: {
                id: generatedExercise.id,
                score: currentScore,
                submitted: true}
            }).then(resp => {
              if (resp.status) {
                res.json({
                  status: true,
                  data: {
                    realAnswer: JSON.parse(generatedExercise.unknowns),
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

    //   var generateExerciseId = req.body.generatedExerciseId
    //   var exerciseId = req.body.exerciseId

    //   Promise.join(
    //     courseService.saveAndGetGeneratedExercise(generateExerciseId, JSON.stringify(req.body.answer)),
    //     courseService.read({modelName: 'Exercise', searchClause: {id: exerciseId}}),
    //     function (generatedExerciseData, exerciseData) {
    //       if (generatedExerciseData.status && exerciseData.status) {
    //         var knowns = JSON.parse(generatedExerciseData.data[0].knowns)
    //         var unknowns = JSON.parse(generatedExerciseData.data[0].unknowns)
    //         var userAnswer = JSON.parse(generatedExerciseData.data[0].userAnswer)
    //         var isAnswerCorrect = []
    //         var totalCorrectAnswer = []
    //         var exercise = ExerciseGenerator.getExercise(exerciseData.data[0].data)
    //         var exerciseHash = ExerciseGenerator.getHash(exerciseData.data[0].data)

    //         for (var i = 0; i < knowns.length; i++) {
    //           var answer = exercise._question.isAnswerFn({a: knowns[i].a, b: knowns[i].b}, {x: parseFloat(userAnswer[i])})
    //           isAnswerCorrect.push(answer)
    //         }

    //         totalCorrectAnswer = isAnswerCorrect.filter(v => v).length
    //         var currentScore = ((totalCorrectAnswer / knowns.length) * 100)

    //         // must get the best score from all exercise, with user_id and generate hash and exercise id
    //         var bestScore = currentScore
    //         courseService.update({modelName: 'GeneratedExercise', data: {id: generateExerciseId, score: currentScore}}).then(resp3 => {
    //           courseService.read(
    //             {
    //               modelName: 'GeneratedExercise',
    //               searchClause: {
    //                 userId: req.user.id,
    //                 exerciseHash,
    //                 exerciseId: exerciseData.data[0].id
    //               }
    //             }
    //           ).then(resp2 => {
    //             if (resp2.data) {
    //               resp2.data.forEach(data => {
    //                 if (bestScore < data.score) {
    //                   bestScore = parseInt(data.score)
    //                 }
    //               })
    //             }
    //             res.json({status: true, data: {realAnswer: unknowns, isAnswerCorrect, currentScore, bestScore}})
    //           })
    //         })
    //       } else {
    //         res.json({status: false})
    //       }
    //     }
    //   )
    // })

module.exports = Controller
