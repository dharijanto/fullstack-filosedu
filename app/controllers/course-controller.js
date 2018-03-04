var path = require('path')
var log = require('npmlog')
var Promise = require('bluebird')
var marked = require('marked')
var getSlug = require('speakingurl')

var AppConfig = require(path.join(__dirname, '../../app-config'))
var BaseController = require(path.join(__dirname, 'base-controller'))
var CourseService = require(path.join(__dirname, '../../services/course-service'))
var VideoService = require(path.join(__dirname, '../../services/video-service'))

const TAG = 'CourseController'

class CourseController extends BaseController {
  constructor (initData) {
    super(initData)
    const courseService = new CourseService(this.getDb().sequelize, this.getDb().models)
    const videoService = new VideoService(this.getDb().sequelize, this.getDb().models)

    this.addInterceptor((req, res, next) => {
      log.verbose(TAG, 'req.path=' + req.path)
      log.verbose(TAG, 'loggedIn=' + req.isAuthenticated())
      log.verbose(TAG, 'req.on=' + JSON.stringify(req.session))
      res.locals.site = req.site
      res.locals.user = req.user
      res.locals.getSlug = getSlug
      res.locals.marked = marked
      res.locals.activeClass = 'modules'
      res.locals.loggedIn = req.isAuthenticated()
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
  }
}

module.exports = CourseController
