const path = require('path')
const log = require('npmlog')
const moment = require('moment')
const Promise = require('bluebird')

const BaseController = require(path.join(__dirname, 'base-controller'))

const CourseService = require(path.join(__dirname, '../course-service'))

const ExerciseGenerator = require(path.join(__dirname, '../lib/exercise_generator/exercise-generator'))

class DynamicHostCMSController extends BaseController {
  constructor (initData) {
    initData.logTag = 'FiloseduCMSController'
    super(initData)

    this.addInterceptor((req, res, next) => {
      res.locals.site = req.site
      res.locals.user = req.user
      req.courseService = new CourseService(this.getDb().sequelize, this.getDb().models)
      next()
    })

    this.routeGet('/', (req, res, next) => {
      res.render('index')
    })

    this.routeGet('/get/:model', (req, res, next) => {
      req.courseService.read({modelName: req.params.model, searchClause: req.query}).then(resp => {
        log.verbose(this.getTag(), `/get/${req.params.model}.get(): resp=${JSON.stringify(resp)}`)
        res.json(resp)
      }).catch(err => next(err))
    })

    this.routePost('/add/:model', (req, res, next) => {
      // Path is of format /add/Topic?subjectId=5
      req.courseService.create({modelName: req.params.model, data: Object.assign(req.body, req.query)}).then(resp => {
        res.json(resp)
      }).catch(err => next(err))
    })

    this.routePost('/edit/:model', (req, res, next) => {
      // Path is of format /add/Topic?subjectId=5
      req.courseService.update({modelName: req.params.model, data: req.body}).then(resp => {
        res.json(resp)
      }).catch(err => next(err))
    })

    this.routePost('/delete/:model', (req, res, next) => {
      req.courseService.delete({modelName: req.params.model, data: req.body}).then(resp => {
        res.json(resp)
      }).catch(err => next(err))
    })

    // Controller for Subtopic Detail Page
    // This controller only retrieve the content from DB and parse it into frontend. eg: cms.pug
    this.routeGet('/subtopic/:id', (req, res, next) => {
      const subtopicId = req.params.id

      // Using promise join, because its query 2 place which is to get subtopic and get the question
      // both return data and parse it into JSON, to passing to next process
      Promise.join(
        req.courseService.getSubTopic(req.params.id),
        req.courseService.read({modelName: 'Question', data: {subtopicId: subtopicId}}),
        function (subtopic, question) {
          var resultObject = {}
          if (subtopic.status && question.status) {
            resultObject = {
              status: true,
              subtopic: subtopic.data,
              question: question.data
            }
          } else {
            resultObject = {
              status: true,
              subtopic: subtopic.data
            }
          }
          return resultObject
        }
      ).then(resp => {
        // resultObject get passed here, changed name as 'resp' here
        // we process the data in here, then pass it to frontend cms.pug
        if (resp.question.length > 0) {
          res.locals.question = resp.question
        }

        if (resp.status) {
          res.locals.subtopic_id = subtopicId
          res.locals.subtopic = resp.subtopic.subtopic
          res.locals.description = resp.subtopic.description
          res.locals.data = null
          if (resp.subtopic.data) {
            res.locals.data = JSON.parse(resp.subtopic.data)
          }
        }
        res.render('cms')
      })
    })

    // Controller for submit subtopic
    // In this controller, we do 2 queries at different model. Which is Question and Subtopic.
    // At subtopic, we just updated the data from frontend.
    // this controller focused to model Question, which we must separate them,
    // check whether they have a same duplicate or not, update or create
    this.routePost('/subtopic/submit/:id', (req, res, next) => {
      // This section contain variable declaration which will be used in this controller
      // First, we trying to get specified name from req.body, therefore we use Object.key
      // Then we loop the Object key as many as they have.
      // We search if they match any pattern like 'textcoder' or 'question-'
      const subtopicId = req.params.id
      var index = 0
      var getIdQuestion = []
      var getInput = Object.keys(req.body)
      var getnewQuestionId = []

      // get the ID of question-1
      // get the textcoder temporary ID
      // which we will pass through to front end again
      while (index < getInput.length) {
        if (getInput[index].startsWith('textcoder')) {
          getnewQuestionId.push(getInput[index].split('_')[1])
        }
        if (getInput[index].startsWith('question-')) {
          getIdQuestion.push(getInput[index].split('-')[1])
        }
        index++
      }

      // Section updating subtopic model
      function updateSubtopic () {
        return new Promise((resolve, reject) => {
          req.courseService.updateSubTopic(subtopicId, req.body).then(resp => {
            resolve(resp)
          }).catch(err => {
            reject(err)
          })
        })
      }

      // Section we create new Question, we check if it has any new data. we determine it with .length
      // we also use currentText as parameter to apply the changes in cms.pug when done.
      // The data create new with looping if avaiable
      // resultResp is just a collector of data which return the result as we call it resolve in promise
      function createNewQuestion () {
        return new Promise((resolve, reject) => {
          var resultResp = []
          if (getnewQuestionId.length > 0) {
            index = 0
            while (index < getnewQuestionId.length) {
              var currentText = `textcoder_${getnewQuestionId[index]}`
              var newQuestion = {
                subtopicId: subtopicId,
                data: req.body[`textcoder_${getnewQuestionId[index]}`]
              }

              req.courseService.create({modelName: 'Question', data: newQuestion}).then(resp => {
                // .id .subtopicId .data
                resp.data.dataValues.currentStage = currentText
                resultResp.push(resp)
              }).catch(err => reject(err))
              index++
            }
          }
          resolve(resultResp)
        })
      }

      // Update Question if it already has ID attached
      // we only packaging the updateQuestion include ID, because the model will check them automatically when called.
      // resultUpdated is a collector data which will passed to frontend cms pug
      // It same as create new Question which using iterate.
      function updateCurrentQuestion () {
        return new Promise((resolve, reject) => {
          // check if there's already has ID in it, and iterate them
          var resultUpdated = []
          if (getIdQuestion.length > 0) {
            index = 0
            while (index < getIdQuestion.length) {
              var updateQuestion = {
                id: getIdQuestion[index],
                subtopicId: subtopicId,
                data: req.body[`question-${getIdQuestion[index]}`]
              }

              req.courseService.update({modelName: 'Question', data: updateQuestion}).then(resp => {
                resultUpdated.push(resp)
              }).catch(err => reject(err))
              index++
            }
          }
          resolve(resultUpdated)
        })
      }

      // This is promise that working into 3 task;
      // First one is update the subtopic like detail description and link youtube;
      // Second one is create new question if avaiable
      // Third one is update the question if avaiable
      // All has return like {status:true, data}
      // for subtopic, it has only one return;
      // as for create and update, it has array [{status: true}, {status: true}]
      // which is sending back to front end at cms.pug
      Promise.all([updateSubtopic(), createNewQuestion(), updateCurrentQuestion()]).then(data => {
        res.json(data)
      }).catch(err => {
        next(err)
      })
    })

    this.routePost('/checkcode', (req, res, next) => {
      var valueTextCodeTobeCheck = req.body.text
      var exercise = ExerciseGenerator.getExercise(valueTextCodeTobeCheck)
      var questions = exercise.generateQuestion()
      var temporaryQuestion = []
      questions.forEach(data => {
        temporaryQuestion.push({
          question: exercise._question.printFn({a: data.knowns.a, b: data.knowns.b}),
          answer: data.unknowns.x
        })
      })
      console.log(temporaryQuestion)
      res.json({status: true, data: temporaryQuestion})
    })
  }

  // View path is under [templateName]/app/view
  getViewPath () {
    return this._viewPath
  }

  getDebug () {
    return this._debug
  }

  getSidebar () {
    return [
      {
        title: 'Course Management',
        url: '/course-management',
        faicon: 'fa-dashboard'
      },
      {
        title: 'Dependency Visualizer',
        url: '/dependency-visualizer',
        faicon: 'fa-bar-chart-o',
        children: [
          {title: 'A', url: '/dependency-visualizer/a'},
          {title: 'B', url: '/dependency-visualizer/b'}]
      }
    ]
  }

  setDebug (debug) {
    this._debug = debug
  }
}

module.exports = DynamicHostCMSController
