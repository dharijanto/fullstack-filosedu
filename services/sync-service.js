const path = require('path')

var axios = require('axios')

var AppConfig = require(path.join(__dirname, '../app-config'))
var CRUDService = require(path.join(__dirname, 'crud-service'))

const KEY_TO_TABLE = {
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

const TAG = 'SyncService'
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
      status: processedData.status,
      data: processedData.data
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

  insertTable (data, modelName, schoolId, userCloudId = null, trx) {
    var modifiedData = null
    if (modelName === 'User') {
      modifiedData = Object.assign({}, data, {schoolId})
    } else {
      modifiedData = Object.assign({}, data, {userId: userCloudId})
    }

    return this.create({
      modelName,
      data: modifiedData
    }, trx)
  }

  updateTable (data, modelName, cloudId, trx, userId = null) {
    const modifiedData = Object.assign({}, data, {id: cloudId, userId})
    return this.update({
      modelName,
      data: modifiedData
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
    return KEY_TO_TABLE[key].tableName
  }

  getModelName (key) {
    return KEY_TO_TABLE[key].modelName
  }

  /*
    Input:
      data: {
        id,
        username
        saltedPass,
        salt,
        ...
      },
      schoolIdentifier: 'sekolah_SMA_19',
      schoolId: 1
  */
  processUser (data, schoolIdentifier, schoolId, trx) {
    var tableName = 'users'
    var modelName = 'User'

    return this.getSingleSynchronization(data.id, schoolIdentifier, tableName).then(resp => {
      if (resp.status) {
        var cloudId = resp.data.cloudId
        // if exists
        return this.updateTable(data, modelName, cloudId, trx).then(resp3 => {
          if (resp3.status) {
            return cloudId
          } else {
            throw new Error('Failed to update user table:' + resp3.errMessage)
          }
        })
      } else {
        var userCloudId = null

        return this.insertTable(data, modelName, schoolId, userCloudId, trx).then(resp3 => {
          if (resp3.status) {
            return this.insertToSyncTable(data.id, schoolIdentifier, tableName, resp3.data.id, trx).then(resp4 => {
              if (resp4.status) {
                return resp4.data.cloudId
              } else {
                throw new Error('Failed to insert sync table:' + resp4.errMessage)
              }
            })
          } else {
            throw new Error('Failed to insert to user table: ' + resp3.errMessage)
          }
        })
      }
    }).catch(err => {
      throw new Error(err)
    })
  }
}

module.exports = SyncService
