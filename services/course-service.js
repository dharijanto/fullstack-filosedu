var path = require('path')

// var Promise = require('bluebird')
var log = require('npmlog')
var Promise = require('bluebird')
var Sequelize = require('sequelize')

var CRUDService = require(path.join(__dirname, 'crud-service'))

const TAG = 'CourseService'
class CourseService extends CRUDService {
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

  getSubtopic (subtopicId) {
    return this.readOne({modelName: 'Subtopic', searchClause: {id: subtopicId}})
  }

  getTopic (topicId) {
    return this.readOne({modelName: 'Topic', searchClause: {id: topicId}})
  }
}

module.exports = CourseService
