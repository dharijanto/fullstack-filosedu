const path = require('path')
const zlib = require('zlib')

const axios = require('axios')
const Sequelize = require('sequelize')

const AppConfig = require(path.join(__dirname, '../app-config'))
const CRUDService = require(path.join(__dirname, 'crud-service'))

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
  findAllUser (schoolIdentifier) {
    return this.readOne({
      modelName: 'School',
      searchClause: {
        identifier: schoolIdentifier
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

  // userId: [number]
  // lastUpdatedAt: '2018-07-04 hh:mm:ss'
  findAnalytics (userId, startTime, endTime) {
    return this.read({
      modelName: 'Analytics',
      searchClause: {
        userId,
        updatedAt: {
          [Sequelize.Op.and]: {
            [Sequelize.Op.gte]: startTime,
            [Sequelize.Op.lte]: endTime
          }
        }
      },
      order: [['updatedAt', 'DESC']]
    })
  }

  findSubmittedGeneratedExercises (userId, startTime, endTime) {
    return this.read({
      modelName: 'GeneratedExercise',
      searchClause: {
        userId,
        updatedAt: {
          [Sequelize.Op.and]: {
            [Sequelize.Op.gte]: startTime,
            [Sequelize.Op.lte]: endTime
          }
        },
        submitted: true
      }
    })
  }

  findSubmittedGeneratedTopicExercises (userId, startTime, endTime) {
    return this.read({
      modelName: 'GeneratedTopicExercise',
      searchClause: {
        userId,
        updatedAt: {
          [Sequelize.Op.and]: {
            [Sequelize.Op.gte]: startTime,
            [Sequelize.Op.lte]: endTime
          }
        },
        submitted: true
      }
    })
  }

  sendData (processedData) {
    return new Promise((resolve, reject) => {
      const buffer = new Buffer(JSON.stringify({
        status: processedData.status,
        data: processedData.data
      }), 'utf-8')

      zlib.gzip(buffer, function(err, result) {
        if (err) {
          reject(err)
        } else {
          axios.post(AppConfig.CLOUD_INFORMATION.HOST, result , {
            headers: {
              'Content-Type': 'application/json',
              'Content-Encoding': 'gzip'
            }
          }).then(resp => {
            resolve(resp.data)
          }).catch(reject)
        }
      })
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

  insertRow (data, modelName, schoolId, userCloudId = null, trx) {
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
    if (KEY_TO_TABLE[key]) {
      return KEY_TO_TABLE[key].tableName
    } else {
      throw new Error('Unknown key=' + key)
    }
  }

  getModelName (key) {
    if (KEY_TO_TABLE[key]) {
      return KEY_TO_TABLE[key].modelName
    } else {
      throw new Error('Unknown key=' + key)
    }
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
    const tableName = 'users'
    const modelName = 'User'

    // Check if the user is already in database
    return this.readOne({modelName: 'User', searchClause: {username: data.username, schoolId}}).then(resp => {
      // User already existed in the database, we just need to update it
      if (resp.status) {
        var cloudId = resp.data.id
        // if exists
        return this.updateTable(data, modelName, cloudId, trx).then(resp3 => {
          if (resp3.status) {
            return cloudId
          } else {
            throw new Error('Failed to update user table:' + resp3.errMessage)
          }
        })
      } else {
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

            return this.insertRow(data, modelName, schoolId, userCloudId, trx).then(resp3 => {
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
        })
      }
    })
  }

  getLastSyncHistory () {
    return this.readOne({modelName: 'SyncHistory', searchClause: {}, order: [['createdAt', 'DESC']]})
  }

  saveSyncHistory (time) {
    return this.create({modelName: 'SyncHistory', data: {time}})
  }
}

module.exports = SyncService
