const path = require('path')
const BaseController = require(path.join(__dirname, 'base-controller'))
const log = require('npmlog')
const Util = require('util')

const Promise = require('bluebird')

const CourseService = require(path.join(__dirname, '../course-service'))
const Question = require(path.join(__dirname, '../test/unit-test/data/bruteforce-question-1'))
var ExerciseGenerator = require(path.join(__dirname, '../lib/exercise_generator/exercise-generator'))

const TAG = 'FiloseduAppController'

var getSlug = require('speakingurl')

class Controller extends BaseController {
  constructor (initData) {
    super(initData)
    // console.log('initData = ' + Util.inspect(Object.keys(initData.db)))
    this.addInterceptor((req, res, next) => {
      res.locals.site = req.site
      res.locals.user = req.user
      res.locals.getSlug = getSlug
      req.courseService = new CourseService(this.getDb().sequelize, this.getDb().models)
      next()
    })

    this.routeGet('/', (req, res, next) => {
      req.courseService.read({modelName: 'Subtopic', searchClause: {}}).then(resp => {
        if (resp.status) {
          res.locals.data = resp.data
        } else {
          res.locals.data = false
        }
        res.render('home')
      })
    })

    function getYoutubeEmbedURL (url) {
      var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
      var match = url.match(regExp)
      if (match && match[2].length === 11) {
        return match[2]
      } else {
        return 'error'
      }
    }

    this.routeGet('/topic/:subtopicSlug', (req, res, next) => {
      // pop() mean get the very last element in array.
      var subtopicId = req.params.subtopicSlug.split('-').pop()
      if (subtopicId) {
        Promise.join(
          req.courseService.read({modelName: 'Subtopic', searchClause: {id: subtopicId}}),
          req.courseService.read({modelName: 'Exercise', searchClause: {subtopicId}}),
          function (subtopic, exercise) {
            if (subtopic.status) {
              res.locals.data = subtopic.data
              res.locals.embedYoutube = getYoutubeEmbedURL
              if (exercise.status) {
                res.locals.exercise = exercise.data
              } else {
                res.locals.exercise = false
              }
            } else {
              res.locals.data = false
            }
            res.render('subtopic')
          })
      } else {
        res.send('Whoops! 404 Not Found !')
        // TODO : Error Handling
      }
    })

    // route to get exercise table
    this.routeGet('/topic/:subtopicSlug/:exerciseSlug', (req, res, next) => {
      // pop() means get the very last element in array.
      var exerciseId = req.params.exerciseSlug.split('-').pop()

      req.courseService.read({modelName: 'Exercise', searchClause: {id: exerciseId}}).then(resp => {
        var exerciseHash = ExerciseGenerator.getHash(resp.data[0].data)
        var exercise = ExerciseGenerator.getExercise(resp.data[0].data)
        var questions = exercise.generateQuestions()

        var knownsJSON = []
        var unknownsJSON = []
        questions.forEach(question => {
          knownsJSON.push(question.knowns)
          unknownsJSON.push(question.unknowns)
        })

        /**
        Nanti disini isi function check if exerciseHash nya sama / tidak.
          kalau tidak sama, update question dengan hash yang baru;
          kalau sama, jangan lakukan apa".
          kalau belum ada, create yang baru
        **/

        console.log(req)
        // req.courseService.read({
        //   modelName: 'GeneratedExercise',
        //   searchClause: {userId: req.user.id, exerciseHash}
        // }).then(resp2 => {
        //   if (resp2.status) {
        //     // tanda nya exercise hashnya sama, dan tidak terjadi apa"
        //     res.render('question')
        //   } else {
        //     // tanda nya exercise hashnya tidak sama, update dengan hash yang baru
        //   }
        // })

        // lakukan aksi save question ke DB
        req.courseService.create({
          modelName: 'GeneratedExercise',
          data: {
            exerciseHash,
            knowns: JSON.stringify(knownsJSON),
            unknowns: JSON.stringify(unknownsJSON),
            exerciseId
          }
        }).then(resp2 => {
          if (resp2.status) {
            var groupKnowns = JSON.parse(resp2.data.knowns)
            var formatQuestion = []

            groupKnowns.forEach(question => {
              formatQuestion.push(exercise.formatQuestion(question))
            })

            res.locals.questions = formatQuestion
            res.locals.generateExerciseId = resp2.data.id
            res.render('question')
          } else {
            res.send('Whoops, Something went wrong!')
          }
        }).catch(err => {
          console.error(err)
          next(err)
        })
      }).catch(err => {
        next(err)
      })
    })

    this.routePost('/checkAnswer', (req, res, next) => {
      var generateExerciseId = req.body.generatedExerciseId

      req.courseService.saveAndGetGeneratedExercise(generateExerciseId, JSON.stringify(req.body.answer)).then(resp => {
        if (resp.status) {
          var unknowns = JSON.parse(resp.data[0].unknowns)
          var userAnswer = JSON.parse(resp.data[0].userAnswer)
          var correction = []

          for (var i = 0; i < unknowns.length; i++) {
            if (unknowns[i].x === parseInt(userAnswer[i])) {
              correction.push(true)
            } else {
              correction.push(false)
            }
          }
          res.json({status: true, data: {realAnswer: unknowns, correctAnswer: correction}})
        } else {
          res.json({status: false})
        }
      })
    })

    this.getRouter().get('/aljabar2', (req, res, next) => {
      res.render('subtopic2')
    })

    this.getRouter().get('/question', (req, res, next) => {
      /*
        1. Check duplicate
        2. Timeout -> use hard-coded value
        3. knowns kita ga tau brp length-nya, jgn di hardcode
        4. Pindahin ke brute-force generator
      */
      var tampungQuestion = []
      var tampungVariable = []
      var index = 0
      while (index < Question.quantity) {
        var number1 = Question.solver.randomGeneratorFn(Question.knowns[0])
        var number2 = Question.solver.randomGeneratorFn(Question.knowns[1])
        var newQuestion = Question.printFn({a: number1, b: number2})
        tampungVariable[index] = {a: number1, b: number2}
        tampungQuestion[index] = newQuestion
        index++
      }
      req.session.questionVariable = tampungVariable
      req.session.realQuestion = tampungQuestion
      res.locals.question = tampungQuestion
      res.render('question')
    })

    this.routePost('/done', (req, res, next) => {
      // 1. Jangan parseInt, tp jadiin double agar bisa handle decimal jg
      // 2. Untuk komparasi double, cek di google utk javascript
      // 3. a & b jgn di hard-code
      var index = 0
      var checkAnswer = []
      var quizAnswer = []
      while (index < req.session.questionVariable.length) {
        quizAnswer[index] = parseInt(req.body.answer[index])
        checkAnswer[index] = Question.isAnswerFn({a: req.session.questionVariable[index].a, b: req.session.questionVariable[index].b}, {x: quizAnswer[index]})
        index++
      }

      res.locals.question = req.session.realQuestion
      res.locals.answer = quizAnswer
      res.locals.resultAnswer = checkAnswer
      res.render('done')
    })
  }
}

module.exports = Controller
