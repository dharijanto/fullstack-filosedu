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

  Notes:
  1. Remember to set onCloud = true when adding/updating row so that
     when the data is restored to local server, they wouldn't be send to server.
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

  _getSyncMapping (localId, schoolIdentifier, serverHash, tableName, trx) {
    return this.readOne({
      modelName: 'Synchronization',
      searchClause: {
        localId,
        schoolIdentifier,
        serverHash,
        tableName
      }, trx
    })
  }

  _insertToSyncTable (localId, schoolIdentifier, serverHash, tableName, cloudId, trx) {
    return this.create({
      modelName: 'Synchronization',
      data: {
        localId,
        cloudId,
        schoolIdentifier,
        serverHash,
        tableName
      },
      trx
    })
  }

  insertRow (data, modelName, schoolId, userCloudId = null, trx) {
    var modifiedData = null
    if (modelName === 'User') {
      modifiedData = Object.assign({}, data, {schoolId})
    } else {
      modifiedData = Object.assign({}, data, {userId: userCloudId, onCloud: true})
    }

    return this.create({
      modelName,
      data: modifiedData,
      trx
    })
  }

  updateTable (data, modelName, cloudId, trx, userId = null) {
    // Note: "onCloud: true" here is to overrides what's received from local server
    const modifiedData = Object.assign({}, data, {id: cloudId, userId, onCloud: true})
    return this.update({
      modelName,
      data: modifiedData,
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
  // TODO: When syncing, we shouldn't search based on userName and schoolId, but instead we should
  // use syncTable. The reason is because current method wouldn't accommodate username being changed.
  // i.e if adennyh is updated to dennyh, then the some data is lost during syncing...
  _processUser (data, schoolIdentifier, serverHash, schoolId, trx) {
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
        return this._getSyncMapping(data.id, schoolIdentifier, serverHash, tableName, trx).then(resp => {
          // TODO: Do we really need this if statement? We shouldn't because if there's no user with username and schoolId,
          // we're supposed to create a new one
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
                return this._insertToSyncTable(data.id, schoolIdentifier, serverHash, tableName, resp3.data.id, trx).then(resp4 => {
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
        if (resp.data.status === 'Success') {
          // We want client to only send
          const lastSync = resp.data.date
          return {status: true, data: {lastSync}}
        } else if (resp.data.status === 'Syncing') {
          // This means we have never synced before,
          return {status: false, errMessage: 'School is currently syncing!'}
        } else { // Failed
          return this.readOne({modelName: 'SyncHistory', searchClause: {schoolIdentifier, status: 'Success'}, order: [['updatedAt', 'desc']], trx}).then(resp => {
            if (resp.status) {
              const lastSync = resp.data.date
              return {status: true, data: {lastSync}}
            } else {
              return {status: true, data: {lastSync: '2000-01-01 00:00:00'}}
            }
          })
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
    const serverHash = data.school.serverHash

    if (!schoolIdentifier || !serverHash) {
      throw new Error('schoolIdentifier or serverHash is not defined!')
    } else {
      return Promise.each(data.users, (data, index) => {
        return this._processUser(data['user'], schoolIdentifier, serverHash, schoolId, trx).then(userId => {
          // This is where we trying to remove data that contain object user.
          // Remember that we process data sorted by user first
          data = _.omit(data, 'user')
          return Promise.map(Object.keys(data), key => {
            const tableName = this.getTableName(key)
            const modelName = this.getModelName(key)
            return Promise.each(data[key], data => {
              return this._getSyncMapping(data.id, schoolIdentifier, serverHash, tableName, trx).then(resp2 => {
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
                      return this._insertToSyncTable(
                        data.id,
                        schoolIdentifier,
                        serverHash,
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
}

module.exports = SyncService
