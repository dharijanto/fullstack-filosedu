import * as path from 'path'
import * as zlib from 'zlib'

import * as Promise from 'bluebird'

import { spawn, exec } from 'child_process'

import SchoolService from './school-service'

const AppConfig = require(path.join(__dirname, '../app-config'))

/*
Used by cloud to create backup file to be used by local server
*/
class BackupService {
  // Return sqldump in gzipped format
  getSQLDumpForLocalServer (schoolIdentifier): Promise<Buffer> {
    if (!AppConfig.CLOUD_SERVER) {
      return Promise.reject('This can only be used by cloud server!')
    } else {
      return SchoolService.getByIdentifier(schoolIdentifier).then(resp => {
        if (resp.status && resp.data) {
          return new Promise((resolve, reject) => {
            // Exclude analytics and synchronizations tables since they're only used by cloud server
            exec(`mysqldump --ignore-table=${AppConfig.MYSQL_CONF.DBNAME}.analytics ` +
              `--ignore-table=${AppConfig.MYSQL_CONF.DB}.synchronizations ` +
              `-u${AppConfig.MYSQL_CONF.USERNAME} ${AppConfig.MYSQL_CONF.PASSWORD ? '-p' + AppConfig.MYSQL_CONF.PASSWORD : '' }` +
              `${AppConfig.MYSQL_CONF.DB}`, { maxBuffer: 1024 * 5000 },
                (err, stdout, stderr) => {
                  if (err) {
                    reject(err)
                  } else {
                    zlib.gzip(stdout, (err, result) => {
                      if (err) {
                        reject(err)
                      } else {
                        resolve(result)
                      }
                    })
                  }
                })
          })
        } else {
          throw new Error('School not registered!')
        }
      })
    }
  }
}

export default new BackupService()
