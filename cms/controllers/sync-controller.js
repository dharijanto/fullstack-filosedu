const path = require('path')

const log = require('npmlog')
const Promise = require('bluebird')
const moment = require('moment')

const BaseController = require(path.join(__dirname, 'base-controller'))

const AppConfig = require(path.join(__dirname, '../../app-config'))
var SyncService = require(path.join(__dirname, '../../services/sync-service'))

const TAG = 'SyncController'

class SyncController extends BaseController {
  constructor (initData) {
    super(initData)
    const syncService = new SyncService(this.getDb().sequelize, this.getDb().models)

    this.addInterceptor((req, res, next) => {
      log.verbose(TAG, 'SyncController: req.path=' + req.path)
      next()
    })

    /*
      This is client side of the synchronization mechanism. This path is called on the client side

      1. Get school information from AppConfig.LOCAL_SCHOOL_INFORMATION.identifier
      2. Get all users from that school
      3. Get sync history from synchronizationHistories table.
      3. Get analytics, submittedGeneratedExercises, and submittedGeneratedTopicExercises for all of those users,
         only those whose updatedAt is larger than last synchronization time
      4. Send them to the server
      5. If server suceeds, update synchronizationHistories table so that we don't have to re-sync what's already sent.

    */
    this.routeGet('/synchronization', (req, res, next) => {
      log.verbose(TAG, `syncController:GET(): HOMEPAGE`)
      var schoolIdentifier = AppConfig.LOCAL_SCHOOL_INFORMATION.identifier

      syncService.getLastSyncHistory().then(syncHistoryResp => {
        var startTime = '2000-01-01'
        var endTime = moment().format('YYYY-MM-DD hh:mm:ss')
        if (syncHistoryResp.status) {
          var startTime = syncHistoryResp.data.time
          log.verbose(TAG, 'Previous sync history is found. startTime=' + startTime)
        }
        syncService.findAllUser(schoolIdentifier).then(resp => {
          if (resp.status) {
            const users = resp.data
            const currentTime = moment().format('YYYY-MM-DD hh:mm:ss')
            return Promise.map(users, user => {
              return Promise.join(
                syncService.findAnalytics(user.id, startTime, endTime),
                syncService.findSubmittedGeneratedExercises(user.id, startTime, endTime),
                syncService.findSubmittedGeneratedTopicExercises(user.id, startTime, endTime)
              ).spread((respAnalytics, respSubmittedGeneratedExercises, respSubmittedGeneratedTopicExercises) => {
                return {
                  user,
                  analytics: respAnalytics.status ? respAnalytics.data : [],
                  submittedGeneratedExercises: respSubmittedGeneratedExercises.status ? respSubmittedGeneratedExercises.data : [],
                  submittedGeneratedTopicExercises:  respSubmittedGeneratedTopicExercises.status ? respSubmittedGeneratedTopicExercises.data : []
                }
              })
            }).then(usersData => {
              const processedData = {
                data: {
                  school: {
                    identifier: schoolIdentifier
                  },
                  datas: usersData
                }
              }
              log.verbose(TAG, 'syncController; GET(): processedData=' + JSON.stringify(processedData))
              return syncService.sendData(processedData).then(resp => {
                if (resp.status) {
                  return syncService.saveSyncHistory(endTime).then(resp2 => {
                    res.send('Data successfully integrated into the cloud!')
                  })
                } else {
                  res.send(resp.errMessage)
                }
              })
            })
          } else {
            res.status(500).send('This school does not have any users!')
          }
        })
      }).catch(err => {
        console.error(err)
        next(err)
      })
    })
  }

  getRouter () {
    return this._router
  }
}

module.exports = SyncController
