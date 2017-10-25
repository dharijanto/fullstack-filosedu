const path = require('path')
const BaseController = require(path.join(__dirname, 'base-controller'))
const log = require('npmlog')
const Util = require('util')

const CourseService = require(path.join(__dirname, '../course-service'))
const Question = require(path.join(__dirname, '../lib/exercise_generators/bruteforce_template/question1'))

const TAG = 'FiloseduAppController'
class Controller extends BaseController {
  constructor (initData) {
    super(initData)
    // console.log('initData = ' + Util.inspect(Object.keys(initData.db)))
    this.addInterceptor((req, res, next) => {
      res.locals.site = req.site
      res.locals.user = req.user
      req.courseService = new CourseService(this.getDb().sequelize, this.getDb().models)
      next()
    })

    this.routeGet('/', (req, res, next) => {
      req.courseService.read({modelName: 'Subtopic', searchClause: {id: 1}}).then(resp => {
        console.log(resp.data[0].dataValues)
        res.locals.data = resp.data
        // res.send('hello world')
        res.render('subtopic')
      }).catch(err => next(err))
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
