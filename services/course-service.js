var path = require('path')

// var Promise = require('bluebird')
var log = require('npmlog')
var Promise = require('bluebird')
var Sequelize = require('sequelize')

var CRUDService = require(path.join(__dirname, 'crud-service'))
var ExerciseGenerator = require(path.join(__dirname, '../lib/exercise_generator/exercise-generator'))
var ExerciseHelper = require(path.join(__dirname, '../app/utils/exercise-helper'))

const TAG = 'CourseService'
class CourseService extends CRUDService {
  generateExercise (exerciseHash, questions, exerciseId, userId) {
    // Note: There's a case where exercise has to be generated again
    // because the original question has change. Due to this, we need
    // to delete previously generated exercise
    return this._models['GeneratedExercise'].destroy({where: {userId, exerciseId, submitted: false}}).then(() => {
      var knowns = []
      var unknowns = []
      questions.forEach(question => {
        knowns.push(question.knowns)
        unknowns.push(question.unknowns)
      })
      return this.create({
        modelName: 'GeneratedExercise',
        data: {
          exerciseHash,
          knowns: JSON.stringify(knowns),
          unknowns: JSON.stringify(unknowns),
          exerciseId,
          userId
        }
      })
    })
  }

  saveAndGetGeneratedExercise (generateExerciseId, userAnswer) {
    return this.update({
      modelName: 'GeneratedExercise',
      data: {
        id: generateExerciseId,
        userAnswer,
        submitted: true
      }
    }).then(resp => {
      return this.read({modelName: 'GeneratedExercise', searchClause: {id: generateExerciseId}})
    })
  }

  // Get exercise that is curently active
  getCurrentExercise ({userId, exerciseId}) {
    return this.read({
      modelName: 'GeneratedExercise',
      searchClause: {userId, exerciseId, submitted: false}
    })
  }

  // Get all exercises that have been submitted
  getSubmittedExercises ({userId, exerciseId}) {
    return this.read({
      modelName: 'GeneratedExercise',
      searchClause: {userId, exerciseId, submitted: true}
    })
  }

  // Get user score of an exercise
  //
  // Return:
  // 0 - 4: How many of the submitted scores are > 80%
  getExerciseStar (userId, exerciseId) {
    return this._sequelize.query(`
SELECT score FROM generatedExercises
WHERE submitted = 1 AND userId = ${userId} AND exerciseId = ${exerciseId}
ORDER BY score DESC LIMIT 4;`,
    { type: Sequelize.QueryTypes.SELECT }).then(datas => {
      const stars = datas.reduce((acc, data) => {
        if (parseInt(data.score) >= 80) {
          return acc + 1
        } else {
          return acc
        }
      }, 0)
      return {status: true, data: {stars}}
    })
  }

  // Get leaderboard data
  getExerciseRanking (data) {
    return this._sequelize.query(
`SELECT MIN(timeFinish) AS timeFinish, userId, users.fullName AS fullName, users.grade AS grade, schools.name AS schoolName
  FROM generatedExercises INNER JOIN users ON users.id = generatedExercises.userId INNER JOIN schools ON schools.id = users.schoolId
  WHERE submitted = TRUE AND exerciseId = ${data.exerciseId} AND score = 100 AND timeFinish IS NOT NULL GROUP BY userId ORDER BY MIN(timeFinish);`,
    { type: Sequelize.QueryTypes.SELECT }).then(resp => {
      return {status: true, data: resp}
    })
  }

  // Get the number of submissions in the leaderboard
  getTotalRanking (exerciseId) {
    return new Promise((resolve, reject) => {
      return this._sequelize.query(
`SELECT COUNT(*) AS total
  FROM (SELECT COUNT(*) FROM generatedExercises WHERE submitted = TRUE AND exerciseId = ${exerciseId} AND score = 100 AND timeFinish IS NOT NULL
  GROUP BY userId
  ORDER BY MIN(timeFinish)) AS totalrow;`,
      { type: Sequelize.QueryTypes.SELECT }).then(resp => {
        resolve({status: true, data: {count: resp[0].total + 1}})
      }).catch(err => {
        reject(err)
      })
    })
  }

  // Get the number of rank in leaderboard
  getCurrentRanking (timeFinish, exerciseId) {
    return new Promise((resolve, reject) => {
      return this._sequelize.query(
`SELECT COUNT(*) AS total
  FROM (SELECT COUNT(*) FROM generatedExercises
  WHERE submitted = TRUE AND timeFinish < ${timeFinish} AND exerciseId = ${exerciseId} AND score = 100 AND timeFinish IS NOT NULL
  GROUP BY userId
  ORDER BY MIN(timeFinish)) AS totalrow;`,
      { type: Sequelize.QueryTypes.SELECT }).then(resp => {
        resolve({status: true, data: {count: resp[0].total + 1}})
      }).catch(err => {
        reject(err)
      })
    })
  }

  getSubtopicStar (userId, subtopicId) {
    return this.read({
      modelName: 'Exercise', searchClause: {subtopicId}
    }).then(resp => {
      return Promise.map(resp.data || [], exercise => {
        return this.getExerciseStar(userId, exercise.id)
      }).then(datas => {
        const stars = datas.reduce((acc, resp) => {
          return acc + resp.data.stars
        }, 0) / (parseFloat(datas.length) || 1) // Avoid division by 0
        return {status: true, data: {stars}}
      })
    })
  }

  getAllTopics () {
    return this._models['Topic'].findAll({order: [['topicNo', 'ASC']]}).then(resp => {
      return {status: true, data: resp}
    })
  }

  getAllSubtopics () {
    return this._models['Subtopic'].findAll({order: [['subtopicNo', 'ASC']]}).then(resp => {
      return {status: true, data: resp}
    })
  }

  getTopicDependencies (topicId) {
    return this._sequelize.query(
      `SELECT topicDependencies.id, topicDependencies.description, topicDependencies.updatedAt, topics.topic as dependencyName FROM topicDependencies INNER JOIN topics ON topics.id = topicDependencies.dependencyId WHERE topicDependencies.topicId=${topicId}`,
      { type: Sequelize.QueryTypes.SELECT })
      .then(data => {
        return {status: true, data}
      })
  }

  addTopicDependency (topicId, dependencyName, description) {
    return this.read({modelName: 'Topic', searchClause: {topic: dependencyName}}).then(resp => {
      if (resp.status) {
        const dependencyTopic = resp.data[0]
        if (dependencyTopic.id === parseInt(topicId)) {
          return {status: false, errMessage: 'A topic could not depend on itself!'}
        } else {
          return this.create({modelName: 'TopicDependency', data: {topicId, dependencyId: dependencyTopic.id, description}})
        }
      } else {
        return {status: false, errMessage: `Could not find topic with name "${dependencyName}"`}
      }
    })
  }

  getSubtopicByTopicId (topicId) {
    return this._models['Subtopic'].findAll({where: {topicId}, order: [['subtopicNo', 'ASC']]}).then(data => {
      return {status: true, data}
    })
  }

  getExerciseBySubtopicId (subtopicId) {
    return this._models['Exercise'].findAll({where: {subtopicId}, order: [['id', 'ASC']]}).then(data => {
      return {status: true, data}
    })
  }
}

module.exports = CourseService
