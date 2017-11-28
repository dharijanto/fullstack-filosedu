var path = require('path')

var log = require('npmlog')
var marked = require('marked')
var getSlug = require('speakingurl')
var Promise = require('bluebird')

var BaseController = require(path.join(__dirname, 'base-controller'))
var CourseService = require(path.join(__dirname, '../../services/course-service'))
var UserService = require(path.join(__dirname, '../../services/user-service'))
var Formatter = require(path.join(__dirname, '../../lib/utils/formatter.js'))

const TAG = 'CredentialController'

class CourseController extends BaseController {
  constructor (initData) {
    super(initData)
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
  }
}

module.exports = CourseController
