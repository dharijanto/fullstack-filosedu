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
    return this.readOne({modelName: 'Subtopic', searchClause: {id: subtopicId}, include: this._models['Topic']})
  }

  getTopic (topicId) {
    return this.readOne({modelName: 'Topic', searchClause: {id: topicId}})
  }

  getExercises (subtopicId) {
    return this.read({modelName: 'Exercise', searchClause: {subtopicId}, order: [['id', 'ASC']]})
  }

  getPreviousAndNextExercise (subtopicId, exerciseId) {
    return Promise.join(
      this.readOne({
        modelName: 'Exercise',
        searchClause: {
          [Sequelize.Op.and]: {
            id: {
              [Sequelize.Op.lt]: exerciseId
            },
            subtopicId
          }
        },
        order: [['id', 'DESC']],
        include: {model: this._models['Subtopic'], include: {model: this._models['Topic']}}
      }),
      this.readOne({
        modelName: 'Exercise',
        searchClause: {
          [Sequelize.Op.and]: {
            id: {
              [Sequelize.Op.gt]: exerciseId
            },
            subtopicId
          }
        },
        order: [['id', 'ASC']],
        include: {model: this._models['Subtopic'], include: {model: this._models['Topic']}}
      })).spread((resp1, resp2) => {
        return {
          status: true,
          data: {
            prev: resp1.data,
            next: resp2.data
          }
        }
      })
  }

  getPreviousAndNextSubtopic (subtopicId) {
    return this.getSubtopic(subtopicId).then(resp => {
      if (resp.status) {
        const topic = resp.data.topic
        const subtopicNo = resp.data.subtopicNo
        return Promise.join(
          this.readOne({
            modelName: 'Subtopic',
            searchClause: {subtopicNo: { [Sequelize.Op.lt]: subtopicNo }},
            include: {model: this._models['Topic']},
            order: [['subtopicNo', 'DESC']],
            limit: 1}),
          this.readOne({
            modelName: 'Subtopic',
            searchClause: {subtopicNo: { [Sequelize.Op.gt]: subtopicNo }},
            include: {model: this._models['Topic']},
            order: [['subtopicNo', 'ASC']],
            limit: 1})
        ).spread((resp2, resp3) => {
          return {status: true, data: {prev: resp2.data, next: resp3.data}}
        })
      } else {
        return {status: false, errMessage: 'Subtopic not found!'}
      }
    })
  }
}

module.exports = CourseService
