import * as Promise from 'bluebird'
import { Sequelize, Models, Model, Transaction, Instance, IncludeOptions, WhereOptions } from 'sequelize'
import SequelizeService from './sequelize-service'

let _ = require('lodash')
let log = require('npmlog')

const TAG = 'CRUDService'

export default class CRUDService {
  protected getModels (name) {
    return SequelizeService.getInstance().models[name]
  }

  protected getSequelize () {
    return SequelizeService.getInstance().sequelize
  }

  rawReadQuery (query): Promise<NCResponse<any>> {
    return this.getSequelize().query(query, { type: this.getSequelize().QueryTypes.SELECT }).then(result => {
      return { status: true, data: result }
    })
  }

  rawReadOneQuery (query) {
    return this.rawReadQuery(query).then(resp => {
      if (resp.status) {
        if (!resp.data.length) {
          return { status: false, errMessage: 'Data not found!' }
        } else {
          return resp
        }
      } else {
        return resp
      }
    })
  }

  create <T extends BaseModel> ({ modelName, data, trx }:
                                { modelName: string, data: Partial<T>,
                                  trx?: Transaction }): Promise<NCResponse<T>> {
    log.verbose(TAG, `create(): modelName=${modelName} data=${JSON.stringify(data)}`)
    data = _.omit(data, 'id') // We want to allow easy duplication, so we assume that adding data with the same id means creating a duplicate
    if (!data) {
      throw new Error('Data has to be specified!')
    }
    return (this.getModels(modelName) as Model<Instance<T>, Partial<T>>).create(data, { transaction: trx }).then(createdData => {
      return { status: true, data: createdData.get({ plain: true }) }
    }).catch(err => {
      if (err.name === 'SequelizeUniqueConstraintError') {
        return { status: false, errMessage: 'Unique Constraint Error' }
      } else if (err.name === 'SequelizeForeignKeyConstraintError') {
        return { status: false, errMessage: 'Foreign Key Constraint Error!' }
      } else {
        throw err
      }
    })
  }

  // If there's data to be read:
  // {status: true, data: []}
  //
  // If there's no data:
  // {status: false, errCode: ..., errMessage: ..., errData}
  read<T extends BaseModel> ({ modelName, searchClause, order = [], include, limit, trx }:
                             { modelName: string, searchClause: WhereOptions<T>,
                               order?: Array<Array<string>>,
                               include?: Array<Model<any, any> | IncludeOptions>
                               limit?: number, trx?: Transaction }): Promise<NCResponse<T[]>> {
    if (!searchClause) {
      throw new Error('searchClause has to be specified!')
    }
    log.verbose(TAG, `read(): modelName=${modelName} searchClause=${JSON.stringify(searchClause)}`)
    return this.getModels(modelName).findAll({ where: searchClause, order, include, limit, transaction: trx }).then(readData => {
      if (readData.length > 0) {
        return { status: true, data: readData.map(data => data.get({ plain: true })) }
      } else {
        return { status: false, errMessage: 'Data not found' }
      }
    })
  }

  readOne <T extends BaseModel> ({ modelName, searchClause, order, include, trx }:
                                 { modelName: string, searchClause: WhereOptions<T>,
                                   order?: Array<Array<string>>,
                                   include?: Array<Model<any, any> | IncludeOptions>,
                                   limit?: number, trx?: Transaction
                                 }): Promise<NCResponse<T>> {
    const opts = { modelName, searchClause, order }
    return this.read({ modelName, searchClause, order, include, trx }).then(resp => {
      if (resp.status && resp.data) {
        return { status: true, data: resp.data[0] }
      } else {
        return { status: false, errMessage: resp.errMessage }
      }
    })
  }

  update <T extends BaseModel> ({ modelName, data, trx }:
                                { modelName: string, data: Partial<T>,
                                  trx?: Transaction }): Promise<NCResponse<number>> {
    log.verbose(TAG, `update(): modelName=${modelName} data=${JSON.stringify(data)}`)
    if (data.id) {
      return this.getModels(modelName).update(data, { where: { id: data.id }, transaction: trx }).spread((count) => {
        return { status: true }
      }).catch(err => {
        if (err.name === 'SequelizeUniqueConstraintError') {
          return { status: false, errMessage: 'Unique Constraint Error' }
        } else if (err.name === 'SequelizeForeignKeyConstraintError') {
          return { status: false, errMessage: 'Foreign Key Constraint Error!' }
        } else {
          throw err
        }
      })
    } else {
      throw new Error('Data needs to have id!')
    }
  }

  delete <T extends BaseModel> ({ modelName, data }:
          { modelName: string, data: Partial<T>}): Promise<NCResponse<number>> {
    log.verbose(TAG, `delete(): modelName=${modelName} data=${JSON.stringify(data)}`)
    if (data.id) {
      return this.getModels(modelName).destroy({ where: { id: data.id } }).then(numDeleted => {
        if (numDeleted > 0) {
          return { status: true }
        } else {
          return { status: false, errMessage: 'Data Not Found!' }
        }
      }).catch(err => {
        if (err.name === 'SequelizeUniqueConstraintError') {
          return { status: false, errMessage: 'Unique Constraint Error' }
        } else if (err.name === 'SequelizeForeignKeyConstraintError') {
          return { status: false, errMessage: 'Foreign Key Constraint Error!' }
        } else {
          throw err
        }
      })
    } else {
      throw new Error('Data needs to have id!')
    }
  }
}
