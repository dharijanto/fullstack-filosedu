import * as path from 'path'

import * as Promise from 'bluebird'
import * as Sequelize from 'sequelize'

const moment = require('moment-timezone')

const AppConfig = require(path.join(__dirname, '../app-config'))
import CRUDService from './crud-service-neo'

const TAG = 'StudentMonitorService'

// TODO: Separate out student monitor from student assignment
class StudentMonitorService extends CRUDService {
  getSubtopicStats (schoolId, generatedExercisesWhereClause, showAllStudents): Promise<NCResponse<any>> {
    if (!schoolId) {
      return Promise.resolve({ status: false, errMessage: 'schoolId is required!' })
    } else {
      const query = `
SELECT
  users.id AS userId, users.fullName AS name, users.username as username, users.grade as grade,
  IFNULL(summarizedGeneratedExercises.submissions, '-') as submissions,
  IFNULL(summarizedGeneratedExercises.avgScore, '-') as avgScore,
  IFNULL(summarizedGeneratedExercises.avgTimeliness, '-') as avgTimeliness,
  lastSubtopic.subtopic as lastSubtopic,
  lastSubtopic.topic as lastTopic
FROM
  (SELECT users.id as id, users.username as username, users.fullName as fullName, users.grade as grade
    FROM users
    INNER JOIN schools ON users.schoolId = schools.id
    WHERE schools.id = "${schoolId}"
  ) AS users
# Summarize generated exercises
LEFT OUTER JOIN
  (SELECT
      userId,
      COUNT(*) AS submissions,
      ROUND(AVG(generatedExercises.score), 2) AS avgScore,
      ROUND(AVG(generatedExercises.timeFinish/generatedExercises.idealTime*100.0), 2) AS avgTimeliness
    FROM generatedExercises
    WHERE idealTime > 0 AND submitted = TRUE AND timeFinish < 3600 ${generatedExercisesWhereClause}
    GROUP BY userId
  ) AS summarizedGeneratedExercises ON summarizedGeneratedExercises.userId = users.id
# Information about highest exercise a student had done
LEFT OUTER JOIN
  (SELECT generatedExercises.userId AS userId, MAX(id) AS id
    FROM generatedExercises
    INNER JOIN
      (SELECT userId, MAX(updatedAt) AS updatedAt
       FROM generatedExercises
       WHERE submitted = true
       GROUP BY userId
      ) lastUpdated ON lastUpdated.userId = generatedExercises.userId and lastUpdated.updatedAt = generatedExercises.updatedAt
    WHERE submitted = true
    GROUP BY generatedExercises.userId
  ) AS lastGeneratedExercises ON lastGeneratedExercises.userId = users.id
# Map generatedExercise to subtopic
LEFT OUTER JOIN
  (SELECT generatedExercises.id as exerciseId, subtopics.subtopic as subtopic, topics.topic as topic
    FROM exercises
    INNER JOIN generatedExercises on generatedExercises.exerciseId = exercises.id
    INNER JOIN subtopics ON exercises.subtopicId = subtopics.id
    INNER JOIN topics ON subtopics.topicId = topics.id) AS lastSubtopic ON lastGeneratedExercises.id = lastSubtopic.exerciseId
${showAllStudents ? '' : 'WHERE submissions > 0'}
ORDER BY summarizedGeneratedExercises.avgTimeliness DESC
;
`
      return super.getSequelize().query(query, { type: Sequelize.QueryTypes.SELECT }).then(resp => {
        return { status: true, data: resp }
      })
    }
  }

  // showAllStudents: if true, students without submissions will also be displayed
  getLastHourSubtopicStats (schoolId, showAllStudents) {
    const past1Hour = moment().subtract(1, 'hour').format('YYYY-MM-DD HH:mm:ss')
    return this.getSubtopicStats(schoolId, `AND updatedAt >= "${past1Hour}"`, showAllStudents)
  }

  getLastNSubtopicSubmissions (userId, N = 10) {
    const query = `
SELECT users.id AS userId, users.fullName AS fullName,
  ROUND(lastGeneratedExercises.timeFinish / lastGeneratedExercises.idealTime * 100.0, 2) AS timeliness,
  lastGeneratedExercises.idealTime as idealTime,
  lastGeneratedExercises.timeFinish as timeFinish,
  lastGeneratedExercises.score AS score,
  lastGeneratedExercises.updatedAt AS updatedAt,
  topics.topic AS topic,
  subtopics.subtopic AS subtopic
FROM
  (SELECT * FROM generatedExercises WHERE userId = ${userId} AND submitted = TRUE ORDER BY updatedAt DESC LIMIT ${N}) AS lastGeneratedExercises
  INNER JOIN users ON lastGeneratedExercises.userId = users.id
  INNER JOIN exercises ON lastGeneratedExercises.exerciseId = exercises.id
  INNER JOIN subtopics ON exercises.subtopicId = subtopics.id
  INNER JOIN topics ON subtopics.topicId = topics.id
`

    return super.getSequelize().query(query, { type: Sequelize.QueryTypes.SELECT }).then(resp => {
      return { status: true, data: resp }
    })
  }

  getLastNTopicSubmissions (userId, N = 10) {
    const query = `
SELECT users.id AS userId, users.fullName AS fullName,
  ROUND(lastGeneratedTopicExercises.timeFinish / lastGeneratedTopicExercises.idealTime * 100.0, 2) AS timeliness,
  lastGeneratedTopicExercises.idealTime as idealTime,
  lastGeneratedTopicExercises.timeFinish as timeFinish,
  lastGeneratedTopicExercises.score AS score,
  lastGeneratedTopicExercises.updatedAt AS updatedAt,
  topics.topic AS topic
FROM
  (
    SELECT * FROM generatedTopicExercises
    WHERE userId = ${userId} AND submitted = TRUE
    ORDER BY updatedAt DESC LIMIT ${N}
  ) AS lastGeneratedTopicExercises
  INNER JOIN users ON lastGeneratedTopicExercises.userId = users.id
  INNER JOIN topics ON topics.id = lastGeneratedTopicExercises.topicId
`

    return super.getSequelize().query(query, { type: Sequelize.QueryTypes.SELECT }).then(resp => {
      return { status: true, data: resp }
    })
  }

  getNumSubmissionsSince (sinceDate, untilDate, schoolId): Promise<NCResponse<any>> {
    if (!sinceDate || !untilDate || !schoolId) {
      return Promise.resolve({ status: false, errMessage: 'sinceDate and schoolId are required!' })
    } else {
      const query = `
        SELECT users.fullName AS fullName, userId AS userId, count(*) AS numSubmissions, MAX(generatedExercises.updatedAt) AS lastUpdate
        FROM generatedExercises
        INNER JOIN users ON users.id = userId AND users.schoolId = ${schoolId}
        WHERE generatedExercises.updatedAt > "${sinceDate} 00:00:00" AND generatedExercises.updatedAt <= "${untilDate} 00:00:00"
        GROUP BY userId;`

      return super.getSequelize().query(query, { type: Sequelize.QueryTypes.SELECT }).then(resp => {
        return { status: true, data: resp }
      })
    }
  }

  getAssignmentSummary (schoolId: number) {
    return super.rawReadQuery(`SELECT * FROM assignmentSummaryView WHERE schoolId = ${schoolId}`)
  }

  getAssignments (userId: number) {
    return super.rawReadQuery(`SELECT * FROM assignmentsView WHERE userId = ${userId}`, true)
  }

  addAssignment (userId: number, assignedTask: Partial<AssignedTask>): Promise<NCResponse<AssignedTask>> {
    if (!userId || !assignedTask) {
      return Promise.resolve({ status: false, errMessage: 'userId and task are required!' })
    } else if (!assignedTask.due) {
      return Promise.resolve({ status: false, errMessage: 'due date is required!' })
    } else if (assignedTask.subtopicId && assignedTask.topicId) {
      return Promise.resolve({ status: false, errMessage: 'Select either subtopic or topic, not both!' })
    } else if (!assignedTask.subtopicId && !assignedTask.topicId) {
      return Promise.resolve({ status: false, errMessage: 'Either subtopic or topic needs to be selected!' })
    }

    const searchClause = { userId }
    if (assignedTask.subtopicId) {
      searchClause['subtopicId'] = assignedTask.subtopicId
    } else if (assignedTask.topicId) {
      searchClause['topicId'] = assignedTask.topicId
    }

    return super.readOne<AssignedTask>({
      modelName: 'AssignedTask',
      searchClause: searchClause
    }).then(resp => {
      if (resp.status) {
        // console.log(JSON.stringify(resp))
        return { status: false, errMessage: 'Assignment with the same topic or subtopic already exists' }
      } else {
        return super.create<AssignedTask>({
          modelName: 'AssignedTask',
          data: { userId, ...assignedTask, ...{ starsCompleted: 'no', timersCompleted: 'no', points: 0 } }
        })
      }
    })
  }

  updateAssignment (userId: number, assignedTaskId: number, assignedTask: Partial<AssignedTask>): Promise<NCResponse<number>> {
    const topicId = assignedTask.topicId
    const subtopicId = assignedTask.subtopicId

    if (!userId || !assignedTaskId) {
      return Promise.resolve({ status: false, errMessage: 'userId and assignedTaskId are required!' })
    } else if (!assignedTask.due) {
      return Promise.resolve({ status: false, errMessage: 'due date is required!' })
    } else if (subtopicId && topicId) {
      return Promise.resolve({ status: false, errMessage: 'Select either subtopic or topic, not both!' })
    }/*  else if (!assignedTask.subtopicId && !assignedTask.topicId) {
      return Promise.resolve({ status: false, errMessage: 'Either subtopic or topic needs to be selected!' })
    } */

    return super.readOne<AssignedTask>({
      modelName: 'AssignedTask',
      searchClause: { userId, id: assignedTaskId }
    }).then(resp => {
      if (resp.status && resp.data) {
        if (resp.data.starsCompleted !== 'no') {
          return { status: false, errMessage: 'An assignment that has been completed cannot be updated!' }
        } else {
          // If subtopicId or topicId is specified, we need to make sure
          // there's not already the same assignment
          if (subtopicId || topicId) {
            // Check if there's already
            return super.readOne<AssignedTask>({
              modelName: 'AssignedTask',
              searchClause: Object.assign({ userId }, topicId && { topicId }, subtopicId && { subtopicId })
            }).then(resp => {
              if (resp.status) {
                return { status: false, errMessage: 'The same subtopic or topic is already assigned!' }
              } else {
                return { status: true }
              }
            })
          } else {
            return { status: true }
          }
        }
      } else {
        return { status: false, errMessage: 'Assignment could not be found!' }
      }
    }).then(resp => {
      if (resp.status) {
        const data = Object.assign({
          id: assignedTaskId,
          userId,
          due: assignedTask.due
        },
          // Ignore potentially empty topicId and subtopicId, which means user doesn't wanna update them
          topicId && { topicId },
          subtopicId && { subtopicId }
        )
        return super.update<AssignedTask>({ modelName: 'AssignedTask', data })
      } else {
        return resp
      }
    })
  }

  deleteAssignment (userId: number, assignedTaskId: number): Promise<NCResponse<number>> {
    if (!userId || !assignedTaskId) {
      return Promise.resolve({ status: false, errMessage: 'userId and assignedTaskId are required!' })
    }
    return super.readOne<AssignedTask>({
      modelName: 'AssignedTask',
      searchClause: { userId, id: assignedTaskId }
    }).then(resp => {
      if (resp.status) {
        return super.delete<AssignedTask>({ modelName: 'AssignedTask', data: { id: assignedTaskId } })
      } else {
        return { status: false, errMessage: 'Data could not be found!' }
      }
    })
  }
}

export default new StudentMonitorService()
