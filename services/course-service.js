var path = require('path')

// var Promise = require('bluebird')
var log = require('npmlog')

var BaseService = require(path.join(__dirname, 'base-service'))

const TAG = 'CourseService'
class CourseService extends BaseService {
  constructor (sequelize, models) {
    super(sequelize, models)
  }

  getTopicDependencies (courseId, whereClause = null) {
    whereClause = Object.assign({courseId}, whereClause)
    log.verbose(TAG, `getTopicDependencies(): courseId=${courseId} whereClause=${JSON.stringify(whereClause)}`)
    return this._models.TopicDependency.findAll(whereClause).then(dependencies => {
      return this.read('Courses', {id: dependencies.map(dependency => dependency.topicId)})
    })
  }

  createGenerateExercise (exerciseHash, questions, exerciseId, userId) {
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
}

module.exports = CourseService
