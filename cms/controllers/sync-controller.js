const path = require('path')

const log = require('npmlog')
const Promise = require('bluebird')
const moment = require('moment')

const BaseController = require(path.join(__dirname, 'base-controller'))

const AppConfig = require(path.join(__dirname, '../../app-config'))
var SyncService = require(path.join(__dirname, '../../services/sync-client-service'))

const TAG = 'SyncController'

class SyncController extends BaseController {
  constructor (initData) {
    super(initData)
    const syncService = new SyncService(this.getDb().sequelize, this.getDb().models)

    this.addInterceptor((req, res, next) => {
      log.verbose(TAG, 'SyncController: req.path=' + req.path)
      next()
    })

    this.routeGet('/synchronization', (req, res, next) => {
      if (AppConfig.CLOUD_SERVER) {
        res.status(403).send('This page can only be accessed by local server!')
      } else {
        res.render('sync-management')
      }
    })

    this.routeGet('/synchronization/histories' , (req, res, next) => {
      syncService.getSyncHistories().then(resp => {
        res.json(resp)
      }).catch(next)
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
    this.routePost('/synchronization/start', (req, res, next) => {
      log.verbose(TAG, `syncController:GET(): HOMEPAGE`)
      syncService.isServerReadyToSync().then(resp => {
        if (resp.status) {
          // Sync only data newer than last synced
          const startTime = resp.data.lastSync
          const endTime = moment().format('YYYY-MM-DD HH:mm:ss')
          return syncService.findAllUser().then(resp => {
            if (resp.status) {
              const users = resp.data
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
                log.verbose(TAG, 'syncController.GET(): processedData=' + JSON.stringify(usersData))
                return syncService.sendData(usersData, endTime).then(resp => {
                  res.json(resp)
                })
              })
            } else {
              res.json(resp)
            }
          })
        } else {
          res.json(resp)
        }
      }).catch(err => {
        next(err)
      })
    })
  }

  getRouter () {
    return this._router
  }
}

module.exports = SyncController
