const path = require('path')

var express = require('express')
var getSlug = require('speakingurl')
var log = require('npmlog')
var marked = require('marked')
var moment = require('moment-timezone')
var Promise = require('bluebird')

var AppConfig = require(path.join(__dirname, '../app-config'))
var BaseController = require(path.join(__dirname, 'controllers/base-controller'))
var CourseController = require(path.join(__dirname, 'controllers/course-controller'))
var CredentialController = require(path.join(__dirname, 'controllers/credential-controller'))
var ExerciseController = require(path.join(__dirname, 'controllers/exercise-controller'))
var SubtopicController = require(path.join(__dirname, 'controllers/subtopic-controller'))
var SyncController = require(path.join(__dirname, 'controllers/sync-controller'))
var PassportManager = require(path.join(__dirname, '../lib/passport-manager'))

const TAG = 'FiloseduAppController'

class Controller extends BaseController {
  constructor (initData) {
    super(initData)
    PassportManager.initialize()
    // Since the SQL server is configured to store the date in UTC format, we
    // do everything in UTC as well
    moment.tz.setDefault('UTC')

    this.addInterceptor((req, res, next) => {
      log.verbose(TAG, 'req.path=' + req.path)
      log.verbose(TAG, 'loggedIn=' + req.isAuthenticated())
      log.verbose(TAG, 'req.on=' + JSON.stringify(req.session))
      res.locals.marked = marked
      res.locals.getSlug = getSlug
      res.locals.site = req.site
      res.locals.user = req.user
      res.locals.loggedIn = req.isAuthenticated()
      res.locals.cloudServer = AppConfig.CLOUD_SERVER
      next()
    })

    this.credentialController = new CredentialController(initData)
    this.exerciseController = new ExerciseController(initData)
    this.courseController = new CourseController(initData)
    this.subtopicController = new SubtopicController(initData)
    this.syncController = new SyncController(initData)

    this.routeUse(AppConfig.VIDEO_MOUNT_PATH, express.static(AppConfig.VIDEO_PATH, {maxAge: '1h'}))
    this.routeUse(AppConfig.IMAGE_MOUNT_PATH, express.static(AppConfig.IMAGE_PATH, {maxAge: '1h'}))
    this.routeUse(this.credentialController.getRouter())
    this.routeUse(this.exerciseController.getRouter())
    this.routeUse(this.courseController.getRouter())
    this.routeUse(this.subtopicController.getRouter())
    this.routeUse(this.syncController.getRouter())
  }

  initialize () {
    return Promise.join(
      this.credentialController.initialize(),
      this.courseController.initialize(),
      this.subtopicController.initialize(),
      this.exerciseController.initialize(),
      this.syncController.initialize()
    )
  }
}

module.exports = Controller
