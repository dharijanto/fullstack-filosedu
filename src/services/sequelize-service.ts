import { Sequelize, Models } from 'sequelize'
let log = require('npmlog')

const TAG = 'SequelizeService'

export default class SequelizeService {
  private static instance: SequelizeService
  readonly sequelize: Sequelize
  readonly models: Models

  private constructor (sequelize: Sequelize, models: Models) {
    this.sequelize = sequelize
    this.models = models
  }

  static initialize (sequelize: Sequelize, models: Models) {
    log.verbose(TAG, 'initialize()')
    if (!SequelizeService.instance) {
      SequelizeService.instance = new SequelizeService(sequelize, models)
    } else {
      throw new Error('SequelizeService is already initialized')
    }
  }

  static getInstance (): SequelizeService {
    if (SequelizeService.instance) {
      return SequelizeService.instance
    } else {
      throw new Error('SequelizeService is not initialized!')
    }
  }
}
