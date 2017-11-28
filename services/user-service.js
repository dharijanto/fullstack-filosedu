var path = require('path')

var Sequelize = require('sequelize')

var BaseService = require(path.join(__dirname, 'base-service'))
// var log = require('npmlog')
// var Promise = require('bluebird')

// const TAG = 'UserService'
class UserService extends BaseService {
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

  // Get user score of a topic
  //
  // Return:
  // 0 - 4: Average of each of the exercises associated with the topic
  getTopicStar (userId, topicId) {
    return this.
  }
}

module.exports = UserService
