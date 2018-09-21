const path = require('path')

var AWS = require('aws-sdk')
const express = require('express')
const log = require('npmlog')

const AppConfig = require(path.join(__dirname, '../app-config'))
const BaseController = require(path.join(__dirname, 'controllers/base-controller'))
const CourseManagementController = require(path.join(__dirname, 'controllers/course-management-controller'))
const AccountManagementController = require(path.join(__dirname, 'controllers/account-management-controller'))
const SchoolManagementController = require(path.join(__dirname, 'controllers/school-management-controller'))
const StudentMonitorController = require(path.join(__dirname, 'controllers/student-monitor-controller'))
const SubtopicController = require(path.join(__dirname, 'controllers/subtopic-controller'))
const SyncController = require(path.join(__dirname, 'controllers/sync-controller'))

class MainController extends BaseController {
  constructor (initData) {
    initData.logTag = 'FiloseduCMSController'
    super(initData)

    this.addInterceptor((req, res, next) => {
      log.verbose(this.getTag(), 'req.path=' + req.path)
      next()
    })

    AWS.config.update({region: AppConfig.AWS_REGION})
    this.routeUse('/videos', express.static(AppConfig.VIDEO_PATH))
    this.routeUse('/images', express.static(AppConfig.IMAGE_PATH))
    this.routeHashlessUse((new AccountManagementController(initData)).getRouter())
    this.routeHashlessUse((new CourseManagementController(initData)).getRouter())
    this.routeHashlessUse((new SchoolManagementController(initData).getRouter()))
    this.routeHashlessUse((new StudentMonitorController(initData).getRouter()))
    this.routeHashlessUse((new SubtopicController(initData)).getRouter())
    this.routeHashlessUse((new SyncController(initData)).getRouter())
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

module.exports = MainController
