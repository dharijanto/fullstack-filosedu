import * as path from 'path'

import * as Sequelize from 'sequelize'

import RestoreService from '../../../services/restore-service'
import SequelizeService from '../../../services/sequelize-service'

let AppConfig = require(path.join(__dirname, '../../../app-config'))
let createSequelizeModel = require(path.join(__dirname, '../../../db-structure'))
let sequelize = new Sequelize(AppConfig.SQL_DB, { logging: false })
let models = createSequelizeModel(sequelize, {})

SequelizeService.initialize(sequelize, models)

RestoreService.restoreCloudData().then(resp => {
  console.log('restoreCloudData() = ' + JSON.stringify(resp))
  setInterval(() => {
    RestoreService.readLog().then(resp => {
      if (resp.status && resp.data) {
        console.log(resp.data)
      } else {
        console.error('ERR: ' + resp.errMessage)
      }
    })
  }, 2000)
})
