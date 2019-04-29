import * as path from 'path'

import * as Sequelize from 'sequelize'

import RestoreService from '../../../services/restore-service'
import SequelizeService from '../../../services/sequelize-service'

let AppConfig = require(path.join(__dirname, '../../../app-config'))
let createSequelizeModel = require(path.join(__dirname, '../../../db-structure'))
let sequelize = new Sequelize(AppConfig.SQL_DB, { logging: false })
let models = createSequelizeModel(sequelize, {})

SequelizeService.initialize(sequelize, models)

RestoreService.setSyncingState(false).then(resp2 => {
  RestoreService.isSyncing().then(resp => {
    if (resp.status && 'data' in resp) {
      const result = resp.data
      console.log(`Expecting false, received=${result}`)
    } else {
      console.log('error!: resp=' + JSON.stringify(resp))
    }
  })
})
