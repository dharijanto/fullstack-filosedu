import * as Promise from 'bluebird'

import CourseService from '../../services/course-service'
import ExerciseService from '../../services/exercise-service'

let path = require('path')
let log = require('npmlog')

let AnalyticsService = require(path.join(__dirname, '../../services/analytics-service'))
let AppConfig = require(path.join(__dirname, '../../app-config'))
let BaseController = require(path.join(__dirname, 'base-controller'))
let Formatter = require(path.join(__dirname, '../../lib/utils/formatter'))
let PathFormatter = require(path.join(__dirname, '../../lib/path-formatter'))
let PassportHelper = require(path.join(__dirname, '../utils/passport-helper'))
let VideoService = require(path.join(__dirname, '../../services/video-service'))

const TAG = 'SubtopicController'

class SubtopicController extends BaseController {
  constructor (initData) {
    super(initData)
    const videoService = new VideoService(this.getDb().sequelize, this.getDb().models)
    const analyticsService = new AnalyticsService(this.getDb().sequelize, this.getDb().models)

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

    this.routePost('/video/finishedWatching', (req, res, next) => {
      const videoId = req.body.videoId
      const userId = req.user.id
      // We only want to track video watched by user. For those who don't login, we already have analytics service
      if (userId) {
        videoService.addFinishedWatching(videoId, userId).then(resp => {
          res.json(resp)
        }).catch(err => {
          next(err)
        })
      }
    })

    this.routeGet('/:topicId/:topicSlug/:subtopicId/:subtopicSlug', PassportHelper.ensureLoggedIn(), (req, res, next) => {
      let topicId = req.params.topicId
      let subtopicId = req.params.subtopicId
      if (subtopicId) {
        Promise.join<any>(
          CourseService.readOne({ modelName: 'Subtopic', searchClause: { id: subtopicId } }),
          CourseService.read<Exercise>({ modelName: 'Exercise', searchClause: { subtopicId } }),
          CourseService.readOne({ modelName: 'Topic', searchClause: { id: topicId } }),
          videoService.getVideo(subtopicId),
          CourseService.getPreviousAndNextSubtopic(subtopicId)
        ).spread((resp: NCResponse<any>, resp2: NCResponse<any>,
                  resp3: NCResponse<any>, resp4: NCResponse<any>,
                  resp5: NCResponse<any>) => {
          if (resp.status && resp3.status && resp4.status) {
            const subtopic = resp.data
            res.locals.prevLink = resp5.status && resp5.data.prev ? Formatter.getSubtopicURL(resp5.data.prev) : null
            res.locals.nextLink = resp5.status && resp5.data.next ? Formatter.getSubtopicURL(resp5.data.next) : null
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
              return res.render('subtopic')
            } else {
              return Promise.map(res.locals.exercises, (exercise: Exercise, index) => {
                return Promise.join<any>(
                  ExerciseService.getExerciseStars(req.user.id, exercise.id),
                  ExerciseService.getExerciseTimers(req.user.id, exercise.id),
                  (respStars, respTimers) => {
                    log.verbose(TAG, 'subtopic.GET(): star=' + respStars.data.stars)
                    log.verbose(TAG, 'subtopic.GET(): timer=' + respTimers.data.timers)
                    res.locals.exercises[index].stars = respStars.data.stars
                    res.locals.exercises[index].timers = respTimers.data.timers
                  }
                )
              }).then(results => {
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

export = SubtopicController
