var path = require('path')

// var Promise = require('bluebird')
var log = require('npmlog')
var Promise = require('bluebird')
var Sequelize = require('sequelize')

var CRUDService = require(path.join(__dirname, 'crud-service'))

const TAG = 'CourseService'
class CourseService extends CRUDService {
  _destroySingleGeneratedExercise (userId, exerciseId) {
    return this._models['GeneratedExercise'].destroy({where: {userId, exerciseId, submitted: false}})
  }

  _createSingleGeneratedExercise (exerciseHash, data, userId, exerciseId) {
    return this.create({
      modelName: 'GeneratedExercise',
      data: {
        exerciseHash,
        knowns: data.knowns,
        unknowns: data.unknowns,
        exerciseId,
        userId
      }
    })
  }

  updateExercise (userId, data, exerciseHash) {
    return this._destroySingleGeneratedExercise(userId, data.exerciseId).then(() => {
      return this._createSingleGeneratedExercise(exerciseHash, data, userId, data.exerciseId)
    })
  }

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

  /*
    Input:
      id: 1,
      score: 2,
      userAnswer: '[{x: "3"}]',
      submitted: true,
      timeFinish: 23.09
  */
  updateGenerateExercise (data) {
    return this.update({
      modelName: 'GeneratedExercise',
      data
    })
  }

  // Get exercise that is curently active
  getCurrentExercise ({userId, exerciseId}) {
    return this.readOne({
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

  getSingleExercise (exerciseId) {
    return this.readOne({modelName: 'Exercise', searchClause: {id: exerciseId}})
  }

  getSingleSubtopic (subtopicId) {
    return this.readOne({modelName: 'Subtopic', searchClause: {id: subtopicId}})
  }

  getSingleTopic (topicId) {
    return this.readOne({modelName: 'Topic', searchClause: {id: topicId}})
  }
}

module.exports = CourseService
