import * as path from 'path'

import * as Sequelize from 'sequelize'

import RestoreService from '../../../services/restore-service'
import SequelizeService from '../../../services/sequelize-service'

let AppConfig = require(path.join(__dirname, '../../../app-config'))
let createSequelizeModel = require(path.join(__dirname, '../../../db-structure'))
let sequelize = new Sequelize(AppConfig.SQL_DB, { logging: false })
let models = createSequelizeModel(sequelize, {})

/*
TODO: Use mocha for this
https://www.npmjs.com/package/mocha-typescript
*/

SequelizeService.initialize(sequelize, models)

let count = 0
setInterval(() => {
  count++
  RestoreService.addLog('Hello ' + count + '\n')
}, 1200)

let count2 = 0
setInterval(() => {
  count2++
  RestoreService.addLog('world ' + count2 + '\n')
}, 700)

// We need to check that there's no duplicate nor missing read
// I.e.
// Hello and World ordering are always consecutive
setInterval(() => {
  RestoreService.readLog().then(resp => {
    if (resp.status) {
      console.log(resp.data)
    }
  })
}, 300)
