const path = require('path')

const log = require('npmlog')

const AppConfig = require(path.join(__dirname, '../../app-config'))

const BaseController = require(path.join(__dirname, 'base-controller'))
const ImageService = require(path.join(__dirname, '../../services/image-service'))
const PathFormatter = require(path.join(__dirname, '../../lib/path-formatter'))
const StudentMonitorService = require(path.join(__dirname, '../../services/student-monitor-service'))

const TAG = 'StudentMonitorController'
class StudentMonitorController extends BaseController {
  constructor (initData) {
    super(initData)
    const studentMonitorService = new StudentMonitorService(this.getDb().sequelize, this.getDb().models)
    const imageService = new ImageService(this.getDb().sequelize, this.getDb().models)

    this.addInterceptor((req, res, next) => {
      log.verbose(TAG, 'req.path=' + req.path)
      next()
    })

    this.routeGet('/student-monitor', (req, res, next) => {
      res.render('student-monitor')
    })

    this.routeGet('/student-monitor/last-hour-summary', (req, res, next) => {
      const schoolId = req.query.schoolId
      const showAllStudents = req.query.showAllStudents === 'true'
      if (schoolId) {
        studentMonitorService.getLastHourStats(schoolId, showAllStudents).then(resp => {
          res.json(resp)
        }).catch(next)
      } else {
        res.json({status: false, errMessage: 'schoolId is required!'})
      }
    })

    this.routeGet('/student-monitor/last-submissions', (req, res, next) => {
      const userId = req.query.userId
      studentMonitorService.getLastNSubmissions(userId, 30).then(resp => {
        res.json(resp)
      }).catch(next)
    })
  }
}

module.exports = StudentMonitorController
