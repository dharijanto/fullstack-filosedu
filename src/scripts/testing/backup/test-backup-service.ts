import BackupService from '../../../services/backup-service'
import { exec } from 'child_process'
import * as fs from 'fs'
import * as zlib from 'zlib'

BackupService.getSQLDumpForLocalServer('rptra_rawa_buaya').then(data => {
  /* fs.writeFile('/home/aharijanto/test.gzip', data, (err) => {
    if (err) {
      console.error(err)
    } else {
      console.log('success')
    }
  }) */
  zlib.gunzip(data, (err, result) => {
    if (err) {
      console.error(err)
    } else {
      console.log(result.toString())
    }
  })
  /* exec(`echo ${data} | gzip -d`, (err, stdout, stderr) => {
    if (err) {
      throw err
    } else {
      console.log(stdout)
    }
  }) */
}).catch(err => {
  console.error(err)
})
