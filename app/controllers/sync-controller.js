var path = require('path')

var _ = require('lodash')
var log = require('npmlog')
var Promise = require('bluebird')

var BaseController = require(path.join(__dirname, 'base-controller'))

var SyncService = require(path.join(__dirname, '../../services/sync-service'))

const TAG = 'SyncController'

class SyncController extends BaseController {
  constructor (initData) {
    super(initData)
    const syncService = new SyncService(this.getDb().sequelize, this.getDb().models)

    this.addInterceptor((req, res, next) => {
      next()
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
    this.routePost('/synchronization', (req, res, next) => {
      var postData = req.body.data

      log.verbose(TAG, `synchronization.POST(): ${JSON.stringify(postData)}`)
      const schoolIdentifier = postData.school.identifier
      return syncService.findSchoolIdByIdentifier(schoolIdentifier).then(resp => {
        if (resp.status) {
          const schoolId = resp.data.id
          return this.getDb().sequelize.transaction(trx => {
            // TODO: Pas read, mau di kasi trx juga
            return Promise.each(postData.datas, (data, index) => {
              return syncService.processUser(data['user'], schoolIdentifier, schoolId, trx).then(userId => {
                // This is where we trying to remove data that contain object user.
                // Remember that we process data sorted by user first
                data = _.omit(data, 'user')
                return Promise.map(Object.keys(data), key => {
                  log.verbose(TAG, `synchronization.POST(): processing key=${key}`)
                  const tableName = syncService.getTableName(key)
                  const modelName = syncService.getModelName(key)
                  return Promise.each(data[key], data => {
                    return syncService.getSingleSynchronization(data.id, schoolIdentifier, tableName).then(resp2 => {
                      if (resp2.status) {
                        var cloudId = resp2.data.cloudId
                        // if exists
                        return syncService.updateTable(data, modelName, cloudId, trx, userId).then(resp3 => {
                          if (resp3.status) {
                            return true
                          } else {
                            throw new Error(`Failed to update ${tableName} table: ${resp3.errMessage}`)
                          }
                        })
                      } else {
                        return syncService.insertRow(data, modelName, schoolId, userId, trx).then(resp3 => {
                          if (resp3.status) {
                            return syncService.insertToSyncTable(
                              data.id,
                              schoolIdentifier,
                              tableName,
                              resp3.data.id,
                              trx).then(resp4 => {
                                if (resp4.status) {
                                  return true
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
          }).then(commitSuccess => {
            res.json({status: true})
          })
        } else {
          res.json({status: false, errMessage: 'Unrecognized school'})
        }
      }).catch(err => {
        log.error(TAG, err)
        res.json({status: false, errMessage: err.message})
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
