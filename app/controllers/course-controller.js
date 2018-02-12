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
      res.locals.loggedIn = req.isAuthenticated()
      next()
    })

    this.routeGet('/', (req, res, next) => {
      Promise.join(
        courseService.read({modelName: 'Subtopic', searchClause: {}}),
        courseService.read({modelName: 'Topic', searchClause: {}})
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

    this.routePost('/video/feedback', (req, res, next) => {
      /*
        We are using number to identifying status
        1 = good
        0 = bad
      */
      var inputValue = parseInt(req.body.value)
      var videoId = parseInt(req.body.videoId)
      var userId = null
      if (req.user) {
        userId = req.user.id
      }

      videoService.addFeedback(videoId, userId, inputValue).then(resp => {
        res.json(resp)
      }).catch(err => {
        next(err)
      })
    })

    this.routeGet('/:topicId/:topicSlug/:subtopicId/:subtopicSlug', (req, res, next) => {
      var topicId = req.params.topicId
      var subtopicId = req.params.subtopicId
      if (subtopicId) {
        Promise.join(
          courseService.readOne({modelName: 'Subtopic', searchClause: {id: subtopicId}}),
          courseService.read({modelName: 'Exercise', searchClause: {subtopicId}}),
          courseService.readOne({modelName: 'Topic', searchClause: {id: topicId}}),
          videoService.getVideo(subtopicId)
        ).spread((resp, resp2, resp3, resp4) => {
          if (resp.status && resp3.status) {
            const subtopic = resp.data
            res.locals.topic = resp3.data
            res.locals.subtopic = subtopic
            // Information about subtopic is stored as JSON in 'data' column
            res.locals.subtopicData = JSON.parse(subtopic.data)
            res.locals.exercises = resp2.data || []
            res.locals.isAuthenticated = req.isAuthenticated()

            // When Filos is cloud-hosted, we use AWS as video source
            if (AppConfig.CLOUD_SERVER) {
              const src = resp4.status && resp4.data.remoteHostedURL
              if (src) {
                res.locals.videoSource =
`<video class="video-js vjs-fluid vjs-default-skin" id="video-player" controls data-setup='{}'>
  <source src="${resp4.data.remoteHostedURL.HD}" type="video/mp4" label="HD" res="720"/>
  <source src="${resp4.data.remoteHostedURL.nonHD}" type="video/mp4" label="SD" res="360"/>
</video>`
              } else {
                res.locals.videoSource = `<div class='text-center text-danger'>Video does not exist</div>`
              }
            } else {
              // Otherwise, we use local copy
              const src = resp4.status && resp4.data.selfHostedURL
              if (src) {
                res.locals.videoSource = `<video class="video-js vjs-fluid" id="video-player" controls data-id="${resp4.data.id}"> <source src=${src}> </video>`
              } else {
                res.locals.videoSource = `<div class='text-center text-danger'>Video does not exist</div>`
              }
            }

            // If user isn't logged in, we tell them they need to login/register to
            // access exercise. And when they do, we want to redirect here
            if (!req.isAuthenticated()) {
              req.session.returnTo = req.originalUrl || req.url
              res.render('subtopic')
            } else {
              return Promise.map(res.locals.exercises, exercise => {
                return courseService.getExerciseStar(req.user.id, exercise.id)
              }).then(results => {
                results.forEach((result, index) => {
                  log.verbose(TAG, 'subtopic.GET(): star=' + result.data.stars)
                  res.locals.exercises[index].stars = result.data.stars
                })
                res.render('subtopic')
              })
            }
            // })
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
