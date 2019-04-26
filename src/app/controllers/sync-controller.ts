import * as path from 'path'

import * as Promise from 'bluebird'
import * as log from 'npmlog'

let _ = require('lodash')
let Sequelize = require('sequelize')
let BaseController = require(path.join(__dirname, 'base-controller'))
let SyncService = require(path.join(__dirname, '../../services/sync-server-service'))
import BackupService from '../../services/backup-service'

const TAG = 'SyncController'

class SyncController extends BaseController {
  constructor (initData) {
    super(initData)
    const syncService = new SyncService(this.getDb().sequelize, this.getDb().models)

    this.addInterceptor((req, res, next) => {
      next()
    })

    // TODO: This should be encrypted
    this.routeGet('/backup/dump', (req, res, next) => {
      BackupService.getSQLDumpForLocalServer(req.query.schoolIdentifier).then(data => {
        res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Encoding': 'gzip' })
        res.end(data)
      }).catch(next)
    })

    this.routeGet('/synchronization/histories', (req, res, next) => {
      const schoolIdentifier = req.query.schoolIdentifier
      syncService.getSyncHistories(schoolIdentifier).then(resp => {
        res.json(resp)
      }).catch(err => {
        next(err)
      })
    })

    /*
      The client send a GET request to this path and we return whether we're ready to sync or not.
      We're ready if:
      1. We check on the last syncHistories table entry
      2. If it's empty, this school has never synced. We're good
      3. If there's entry. We're ready to sync if status !== 'Syncing' (i.e Failed or Ready)

    */
    this.routeGet('/synchronization/readyToSync', (req, res, next) => {
      const schoolIdentifier = req.query.schoolIdentifier
      syncService.isReadyToSync(schoolIdentifier).then(resp => {
        res.json(resp)
      }).catch(next)
    })

    /*
      This is server side of the synchronization mechanism. This path is called on the server.
      1. Client user data is POSTed with the following format:
        {
          'status': true
          'data': {
            {
            'school': {
              'identifier': 'sekolah_cendrawasih_cengkareng'
            },
            'datas': [{
              'user': {
                  'id': 14,
                  'username': 'test',
                  'saltedPass': '132297b026618cfb2b4281cd69bf4ed35a250cb3b21d6ec8d44df08fed363d7cad719cd0129272b8d309c020c4b4d7b87a3d1c12016f706c12a6128a9685d56e',
                  'salt': 'ef922d00889000ac',
                  'email': 'test@test.com',
                  'fullName': 'test',
                  'grade': '1',
                  'createdAt': '2018-03-22T08:00:13.000Z',
                  'updatedAt': '2018-03-22T08:00:13.000Z',
                  'schoolId': 2
              },
              'submittedGeneratedExercises': [{
                  'id': 1,
                  'exerciseHash': '6a8db6b0f3d9852438f51c6158ca676d',
                  'knowns': '\'[{\\\'a\\\':4},{\\\'a\\\':3},{\\\'a\\\':1},{\\\'a\\\':2},{\\\'a\\\':5}]\'',
                  'unknowns': '\'[{\\\'x\\\':4},{\\\'x\\\':3},{\\\'x\\\':1},{\\\'x\\\':2},{\\\'x\\\':5}]\'',
                  'userAnswer': '[{\'x\':\'\'},{\'x\':\'\'},{\'x\':\'\'},{\'x\':\'\'},{\'x\':\'\'}]',
                  'submitted': true,
                  'score': 0,
                  'timeFinish': 1295.33,
                  'createdAt': '2018-04-04T04:24:46.000Z',
                  'updatedAt': '2018-04-04T04:46:21.000Z',
                  'exerciseId': 22,
                  'userId': 14
              }],
              'submittedGeneratedTopicExercises': [{
                    'id': 1,
                    'submitted': true,
                    'score': 0,
                    'timeFinish': 830.15,
                    'topicExerciseHash': '99994be1c560a4c043678f645624b682',
                    'exerciseDetail': '[{\'knowns\':\'[{\\\'a\\\':3,\\\'b\\\':2}]\',\'unknowns\':\'[{\\\'x\\\':5}]\',\'userAnswer\':[{\'x\':\'\'}],\'exerciseId\':25},{\'knowns\':\'[{\\\'a\\\':3,\\\'b\\\':1}]\',\'unknowns\':\'[{\\\'x\\\':4}]\',\'userAnswer\':[{\'x\':\'\'}],\'exerciseId\':26},{\'knowns\':\'[{\\\'a\\\':1,\\\'b\\\':4}]\',\'unknowns\':\'[{\\\'x\\\':\\\'Lima\\\'}]\',\'userAnswer\':[{\'x\':\'\'}],\'exerciseId\':31},{\'knowns\':\'[{\\\'a\\\':1,\\\'b\\\':6}]\',\'unknowns\':\'[{\\\'x\\\':7}]\',\'userAnswer\':[{\'x\':\'\'}],\'exerciseId\':29},{\'knowns\':\'[{\\\'a\\\':3,\\\'b\\\':4}]\',\'unknowns\':\'[{\\\'x\\\':\\\'Tujuh\\\'}]\',\'userAnswer\':[{\'x\':\'\'}],\'exerciseId\':32},{\'knowns\':\'[{\\\'a\\\':11,\\\'b\\\':24}]\',\'unknowns\':\'[{\\\'x\\\':35}]\',\'userAnswer\':[{\'x\':\'\'}],\'exerciseId\':6},{\'knowns\':\'[{\\\'a\\\':39,\\\'b\\\':51}]\',\'unknowns\':\'[{\\\'x\\\':90}]\',\'userAnswer\':[{\'x\':\'\'}],\'exerciseId\':7},{\'knowns\':\'[{\\\'a\\\':46,\\\'b\\\':11}]\',\'unknowns\':\'[{\\\'x\\\':57}]\',\'userAnswer\':[{\'x\':\'5555\'}],\'exerciseId\':8}]',
                    'createdAt': '2018-03-28T09:08:56.000Z',
                    'updatedAt': '2018-03-28T09:22:46.000Z',
                    'topicId': 12,
                    'userId': 14
                }]
            }]
          }
        }
      2. Check database if there's school with the same identifier.
      3. Check with synchronizations table to get mapping from client's id to server's id
      4. If there's already mapping, update the data
      5. If there's no mapping, add new data, save the mapping to synchronization table
      6. If every is successful, commit the transaction. Otherwise, abort
      7. Respond to client

    */
    this.routePost('/synchronization/start', (req, res, next) => {
      let syncData = req.body.data
      log.verbose(TAG, `synchronization.POST(): ${JSON.stringify(syncData)}`)
      return this.getDb().sequelize.transaction({ isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE }, trx => {
        const schoolIdentifier = syncData.school.identifier
        return syncService.findSchoolIdByIdentifier(schoolIdentifier).then(resp => {
          if (resp.status) {
            const schoolId = resp.data.id
            return syncService.isReadyToSync(schoolIdentifier, trx).then(resp => {
              if (resp.status) {
                return syncService.createSyncHistory(schoolIdentifier, syncData.syncTime).then(resp => {
                  const syncHistoryId = resp.data.id
                  res.json({ status: true })
                  // TODO: Pas read, mau di kasi trx juga
                  return syncService.syncData(schoolId, syncData, trx).then(() => {
                    return syncService.updateSyncHistory(syncHistoryId, true)
                  }).catch(err => {
                    return syncService.updateSyncHistory(syncHistoryId, false).then(() => {
                      throw err
                    })
                  })
                })
              } else {
                return resp
              }
            })
          } else {
            throw new Error(resp.errMessage)
          }
        })
      }).then(() => {
        log.info(TAG, 'synchronization.POST(): Success!')
      }).catch(err => {
        log.error(TAG, err)
      })
    })
  }

  initialize () {
    return new Promise((resolve, reject) => {
      resolve()
    })
  }
}

module.exports = SyncController
