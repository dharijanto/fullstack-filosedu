import * as Promise from 'bluebird'
import * as log from 'npmlog'
import SequelizeService from '../services/sequelize-service'

import CompetencyExerciseController from './controllers/competency-exercise-controller'
import StudentDashboardController from './controllers/student-dashboard-controller'
import PassportManager from '../lib/passport-manager'
import SchoolService from '../services/school-service'

const path = require('path')

let express = require('express')
let getSlug = require('speakingurl')
let marked = require('marked')

let AppConfig = require(path.join(__dirname, '../app-config'))
let BaseController = require(path.join(__dirname, 'controllers/base-controller'))
import TopicController from './controllers/topic-controller'
let CredentialController = require(path.join(__dirname, 'controllers/credential-controller'))
import SubtopicExerciseController from './controllers/subtopic-exercise-controller'
let SubtopicController = require(path.join(__dirname, 'controllers/subtopic-controller'))
let PassportHelper = require(path.join(__dirname, 'utils/passport-helper'))

let SyncController = require(path.join(__dirname, 'controllers/sync-controller'))

const TAG = 'FiloseduAppController'

class Controller extends BaseController {
  constructor (initData) {
    super(initData)
    PassportManager.initialize()

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
    this.exerciseController = new SubtopicExerciseController(initData)
    this.competencyExerciseController = new CompetencyExerciseController(initData)
    this.topicController = new TopicController(initData)
    this.subtopicController = new SubtopicController(initData)
    this.syncController = new SyncController(initData)
    this.studentDashboardController = new StudentDashboardController(initData)

    SchoolService.validateSchool().then(resp => {
      if (resp.status) {

        // NOTES: Order does matter because of path with wildcard
        this.routeUse(AppConfig.VIDEO_MOUNT_PATH, express.static(AppConfig.VIDEO_PATH, { maxAge: '1h' }))
        this.routeUse(AppConfig.IMAGE_MOUNT_PATH, express.static(AppConfig.IMAGE_PATH, { maxAge: '1h' }))
        this.routeUse(this.credentialController.getRouter())
        // Non-wildcard controllers
        // NOTE: Controllers with no wildcard need to be declared first
        this.routeUse(this.syncController.getRouter())
        this.routeUse('/student-dashboard', PassportHelper.ensureLoggedIn(), this.studentDashboardController.getRouter())
        // Wildcard controllers
        this.routeUse(this.topicController.getRouter())
        this.routeUse(this.exerciseController.getRouter())
        this.routeUse(this.subtopicController.getRouter())
        this.routeUse('/competency-exercise', this.competencyExerciseController.getRouter())
      } else {
        this.routeUse('*', (req, res, next) => {
          res.status(500).send('Server validation error / has expired. Please contact Filosedu (www.filosedu.com) for support!')
        })
      }
    }).catch(err => {
      this.routeUse('*', (req, res, next) => {
        next(err)
      })
    })
  }

  initialize () {
    return Promise.join(
      this.credentialController.initialize(),
      this.topicController.initialize(),
      this.subtopicController.initialize(),
      this.exerciseController.initialize(),
      this.competencyExerciseController.initialize(),
      this.syncController.initialize(),
      this.studentDashboardController.initialize()
    )
  }
}

module.exports = Controller
