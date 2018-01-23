const path = require('path')

var express = require('express')
var log = require('npmlog')

var AppConfig = require(path.join(__dirname, '../app-config'))
var BaseController = require(path.join(__dirname, 'controllers/base-controller'))
var CourseController = require(path.join(__dirname, 'controllers/course-controller'))
var CredentialController = require(path.join(__dirname, 'controllers/credential-controller'))
var ExerciseController = require(path.join(__dirname, 'controllers/exercise-controller'))

const TAG = 'FiloseduAppController'

class Controller extends BaseController {
  constructor (initData) {
    super(initData)

    this.addInterceptor((req, res, next) => {
      log.verbose(TAG, 'req.path=' + req.path)
      log.verbose(TAG, 'loggedIn=' + req.isAuthenticated())
      log.verbose(TAG, 'req.on=' + JSON.stringify(req.session))
      next()
    })

    // Mount video path
    this.routeUse(AppConfig.VIDEO_MOUNT_PATH, express.static(AppConfig.VIDEO_PATH))
    this.routeUse((new CredentialController(initData)).getRouter())
    this.routeUse((new ExerciseController(initData)).getRouter())
    this.routeUse((new CourseController(initData)).getRouter())
  }
}

module.exports = Controller
