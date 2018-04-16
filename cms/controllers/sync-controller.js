const path = require('path')

const log = require('npmlog')
const Promise = require('bluebird')

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

    this.routeGet('/synchronization', (req, res, next) => {
      log.verbose(TAG, `syncController:GET(): HOMEPAGE`)
      var schoolIdentifier = AppConfig.LOCAL_SCHOOL_INFORMATION.identifier
      syncService.findAllUser(schoolIdentifier).then(resp => {
        if (resp.status) {
          return Promise.map(resp.data, user => {
            return Promise.join(
              syncService.findAnalytics(user.id),
              syncService.findSubmittedGeneratedExercises(user.id),
              syncService.findSubmittedGeneratedTopicExercises(user.id)
            ).spread((respAnalytics, respSubmittedGeneratedExercises, respSubmittedGeneratedTopicExercises) => {
              var datas = {user}
              if (respAnalytics.status) {
                datas.analytics = respAnalytics.data
              } else {
                datas.analytics = []
              }

              if (respSubmittedGeneratedExercises.status) {
                datas.submittedGeneratedExercises = respSubmittedGeneratedExercises.data
              } else {
                datas.submittedGeneratedExercises = []
              }

              if (respSubmittedGeneratedTopicExercises.status) {
                datas.submittedGeneratedTopicExercises = respSubmittedGeneratedTopicExercises.data
              } else {
                datas.submittedGeneratedTopicExercises = []
              }
              return datas
            })
          }).then(results => {
            var processedData = {
              data: {
                school: {
                  identifier: schoolIdentifier
                },
                datas: results
              }
            }
            log.verbose(TAG, 'syncController; GET(): processedData=' + JSON.stringify(processedData))
            return syncService.sendData(processedData).then(resp => {
              if (resp.status) {
                res.send('Data success integrated with the cloud')
              } else {
                res.send(resp.errMessage)
              }
            })
          })
        } else {
          res.send('No Data Inside DB that has record of this school = ' + schoolIdentifier)
        }
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
