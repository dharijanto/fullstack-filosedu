const path = require('path')

var Sequelize = require('sequelize')
const Promise = require('bluebird')
const moment = require('moment-timezone')

const AppConfig = require(path.join(__dirname, '../app-config'))
const CRUDService = require(path.join(__dirname, 'crud-service'))

const TAG = 'StudentMonitorService'

class StudentMonitorService extends CRUDService {
  getStats (schoolId, rawWhereClause, limit) {
const query = `
SELECT
  users.id AS userId, users.fullName AS name, users.username as username,
  summarizedGeneratedExercises.submissions as submissions,
  summarizedGeneratedExercises.avgScore as avgScore,
  summarizedGeneratedExercises.avgTimeliness as avgTimeliness,
  lastSubtopic.subtopic as lastSubtopic
FROM
  (SELECT users.id as id, users.username as username, users.fullName as fullName
    FROM users
    INNER JOIN schools ON users.schoolId = schools.id
    WHERE schools.id = "${schoolId}"
  ) AS users
LEFT OUTER JOIN
  (SELECT
      userId,
      COUNT(*) AS submissions,
      ROUND(AVG(generatedExercises.score), 2) AS avgScore,
      ROUND(AVG(generatedExercises.timeFinish/generatedExercises.idealTime*100.0), 2) AS avgTimeliness
    FROM generatedExercises
    WHERE idealTime > 0 AND submitted = TRUE AND timeFinish < 3600 ${rawWhereClause}
    GROUP BY userId
  ) AS summarizedGeneratedExercises ON summarizedGeneratedExercises.userId = users.id
# lastGeneratedExercises
LEFT OUTER JOIN
  (SELECT generatedExercises.userId as userId, MAX(generatedExercises.id) as id
    FROM generatedExercises
    WHERE submitted = true
    GROUP BY generatedExercises.userId
  ) AS lastGeneratedExercises ON lastGeneratedExercises.userId = users.id
# Map generatedExercise to subtopic
LEFT OUTER JOIN
  (SELECT generatedExercises.id as exerciseId, subtopics.subtopic as subtopic
    FROM exercises
    INNER JOIN generatedExercises on generatedExercises.exerciseId = exercises.id
    INNER JOIN subtopics ON exercises.subtopicId = subtopics.id) AS lastSubtopic ON lastGeneratedExercises.id = lastSubtopic.exerciseId
ORDER BY summarizedGeneratedExercises.avgTimeliness DESC
;
`
    return this._sequelize.query(query, { type: Sequelize.QueryTypes.SELECT }).then(resp => {
      return {status: true, data: resp}
    })
  }

  getLastHourStats (schoolId) {
    const past = moment.utc().subtract(1, 'hour').format('YYYY-MM-DD HH:mm:ss')
    return this.getStats(schoolId, `AND updatedAt >= "${past}"`)
  }

  getLastNSubmissions(userId, N = 10) {
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

    return this._sequelize.query(query, { type: Sequelize.QueryTypes.SELECT }).then(resp => {
        return {status: true, data: resp}
      })
  }

}

module.exports = StudentMonitorService