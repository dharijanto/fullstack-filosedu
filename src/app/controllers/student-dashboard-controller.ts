import * as Promise from 'bluebird'
import CourseService from '../../services/course-service'
import ExerciseService, { ExerciseAnswer } from '../../services/exercise-service'
import SchoolService from '../../services/school-service'
import StudentMonitorService from '../../services/student-monitor-service'
import userService from '../../services/user-service';

let path = require('path')

let moment = require('moment-timezone')

let log = require('npmlog')

let AppConfig = require(path.join(__dirname, '../../app-config'))
let AnalyticsService = require(path.join(__dirname, '../../services/analytics-service'))
let BaseController = require(path.join(__dirname, 'base-controller'))
let PassportHelper = require(path.join(__dirname, '../utils/passport-helper'))
let PathFormatter = require(path.join(__dirname, '../../lib/path-formatter'))

let Formatter = require(path.join(__dirname, '../../lib/utils/formatter'))
let Utils = require(path.join(__dirname, '../utils/utils'))

const TAG = 'ExerciseController'

export default class StudentDashboardController extends BaseController {
  private frontendJs: string
  private schoolId: number
  initialize () {
    return Promise.join(
      PathFormatter.hashAsset('app', '/assets/js/student-dashboard-app-bundle.js'),
      SchoolService.getByIdentifier(AppConfig.LOCAL_SCHOOL_INFORMATION.identifier)
    ).spread((result: string, resp: NCResponse<School>) => {
      console.log('blacksoil result =' + result)
      this.frontendJs = result
      if (resp.status && resp.data) {
        this.schoolId = resp.data.id
      } else {
        throw new Error('Failed to get school: ' + resp.errMessage)
      }
      return
    })
  }

  constructor (initData) {
    super(initData)

    this.routeGet('/', (req, res, next) => {
      res.locals.bundle = this.frontendJs
      res.render('student-dashboard')
    })

    this.routeGet('/badge-page', (req, res, next) => {
      const userId = req.query.userId
      userService.getUser(userId, this.schoolId).then(resp => {
        if (resp.status && resp.data) {
          res.locals.user = resp.data
          CourseService.getTopicDetails(userId).then(resp => {
            if (resp.status && resp.data) {
              res.locals.topics = resp.data.topics
              // console.log(JSON.stringify(resp.data, null, 2))
              res.render('topics')
            } else {
              next(new Error('Failed to getTopicDetails(): ' + resp.errMessage))
            }
          })
        } else {
          res.send(`User doesn't exist!`)
        }
      }).catch(err => {
        next(err)
      })
    })

    this.routeGet('/monitor/last-hour-subtopic-summary', (req, res, next) => {
      const showAllStudents = req.query.showAllStudents === 'true'
      if (this.schoolId) {
        StudentMonitorService.getLastHourSubtopicStats(this.schoolId, showAllStudents).then(resp => {
          res.json(resp)
        }).catch(next)
      } else {
        res.json({ status: false, errMessage: 'schoolId is required!' })
      }
    })

    this.routeGet('/monitor/last-subtopic-submissions', (req, res, next) => {
      const userId = req.query.userId
      StudentMonitorService.getLastNSubtopicSubmissions(userId, 30).then(resp => {
        res.json(resp)
      }).catch(next)
    })

    this.routeGet('/monitor/last-topic-submissions', (req, res, next) => {
      const userId = req.query.userId
      StudentMonitorService.getLastNTopicSubmissions(userId, 30).then(resp => {
        res.json(resp)
      }).catch(next)
    })
  }

}
