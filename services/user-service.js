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

  // Check the best 4 of sumitted exercises
  //
  // Return:
  // 0 - 4: How many of the submitted scores are > 80%
  getExerciseStar (userId, exerciseId) {
    return this._sequelize.query(`SELECT score FROM generatedExercises WHERE submitted = 1 AND userId = ${userId} AND exerciseId = ${exerciseId} ORDER BY score DESC LIMIT 4;`,
      { type: Sequelize.QueryTypes.SELECT }).then(datas => {
        const stars = datas.reduce((acc, data) => {
          if (parseInt(data.score) >= 80) {
            return acc + 1
          } else {
            return acc
          }
        }, 0)
        return {status: true, data: {stars}}
      })
  }
}

module.exports = UserService
