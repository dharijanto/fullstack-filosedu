var log = require('npmlog')

const TAG = 'CourseService'
class CourseService {
  constructor (sequelize, models) {
    this._sequelize = sequelize
    this._models = models
  }

  create ({modelName, data}) {
    delete data.id // We want to allow easy duplication, so we assume that adding data with the same id means creating a duplicate
    log.verbose(TAG, `create(): modelName=${modelName} data=${JSON.stringify(data)}`)
    return this._models[modelName].create(data).then(createdData => {
      return {status: true, data: createdData}
    }).catch(err => {
      if (err.name === 'SequelizeUniqueConstraintError') {
        return {status: false, errMessage: 'Invalid Input!'}
      } else if (err.name === 'SequelizeForeignKeyConstraintError') {
        return {status: false, errMessage: 'Constraint Error!'}
      } else {
        throw err
      }
    })
  }

  read ({modelName, searchClause}) {
    log.verbose(TAG, `read(): modelName=${modelName} searchClause=${JSON.stringify(searchClause)}`)
    return this._models[modelName].findAll({where: searchClause}).then(readData => {
      return {status: true, data: readData}
    })
  }

  update ({modelName, data}) {
    log.verbose(TAG, `update(): modelName=${modelName} data=${JSON.stringify(data)}`)
    return this._models[modelName].update(data, {where: {id: data.id}}).spread((count, updatedData) => {
      if (count) {
        return {status: true, data: updatedData}
      } else {
        return {status: false, errMessage: 'Data not found!'}
      }
    }).catch(err => {
      if (err.name === 'SequelizeUniqueConstraintError') {
        return {status: false, errMessage: 'Invalid Input!'}
      } else if (err.name === 'SequelizeForeignKeyConstraintError') {
        return {status: false, errMessage: 'Constraint Error!'}
      } else {
        throw err
      }
    })
  }

  delete ({modelName, data}) {
    log.verbose(TAG, `delete(): modelName=${modelName} data=${JSON.stringify(data)}`)
    return this._models[modelName].destroy({where: {id: data.id}}).then(numDeleted => {
      if (numDeleted > 0) {
        return {status: true}
      } else {
        return {status: false, errMessage: 'Data Not Found!'}
      }
    })
  }

  getTopicDependencies (courseId, whereClause = null) {
    whereClause = Object.assign({courseId}, whereClause)
    log.verbose(TAG, `getTopicDependencies(): courseId=${courseId} whereClause=${JSON.stringify(whereClause)}`)
    return this._models.TopicDependency.findAll(whereClause).then(dependencies => {
      return this.read('Courses', {id: dependencies.map(dependency => dependency.topicId)})
    })
  }

  getSubTopic (subTopicId) {
    return this._models['Subtopic'].findOne({where: {id: subTopicId}}).then(resp => {
      if (resp) {
        return {status: true, data: resp}
      } else {
        return {status: false, data: resp}
      }
    })
  }

  updateSubTopic (subTopicId, data) {
    var makeIntoJSON = {
      link_youtube: data.link_youtube,
      detail_course: data.detail_course
      // exercise_code: data.exercise_code
    }

    return this._models['Subtopic'].update({data: JSON.stringify(makeIntoJSON)}, {where: {id: subTopicId}}).then(resp => {
      if (resp) {
        return {status: true, data: resp}
      } else {
        return {status: false, data: resp}
      }
    })
  }

  deleteQuestion (subTopicId) {
    return this._models['Question'].destroy({where: {subtopicId: subTopicId}}).then(numDeleted => {
      if (numDeleted > 0) {
        return {status: true}
      } else {
        return {status: false, errMessage: 'Data Not Found!'}
      }
    })
  }

  getYoutubeEmbedURL (url) {
    var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
    var match = url.match(regExp)
    if (match && match[2].length === 11) {
        return match[2]
    } else {
        return 'error'
    }
  }
}

module.exports = CourseService
