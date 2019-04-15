import * as Promise from 'bluebird'
import * as log from 'npmlog'
import SequelizeService from '../services/sequelize-service'

import CompetencyExerciseController from './controllers/competency-exercise-controller'
import PassportManager from '../lib/passport-manager'

const path = require('path')

let express = require('express')
let getSlug = require('speakingurl')
let marked = require('marked')
let moment = require('moment-timezone')

let AppConfig = require(path.join(__dirname, '../app-config'))
let BaseController = require(path.join(__dirname, 'controllers/base-controller'))
let CourseController = require(path.join(__dirname, 'controllers/course-controller'))
let CredentialController = require(path.join(__dirname, 'controllers/credential-controller'))
let ExerciseController = require(path.join(__dirname, 'controllers/exercise-controller'))
let SubtopicController = require(path.join(__dirname, 'controllers/subtopic-controller'))
let SyncController = require(path.join(__dirname, 'controllers/sync-controller'))

const TAG = 'FiloseduAppController'

class Controller extends BaseController {
  constructor (initData) {
    super(initData)
    PassportManager.initialize()
    // Since the SQL server is configured to store the date in UTC format, we
    // do everything in UTC as well
    moment.tz.setDefault('UTC')

    this.routeUse((req, res, next) => {
      log.verbose(TAG, 'req.path=' + req.path)
      log.verbose(TAG, 'loggedIn=' + req.isAuthenticated())
      log.verbose(TAG, 'req.on=' + JSON.stringify(req.session))
      log.verbose(TAG, 'req.headers.cookie=' + JSON.stringify(req.headers.cookie))
      res.locals.marked = marked
      res.locals.getSlug = getSlug
      res.locals.site = req.site
      res.locals.user = req.user
      res.locals.loggedIn = req.isAuthenticated()
      res.locals.cloudServer = AppConfig.CLOUD_SERVER

      log.verbose(TAG, 'cloudServer=' + res.locals.cloudServer)
      next()
    })
    SequelizeService.initialize(this.getDb().sequelize, this.getDb().models)

    this.credentialController = new CredentialController(initData)
    this.exerciseController = new ExerciseController(initData)
    this.competencyExerciseController = new CompetencyExerciseController(initData)
    this.courseController = new CourseController(initData)
    this.subtopicController = new SubtopicController(initData)
    this.syncController = new SyncController(initData)

    this.routeUse(AppConfig.VIDEO_MOUNT_PATH, express.static(AppConfig.VIDEO_PATH, { maxAge: '1h' }))
    this.routeUse(AppConfig.IMAGE_MOUNT_PATH, express.static(AppConfig.IMAGE_PATH, { maxAge: '1h' }))
    this.routeUse(this.credentialController.getRouter())
    this.routeUse(this.courseController.getRouter())
    this.routeUse(this.exerciseController.getRouter())
    this.routeUse(this.subtopicController.getRouter())
    this.routeUse(this.syncController.getRouter())
    this.routeUse('/competency-exercise', this.competencyExerciseController.getRouter())
  }

  initialize () {
    return Promise.join(
      this.credentialController.initialize(),
      this.courseController.initialize(),
      this.subtopicController.initialize(),
      this.exerciseController.initialize(),
      this.competencyExerciseController.initialize(),
      this.syncController.initialize()
    )
  }
}

module.exports = Controller
