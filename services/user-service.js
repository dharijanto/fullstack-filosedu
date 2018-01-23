var path = require('path')

var Sequelize = require('sequelize')

var CRUDService = require(path.join(__dirname, 'crud-service'))
// var log = require('npmlog')
// var Promise = require('bluebird')

// const TAG = 'UserService'
class UserService extends CRUDService {
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
