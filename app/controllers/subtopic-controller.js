var path = require('path')
var log = require('npmlog')
var Promise = require('bluebird')

var AnalyticsService = require(path.join(__dirname, '../../services/analytics-service'))
var AppConfig = require(path.join(__dirname, '../../app-config'))
var BaseController = require(path.join(__dirname, 'base-controller'))
var CourseService = require(path.join(__dirname, '../../services/course-service'))
var ExerciseService = require(path.join(__dirname, '../../services/exercise-service'))
var PathFormatter = require(path.join(__dirname, '../../lib/path-formatter'))
var VideoService = require(path.join(__dirname, '../../services/video-service'))

const TAG = 'SubtopicController'

class SubtopicController extends BaseController {
  constructor (initData) {
    super(initData)
    const courseService = new CourseService(this.getDb().sequelize, this.getDb().models)
    const videoService = new VideoService(this.getDb().sequelize, this.getDb().models)
    const analyticsService = new AnalyticsService(this.getDb().sequelize, this.getDb().models)
    const exerciseService = new ExerciseService(this.getDb().sequelize, this.getDb().models)

    this.addInterceptor((req, res, next) => {
      next()
    })

    this.routePost('/video/analytics', (req, res, next) => {
      // Event type
      const key = req.body.key
      const videoId = req.body.videoId
      const userId = (req.user && req.user.id) || -1
      const value = req.body.value
      analyticsService.addVideoData(key, value, videoId, userId).then(resp => {
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
          if (resp.status && resp3.status && resp4.status) {
            const subtopic = resp.data
            res.locals.topic = resp3.data
            res.locals.subtopic = subtopic
            // Information about subtopic is stored as JSON in 'data' column
            res.locals.subtopicData = JSON.parse(subtopic.data)
            res.locals.exercises = resp2.data || []
            res.locals.isAuthenticated = req.isAuthenticated()
            res.locals.bundle = this._assetBundle
            log.verbose(TAG, 'subtopic.GET(): resp4=' + JSON.stringify(resp4))
            const videoTag = `<video class="video-js vjs-fluid vjs-default-skin vjs-big-play-centered" id="video-player" data-id=${resp4.data.id} controls data-setup='{}'>`
            const missingVideo = `<div class='text-center text-danger'>Video does not exist</div>`
            // When Filos is cloud-hosted, we use AWS as video source
            if (AppConfig.CLOUD_SERVER) {
              const src = resp4.status && resp4.data.remoteHostedURL
              if (src) {
                res.locals.videoSource =
`${videoTag}
  <source src="${resp4.data.remoteHostedURL.HD}" type="video/mp4" label="HD" res="720"/>
  <source src="${resp4.data.remoteHostedURL.nonHD}" type="video/mp4" label="SD" res="360"/>
</video>`
              } else {
                res.locals.videoSource = missingVideo
              }
            } else {
              // Otherwise, we use local copy
              const src = resp4.status && resp4.data.selfHostedURL
              if (src) {
                res.locals.videoSource = `${videoTag}<source src=${src}></video>`
              } else {
                res.locals.videoSource = missingVideo
              }
            }

            // If user isn't logged in, we tell them they need to login/register to
            // access exercise. And when they do, we want to redirect here
            if (!req.isAuthenticated()) {
              req.session.returnTo = req.originalUrl || req.url
              res.render('subtopic')
            } else {
              return Promise.map(res.locals.exercises, exercise => {
                return exerciseService.getExerciseStars(req.user.id, exercise.id, false, false)
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

  initialize () {
    return new Promise((resolve, reject) => {
      PathFormatter.hashAsset('app', '/assets/js/subtopic-app-bundle.js').then(result => {
        this._assetBundle = result
        resolve()
      }).catch(err => {
        reject(err)
      })
    })
  }
}

module.exports = SubtopicController
