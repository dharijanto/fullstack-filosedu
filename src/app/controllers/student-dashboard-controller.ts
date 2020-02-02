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

const TAG = 'ExerciseController'

export default class StudentDashboardController extends BaseController {
  private studentDashboardJS: string
  private studentAssignmentJS: string
  initialize () {
    return Promise.join(
      PathFormatter.hashAsset('app', '/assets/js/student-dashboard-app-bundle.js'),
      PathFormatter.hashAsset('app', '/assets/js/student-assignment-app-bundle.js')
    ).spread((result: string, result2: string) => {
      this.studentDashboardJS = result
      this.studentAssignmentJS = result2
      return
    })
  }

  constructor (initData) {
    super(initData)

    super.addInterceptor((req, res, next) => {
      if (req.user && req.user.teacher) {
        next()
      } else {
        next(new Error(`User ${req.user.username} with no teacher privilege tried to access student dashboard!`))
      }
    })

    this.routeGet('/', (req, res, next) => {
      res.locals.bundle = this.studentDashboardJS
      res.render('student-dashboard/student-dashboard')
    })

    this.routeGet('/badge-page', (req, res, next) => {
      const userId = req.query.userId
      userService.getUser(userId, req.user.schoolId).then(resp => {
        if (resp.status && resp.data) {
          res.locals.user = resp.data
          CourseService.getTopicsWithSubtopicsDetails(userId).then((resp: NCResponse<any>) => {
            if (resp.status && resp.data) {
              res.locals.topics = resp.data.topics
              res.render('student-dashboard/student-overview')
            } else {
              throw new Error(`Failed to get student data: ${resp.errMessage}`)
            }
            console.log(JSON.stringify(resp, null, 2))
          })
        } else {
          throw new Error(`User doesn't exist!`)
        }
      }).catch(err => {
        next(err)
      })
    })

    this.routeGet('/monitor/last-hour-subtopic-summary', (req, res, next) => {
      const showAllStudents = req.query.showAllStudents === 'true'
      const schoolId = req.user.schoolId
      StudentMonitorService.getLastHourSubtopicStats(schoolId, showAllStudents).then(resp => {
        res.json(resp)
      }).catch(next)
    })

    this.routeGet('/monitor/last-subtopic-submissions', (req, res, next) => {
      const userId = req.query.userId
      StudentMonitorService.getLastNSubtopicSubmissions(userId, 150).then(resp => {
        res.json(resp)
      }).catch(next)
    })

    this.routeGet('/monitor/last-topic-submissions', (req, res, next) => {
      const userId = req.query.userId
      StudentMonitorService.getLastNTopicSubmissions(userId, 150).then(resp => {
        res.json(resp)
      }).catch(next)
    })

    this.routeGet('/monitor/num-submissions-within', (req, res, next) => {
      const sinceDate = req.query.sinceDate
      const untilDate = req.query.untilDate
      const schoolId = req.user.schoolId
      StudentMonitorService.getNumSubmissionsSince(sinceDate, untilDate, schoolId).then(resp => {
        res.json(resp)
      }).catch(next)
    })

    this.routeGet('/assignment-management', (req, res, next) => {
      // TODO: render page with NCInputLibrary
      res.locals.bundle = this.studentAssignmentJS
      res.render('student-dashboard/student-assignment')
    })

    // Summary of all students in the school
    this.routeGet('/assignment/students-summary', (req, res, next) => {
      // TODO: Details about students
      const schoolId = req.user.schoolId
      StudentMonitorService.getAssignmentSummary(schoolId).then(resp => {
        res.json(resp)
      }).catch(next)
      /*
        1. Name
        2. Grade
        3. Points
        4. Outstanding assignments
        5. Finished assignments
        6. Latest assignment
      */
    })

    // Detailed assignment for each of the students
    this.routeGet('/assignments', (req, res, next) => {
      const userId = req.query.userId
      StudentMonitorService.getAssignments(userId).then(resp => {
        res.json(resp)
      }).catch(next)
    })

    this.routePost('/assignment', (req, res, next) => {
      const userId = req.query.userId
      const assignment = req.body
      StudentMonitorService.addAssignment(userId, assignment).then(resp => {
        res.json(resp)
      }).catch(next)
    })

    this.routePost('/assignment/edit', (req, res, next) => {
      const userId = req.query.userId
      const assignedTaskId = req.body.id
      StudentMonitorService.addAssignment(userId, assignedTaskId).then(resp => {
        res.json(resp)
      }).catch(next)
    })

    this.routePost('/assignment/delete', (req, res, next) => {
      const userId = req.query.userId
      const assignedTaskId = req.body.id
      StudentMonitorService.addAssignment(userId, assignedTaskId).then(resp => {
        res.json(resp)
      }).catch(next)
    })
  }

}
