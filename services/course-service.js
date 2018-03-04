var path = require('path')

// var Promise = require('bluebird')
var log = require('npmlog')
var Promise = require('bluebird')
var Sequelize = require('sequelize')

var CRUDService = require(path.join(__dirname, 'crud-service'))

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
    return this._sequelize.query(`SELECT score FROM generatedExercises WHERE submitted = 1 AND userId = ${userId} AND exerciseId = ${exerciseId} ORDER BY score DESC LIMIT 4;`,
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
}

module.exports = CourseService
