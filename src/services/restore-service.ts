import * as path from 'path'

import * as zlib from 'zlib'
import Axios from 'axios'
import * as Promise from 'bluebird'
import * as log from 'npmlog'

import { spawn, exec } from 'child_process'
import CRUDService from './crud-service-neo'
import Sequelize = require('sequelize')

const AppConfig = require(path.join(__dirname, '../app-config'))
const TAG = 'RestoreService'

// Path to restore script

/*
Used by local server to get cloud data backup and restore it locally
*/
class RestoreService extends CRUDService {
  restoreCloudData () {
    // isSyncing and setSyncingState have to be atomic to avoid race condition
    return super.getSequelize().transaction({ isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE }, trx => {
      return this.isSyncing(trx).then(resp => {
        if (resp.status && 'data' in resp) {
          const isSyncing = resp.data
          if (isSyncing) {
            throw new Error('Sync is currently progressing!')
          } else {
            return this.setSyncingState(true, trx).then(resp => {
              if (resp.status) {
                return { status: true }
              } else {
                throw new Error('Failed on setSyncingState(): ' + resp.errMessage)
              }
            })
          }
        } else {
          throw new Error('Failed on isSyncing(): ' + resp.errMessage)
        }
      })
    }).then(() => {
      const SCRIPT_PATH = path.join(__dirname, '../scripts/update-local-server/execute_template.sh')
      // Open the script to see out what env variables need to be set
      const env = {
        NCLOUD_SERVER_PATH: AppConfig.LOCAL_SCHOOL_INFORMATION.NCLOUD_SERVER_PATH,
        FILOS_SERVER_PATH: AppConfig.LOCAL_SCHOOL_INFORMATION.FILOS_SERVER_PATH,
        CLOUD_HOST: AppConfig.CLOUD_INFORMATION.HOST,
        SQL_USER: AppConfig.MYSQL_CONF.USERNAME,
        SQL_PASS: AppConfig.MYSQL_CONF.PASSWORD,
        SQL_DB: AppConfig.MYSQL_CONF.DB,
        SCHOOL_IDENTIFIER: AppConfig.LOCAL_SCHOOL_INFORMATION.identifier
      }
      const bashScript = spawn(`bash`, [ SCRIPT_PATH ], { env, detached: true })
      bashScript.stdout.on('data', data => {
        log.info(TAG, data.toString())
        this.addLog(data.toString())
      })

      bashScript.stderr.on('data', data => {
        this.addLog(data.toString())
        log.error(TAG, data.toString())
      })

      bashScript.on('close', (code) => {
        this.setSyncingState(false).catch(err => {
          log.error(TAG, err)
        })
      })
      return { status: true }
    })
  }

  public setSyncingState (syncing: boolean, trx?): Promise<NCResponse<null>> {
    const value = syncing ? '1' : '0'
    return super.readOne<LocalMetaData>({
      modelName: 'LocalMetaData',
      searchClause: { key: 'RestoreState' },
      trx,
      lock: trx ? trx.LOCK.UPDATE : null
    }).then(resp => {
      if (resp.status && resp.data) {
        const message = resp.data
        return super.update<LocalMetaData>({
          modelName: 'LocalMetaData',
          data: { id: message.id, value },
          trx }) as Promise<NCResponse<any>>
      } else {
        return super.create<LocalMetaData>({
          modelName: 'LocalMetaData',
          data: { key: 'RestoreState', value }, trx }) as Promise<NCResponse<any>>
      }
    }).then(resp => {
      return { status: resp.status }
    })
  }

  public isSyncing (trx?): Promise<NCResponse<boolean>> {
    return super.readOne<LocalMetaData>({
      modelName: 'LocalMetaData',
      searchClause: { key: 'RestoreState' },
      trx,
      lock: trx ? trx.LOCK.UPDATE : null
    }).then(resp => {
      if (resp.status && resp.data) {
        return { status: true, data: resp.data.value === '1' }
      } else {
        return { status: true, data: false }
      }
    })
  }

  // TODO: split this to a producer-consumer class?
  public addLog (stringMessage): Promise<NCResponse<null>> {
    return super.getSequelize().transaction({ isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE }, trx => {
      return super.readOne<LocalMetaData>({
        modelName: 'LocalMetaData',
        searchClause: { key: 'RestoreLog' },
        trx,
        lock: trx.LOCK.UPDATE
      }).then(resp => {
        if (resp.status && resp.data) {
          const message = resp.data
          return super.update<LocalMetaData>({
            modelName: 'LocalMetaData',
            data: { id: message.id, value: message.value + stringMessage },
            trx
          }) as Promise<NCResponse<any>>
        } else {
          return super.create<LocalMetaData>({
            modelName: 'LocalMetaData',
            data: { key: 'RestoreLog', value: stringMessage.value },
            trx
          }) as Promise<NCResponse<any>>
        }
      }).then(resp => {
        return { status: resp.status }
      })
    })
  }

  public readLog (): Promise<NCResponse<string>> {
    return super.getSequelize().transaction({ isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE }, trx => {
      return super.readOne<LocalMetaData>({
        modelName: 'LocalMetaData',
        searchClause: { key: 'RestoreLog' },
        trx,
        lock: trx.LOCK.UPDATE
      }).then(resp => {
        if (resp.status && resp.data) {
          const message = resp.data
          return super.update<LocalMetaData>({
            modelName: 'LocalMetaData',
            data: { id: message.id, value: '' },
            trx
          }).then(resp2 => {
            return { status: true, data: message.value }
          })
        } else {
          // Nothing to read
          return { status: true, data: '' }
        }
      }).then((resp: NCResponse<string>) => {
        if (resp.status && resp.data) {
          return { status: true, data: resp.data }
        } else {
          return { status: false, errMessage: resp.errMessage }
        }
      }).catch(err => {
        // We don't wanna throw execption because when we drop our database,
        // there'll be error caused by localMetaData table not existing
        return { status: false, errMessage: err.message }
      })
    })
  }
}

export default new RestoreService()
