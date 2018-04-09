const path = require('path')

var axios = require('axios')

const TAG = 'SyncService'

var AppConfig = require(path.join(__dirname, '../app-config'))
var CRUDService = require(path.join(__dirname, 'crud-service'))

const keyToTable = {
  user: {
    tableName: 'users',
    modelName: 'User'
  },
  submittedGeneratedExercises: {
    tableName: 'generatedExercises',
    modelName: 'GeneratedExercise'
  },
  submittedGeneratedTopicExercises: {
    tableName: 'generatedTopicExercises',
    modelName: 'GeneratedTopicExercise'
  },
  analytics: {
    tableName: 'analytics',
    modelName: 'Analytics'
  }
}

class SyncService extends CRUDService {
  findAllUser (identifier) {
    return this.readOne({
      modelName: 'School',
      searchClause: {
        identifier
      }
    }).then(resp => {
      if (resp.status) {
        return this.read({
          modelName: 'User',
          searchClause: {
            schoolId: resp.data.id
          }
        })
      } else {
        return resp
      }
    })
  }

  findAnalytics (userId) {
    return this.read({
      modelName: 'Analytics',
      searchClause: {
        userId
      }
    })
  }

  findSubmittedGeneratedExercises (userId) {
    return this.read({
      modelName: 'GeneratedExercise',
      searchClause: {
        userId,
        submitted: true
      }
    })
  }

  findSubmittedGeneratedTopicExercises (userId) {
    return this.read({
      modelName: 'GeneratedTopicExercise',
      searchClause: {
        userId,
        submitted: true
      }
    })
  }

  sendData (processedData) {
    return axios.post(AppConfig.CLOUD_INFORMATION.HOST, {
      processedData
    }).then(resp => {
      return resp
    })
  }

  findSchoolIdByIdentifier (identifier) {
    return this.readOne({
      modelName: 'School',
      searchClause: {
        identifier
      }
    })
  }

  getSingleSynchronization (localId, schoolIdentifier, tableName) {
    return this.readOne({
      modelName: 'Synchronization',
      searchClause: {
        localId,
        schoolIdentifier,
        tableName
      }
    })
  }

  _getTypeData (modelName, preProcessedData) {
    var data = {}
    if (modelName === 'User') {
      data = {
        username: preProcessedData.username,
        saltedPass: preProcessedData.saltedPass,
        salt: preProcessedData.salt,
        email: preProcessedData.email,
        fullName: preProcessedData.fullName,
        grade: preProcessedData.grade,
        createdAt: preProcessedData.createdAt,
        updatedAt: preProcessedData.updatedAt
      }
    } else if (modelName === 'GeneratedExercise') {
      data = {
        exerciseHash: preProcessedData.exerciseHash,
        knowns: preProcessedData.knowns,
        unknowns: preProcessedData.unknowns,
        userAnswer: preProcessedData.userAnswer,
        submitted: preProcessedData.submitted,
        score: preProcessedData.score,
        timeFinish: preProcessedData.timeFinish,
        createdAt: preProcessedData.createdAt,
        updatedAt: preProcessedData.updatedAt,
        exerciseId: preProcessedData.exerciseId
      }
    } else if (modelName === 'GeneratedTopicExercise') {
      data = {
        submitted: preProcessedData.submitted,
        score: preProcessedData.score,
        timeFinish: preProcessedData.timeFinish,
        topicExerciseHash: preProcessedData.topicExerciseHash,
        exerciseDetail: preProcessedData.exerciseDetail,
        createdAt: preProcessedData.createdAt,
        updatedAt: preProcessedData.updatedAt,
        topicId: preProcessedData.topicId
      }
    } else if (modelName === 'Analytics') {
      data = {
        type: preProcessedData.type,
        key: preProcessedData.key,
        value: preProcessedData.value,
        videoId: preProcessedData.videoId,
        exerciseId: preProcessedData.exerciseId,
        createdAt: preProcessedData.createdAt,
        updatedAt: preProcessedData.updatedAt
      }
    }
    return data
  }

  insertTable (preProcessedData, modelName, schoolId, userCloudId = null, trx) {
    var data = this._getTypeData(modelName, preProcessedData)
    if (modelName === 'User') {
      data.schoolId = schoolId
    } else {
      data.userId = userCloudId
    }

    return this.create({
      modelName,
      data
    }, trx)
  }

  updateTable (preProcessedData, modelName, cloudId, trx) {
    var data = this._getTypeData(modelName, preProcessedData)
    data.id = cloudId
    return this.update({
      modelName,
      data
    }, trx)
  }

  insertToSyncTable (localId, schoolIdentifier, tableName, cloudId, trx) {
    return this.create({
      modelName: 'Synchronization',
      data: {
        localId,
        cloudId,
        schoolIdentifier,
        tableName
      }
    }, trx)
  }

  getTableName (key) {
    return keyToTable[key].tableName
  }

  getModelName (key) {
    return keyToTable[key].modelName
  }
}

module.exports = SyncService
