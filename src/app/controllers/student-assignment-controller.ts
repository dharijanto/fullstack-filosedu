import * as Promise from 'bluebird'
import CourseService from '../../services/course-service'
import ExerciseService, { ExerciseAnswer } from '../../services/exercise-service'
import SchoolService from '../../services/school-service'
import StudentMonitorService from '../../services/student-monitor-service'
import userService from '../../services/user-service'

let path = require('path')
let log = require('npmlog')

let AppConfig = require(path.join(__dirname, '../../app-config'))
let AnalyticsService = require(path.join(__dirname, '../../services/analytics-service'))
let BaseController = require(path.join(__dirname, 'base-controller'))
let PassportHelper = require(path.join(__dirname, '../utils/passport-helper'))
let PathFormatter = require(path.join(__dirname, '../../lib/path-formatter'))

let Formatter = require(path.join(__dirname, '../../lib/utils/formatter'))

const TAG = 'StudentAssignmentController'

export default class StudentAssignmentController extends BaseController {
  initialize () {
    return Promise.join(
      PathFormatter.hashAsset('app', '/assets/js/student-assignment-app-bundle.js')
    ).spread((result: string) => {
      this.studentAssignmentJS = result
      return
    })
  }

  constructor (initData) {
    super(initData)

    this.routeGet('/topic-ids', (req, res, next) => {
      return CourseService.getAllTopics().then(resp => {
        let result
        if (resp.status && resp.data) {
          result = {
            status: true,
            data: resp.data.map(topic => {
              return `${topic.id} - ${topic.topicNo}: ${topic.topic}`
            })
          }
        } else {
          result = { status: false, errMessage: resp.errMessage }
        }
        res.json(result)
      }).catch(next)
    })

    this.routeGet('/subtopic-ids', (req, res, next) => {
      return CourseService.getAllSubtopics().then(resp => {
        let result
        if (resp.status && resp.data) {
          result = {
            status: true,
            data: resp.data.map(subtopic => {
              return `${subtopic.id} - ${subtopic?.topic?.topic}: ${subtopic.subtopicNo} - ${subtopic.subtopic}`
            })
          }
        } else {
          result = { status: false, errMessage: resp.errMessage }
        }
        res.json(result)
      }).catch(next)
    })

    this.routeGet('/', (req, res, next) => {
      // TODO: render page with NCInputLibrary
      res.locals.bundle = this.studentAssignmentJS
      res.render('student-dashboard/student-assignment')
    })

    // Summary of all students in the school
    this.routeGet('/students-summary', (req, res, next) => {
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
      const assignment = {
        topicId: Formatter.splitAndRetrieveFirst(req.body['topic.id'], '-') || null,
        subtopicId: Formatter.splitAndRetrieveFirst(req.body['subtopic.id'], '-') || null,
        ...req.body
      }
      StudentMonitorService.addAssignment(userId, assignment).then(resp => {
        res.json(resp)
      }).catch(next)
    })

    this.routePost('/assignment/edit', (req, res, next) => {
      const userId = req.query.userId
      const assignedTaskId = req.body.id
      const assignment = {
        topicId: Formatter.splitAndRetrieveFirst(req.body['topic.id'], '-') || null,
        subtopicId: Formatter.splitAndRetrieveFirst(req.body['subtopic.id'], '-') || null,
        ...req.body
      }
      log.verbose(TAG, 'assignment.edit.GET: assignment=' + JSON.stringify(assignment))
      StudentMonitorService.updateAssignment(userId, assignedTaskId, assignment).then(resp => {
        res.json(resp)
      }).catch(next)
    })

    this.routePost('/assignment/delete', (req, res, next) => {
      const userId = req.query.userId
      const assignedTaskId = req.body.id
      StudentMonitorService.deleteAssignment(userId, assignedTaskId).then(resp => {
        res.json(resp)
      }).catch(next)
    })
  }
}
