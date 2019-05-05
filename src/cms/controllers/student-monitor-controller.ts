import * as path from 'path'

import * as log from 'npmlog'
import SchoolService from '../../services/school-service'
import StudentMonitorService from '../../services/student-monitor-service'

const AppConfig = require(path.join(__dirname, '../../app-config'))

const BaseController = require(path.join(__dirname, 'base-controller'))
const PathFormatter = require(path.join(__dirname, '../../lib/path-formatter'))

const TAG = 'StudentMonitorController'
class StudentMonitorController extends BaseController {
  constructor (initData) {
    super(initData)
    this.addInterceptor((req, res, next) => {
      log.verbose(TAG, 'req.path=' + req.path)
      next()
    })

    this.routeGet('/student-monitor', (req, res, next) => {
      res.render('student-monitor')
    })

    this.routeGet('/student-monitor/schools', (req, res, next) => {
      SchoolService.getAll().then(resp => {
        res.json(resp)
      })
    })

    this.routeGet('/student-monitor/last-hour-subtopic-summary', (req, res, next) => {
      const schoolId = req.query.schoolId
      const showAllStudents = req.query.showAllStudents === 'true'
      if (schoolId) {
        StudentMonitorService.getLastHourSubtopicStats(schoolId, showAllStudents).then(resp => {
          res.json(resp)
        }).catch(next)
      } else {
        res.json({ status: false, errMessage: 'schoolId is required!' })
      }
    })

    this.routeGet('/student-monitor/last-subtopic-submissions', (req, res, next) => {
      const userId = req.query.userId
      StudentMonitorService.getLastNSubtopicSubmissions(userId, 30).then(resp => {
        res.json(resp)
      }).catch(next)
    })

    this.routeGet('/student-monitor/last-topic-submissions', (req, res, next) => {
      const userId = req.query.userId
      StudentMonitorService.getLastNTopicSubmissions(userId, 30).then(resp => {
        res.json(resp)
      }).catch(next)
    })
  }
}

module.exports = StudentMonitorController
