const path = require('path')
const zlib = require('zlib')

const axios = require('axios')
const md5 = require('md5')
const Sequelize = require('sequelize')

const AppConfig = require(path.join(__dirname, '../app-config'))
const CRUDService = require(path.join(__dirname, 'crud-service'))

const TAG = 'SyncService'
class SyncService extends CRUDService {
  constructor (sequelize, models) {
    super(sequelize, models)
    this.schoolIdentifier = AppConfig.LOCAL_SCHOOL_INFORMATION.identifier
  }

  findAllUser () {
    return this.readOne({
      modelName: 'School',
      searchClause: {
        identifier: this.schoolIdentifier
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
        },
        onCloud: false
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
        submitted: true,
        onCloud: false
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
        submitted: true,
        onCloud: false
      }
    })
  }

  sendData (users, syncTime) {
    return new Promise((resolve, reject) => {
      this.getServerHash().then (resp => {
        if (resp.status) {
          const buffer = new Buffer(JSON.stringify({
            data: {
              school: {
                identifier: this.schoolIdentifier,
                serverHash: resp.data.serverHash
              },
              users,
              syncTime
            }
          }), 'utf-8')

          zlib.gzip(buffer, function(err, result) {
            if (err) {
              reject(err)
            } else {
              axios.post(`${AppConfig.CLOUD_INFORMATION.HOST}/synchronization/start`, result , {
                headers: {
                  'Content-Type': 'application/json',
                  'Content-Encoding': 'gzip'
                }
              }).then(resp => {
                resolve(resp.data)
              }).catch(reject)
            }
          })
        } else {
          resolve(resp)
        }
      }).catch(err => {
        reject(err)
      })
    })
  }

  getSyncHistories () {
    return axios.get(`${AppConfig.CLOUD_INFORMATION.HOST}/synchronization/histories?schoolIdentifier=${this.schoolIdentifier}`).then(rawResp => {
      const resp = rawResp.data
      return resp
    })
  }


  isServerReadyToSync () {
    return axios.get(`${AppConfig.CLOUD_INFORMATION.HOST}/synchronization/readyToSync?schoolIdentifier=${this.schoolIdentifier}`).then(rawResp => {
      const resp = rawResp.data
      if (resp.status) {
        // Date when server last synced with this school
        const lastSync = resp.data.lastSync
        if (!lastSync) {
          return {status: false, errMessage: 'Server does not return lastSync date!'}
        } else {
          return {status: true, data: {lastSync}}
        }
      } else {
        return resp
      }
    })
  }

  /*
    Get a persistent hash that is destroyed only when there's a cloud-to-local sync using
    mysqldump. This persistent hash is send to server so that server knows which sync mapping
    to use when processing the data.
  */
  getServerHash () {
    return this.readOne({
      modelName: 'LocalMetaData',
      searchClause: {
        key: 'SERVER_HASH'
      }
    }).then(resp => {
      if (resp.status) {
        return resp
      } else {
        return this.create({
          modelName: 'LocalMetaData',
          data: {
            key: 'SERVER_HASH',
            value: md5('' + new Date())
          }
        })
      }
    }).then(resp => {
      if (resp.status) {
        const serverHash = resp.data.value
        if (!serverHash) {
          throw new Error('Server hash is expected but not found!')
        } else {
          return {status: true, data: {serverHash}}
        }
      } else {
        return resp
      }
    })
  }
}

module.exports = SyncService
