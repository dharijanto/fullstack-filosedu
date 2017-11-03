var log = require('npmlog')
var Promise = require('bluebird')

const TAG = 'UserService'
// Extend BaseService
class UserService {
  constructor (sequelize, models) {
    this._sequelize = sequelize
    this._models = models
  }

  // Use promise, no callback
  findByUsername (username, cb) {
    return this._models['User'].findOne({where: {username}}).then(readData => {
      if (readData !== null) {
        return cb(null, readData.dataValues)
      } else {
        return cb(null, null)
      }
    })
  }

  // Use promise, no callback
  findById (userId, cb) {
    return this._models['User'].findOne({where: {id: userId}}).then(readData => {
      if (readData !== null) {
        return cb(null, readData.dataValues)
      } else {
        return cb(null, null)
      }
    })
  }
}

module.exports = UserService
