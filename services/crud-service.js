var _ = require('lodash')
var log = require('npmlog')

const TAG = 'CRUDService'

class CRUDService {
  constructor (sequelize, models) {
    this._sequelize = sequelize
    this._models = models
  }

  create ({modelName, data}, trx = null) {
    log.verbose(TAG, `create(): modelName=${modelName} data=${JSON.stringify(data)}`)
    data = _.omit(data, 'id') // We want to allow easy duplication, so we assume that adding data with the same id means creating a duplicate
    if (!data) {
      throw new Error('data has to be specified!')
    }

    return this._models[modelName].create(data, {transaction: trx}).then(createdData => {
      return {status: true, data: createdData.get({plain: true})}
    }).catch(err => {
      if (err.name === 'SequelizeUniqueConstraintError') {
        return {status: false, errMessage: 'Unique Constraint Error'}
      } else if (err.name === 'SequelizeForeignKeyConstraintError') {
        return {status: false, errMessage: 'Foreign Key Constraint Error!'}
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
  read ({modelName, searchClause, order = []}) {
    if (!searchClause) {
      throw new Error('searchClause has to be specified!')
    }
    log.verbose(TAG, `read(): modelName=${modelName} searchClause=${JSON.stringify(searchClause)}`)
    return this._models[modelName].findAll({where: searchClause, order}).then(readData => {
      if (readData.length > 0) {
        return {status: true, data: readData.map(data => data.get({plain: true}))}
      } else {
        return {status: false, errMessage: 'Data not found'}
      }
    })
  }

  readOne ({modelName, searchClause}) {
    return this.read({modelName, searchClause}).then(resp => {
      if (resp.status) {
        return {status: true, data: resp.data[0]}
      } else {
        return resp
      }
    })
  }

  update ({modelName, data}, trx = null) {
    if (!('id' in data)) {
      throw new Error('data needs to have id!')
    }
    log.verbose(TAG, `update(): modelName=${modelName} data=${JSON.stringify(data)}`)

    return this._models[modelName].update(data, {where: {id: data.id}, transaction: trx}).spread((count) => {
      return {status: true}
    }).catch(err => {
      if (err.name === 'SequelizeUniqueConstraintError') {
        return {status: false, errMessage: 'Unique Constraint Error'}
      } else if (err.name === 'SequelizeForeignKeyConstraintError') {
        return {status: false, errMessage: 'Foreign Key Constraint Error!'}
      } else {
        throw err
      }
    })
  }

  delete ({modelName, data}) {
    log.verbose(TAG, `delete(): modelName=${modelName} data=${JSON.stringify(data)}`)
    return this._models[modelName].destroy({where: {id: data.id}}).then(numDeleted => {
      if (numDeleted > 0) {
        return {status: true}
      } else {
        return {status: false, errMessage: 'Data Not Found!'}
      }
    }).catch(err => {
      if (err.name === 'SequelizeUniqueConstraintError') {
        return {status: false, errMessage: 'Unique Constraint Error'}
      } else if (err.name === 'SequelizeForeignKeyConstraintError') {
        return {status: false, errMessage: 'Foreign Key Constraint Error!'}
      } else {
        throw err
      }
    })
  }
}

module.exports = CRUDService
