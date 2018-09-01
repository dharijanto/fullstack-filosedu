const path = require('path')
const zlib = require('zlib')

const _ = require('lodash')
const axios = require('axios')
const Sequelize = require('sequelize')
const Promise = require('bluebird')

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

/*
  Every attempt to sync is represented by an entry in syncHistories table.
  1. When a sync starts, a new row is added
  2. That row status is set to Syncing
  3. When that syncs failed/success, its status is updated to Failed or Success
  4. 'date' column represents the last date of data on that sync
*/
class SyncService extends CRUDService {

  findSchoolIdByIdentifier (identifier) {
    return this.readOne({
      modelName: 'School',
      searchClause: {
        identifier
      }
    }).then(resp => {
      if (resp.status) {
        return resp
      } else {
        return {status: false, errMessage: 'Unrecognized school: ' + identifier}
      }
    })
  }

  getSyncMapping (localId, schoolIdentifier, tableName, trx) {
    return this.readOne({
      modelName: 'Synchronization',
      searchClause: {
        localId,
        schoolIdentifier,
        tableName
      }, trx
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
      data: modifiedData,
      trx
    })
  }

  updateTable (data, modelName, cloudId, trx, userId = null) {
    const modifiedData = Object.assign({}, data, {id: cloudId, userId})
    return this.update({
      modelName,
      data: modifiedData,
      trx
    })
  }

  insertToSyncTable (localId, schoolIdentifier, tableName, cloudId, trx) {
    return this.create({
      modelName: 'Synchronization',
      data: {
        localId,
        cloudId,
        schoolIdentifier,
        tableName
      },
      trx
    })
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
        return this.getSyncMapping(data.id, schoolIdentifier, tableName, trx).then(resp => {
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

  isReadyToSync (schoolIdentifier, trx) {
    return this.readOne({modelName: 'SyncHistory', searchClause: {schoolIdentifier}, order: [['updatedAt', 'desc']], trx}).then(resp => {
      if (resp.status) {
        // Sync isn't in progress, we can sync.
        if (resp.data.status !== 'Syncing') {
          // We want client to only send
          const lastSync = resp.data.date
          return {status: true, data: {lastSync}}
        } else {
          // This means we have never synced before,
          return {status: false, errMessage: 'School is currently syncing!'}
        }
      } else {
        // The school has never synced, good to go!
        return {status: true, data: {lastSync: '2000-01-01 00:00:00'}}
      }
    })
  }

  createSyncHistory (schoolIdentifier, syncTime, trx) {
    return this.create({modelName: 'SyncHistory', data: {schoolIdentifier, date: syncTime, status: 'Syncing'}, trx})
  }

  updateSyncHistory (id, successOrFailed, trx) {
    return this.update({modelName: 'SyncHistory', data: {id, status: successOrFailed ? 'Success' : 'Failed'}, trx})
  }

  getSyncHistories (schoolIdentifier) {
    return this.read({modelName: 'SyncHistory', searchClause: {schoolIdentifier}, order: [['updatedAt', 'desc']]}).then(resp => {
      if (resp.status) {
        return resp
      } else {
        return {status: true, data: []}
      }
    })
  }

  getLastSynced (schoolIdentifier) {
    this.readOne({modelName: 'SyncHistory', searchClause: {}})
  }

  // Keeping track of status here is pretty tough, so to ease things out, we'll
  // just throw Error if something fails
  syncData (schoolId, data, trx) {
    const schoolIdentifier = data.school.identifier
    return Promise.each(data.users, (data, index) => {
      return this.processUser(data['user'], schoolIdentifier, schoolId, trx).then(userId => {
        // This is where we trying to remove data that contain object user.
        // Remember that we process data sorted by user first
        data = _.omit(data, 'user')
        return Promise.map(Object.keys(data), key => {
          const tableName = this.getTableName(key)
          const modelName = this.getModelName(key)
          return Promise.each(data[key], data => {
            return this.getSyncMapping(data.id, schoolIdentifier, tableName, trx).then(resp2 => {
              if (resp2.status) {
                var cloudId = resp2.data.cloudId
                // if exists
                return this.updateTable(data, modelName, cloudId, trx, userId).then(resp3 => {
                  if (resp3.status) {
                    return
                  } else {
                    throw new Error(`Failed to update ${tableName} table: ${resp3.errMessage}`)
                  }
                })
              } else {
                return this.insertRow(data, modelName, schoolId, userId, trx).then(resp3 => {
                  if (resp3.status) {
                    return this.insertToSyncTable(
                      data.id,
                      schoolIdentifier,
                      tableName,
                      resp3.data.id,
                      trx).then(resp4 => {
                        if (resp4.status) {
                          return
                        } else {
                          throw new Error(`Failed to insert sync table: ${resp4.errMessage}`)
                        }
                      })
                  } else {
                    throw new Error(`Failed to insert ${tableName} table: ${resp3.errMessage}`)
                  }
                })
              }
            })
          })
        })
      })
    })
  }
}

module.exports = SyncService
