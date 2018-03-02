var path = require('path')

var LocalStrategy = require('passport-local').Strategy
var log = require('npmlog')
var passport = require('passport')

var UserService = require(path.join(__dirname, '../services/user-service'))

const TAG = 'PassportManager'
const APP_LOGIN = 'app_login'
const APP_REGISTER = 'app_register'

// Contains all the logic related to passport
class PassportManager {
  initialize () {
    return new Promise((resolve, reject) => {
      // Generic reusable user login
      passport.use(APP_LOGIN, new LocalStrategy({passReqToCallback: true},
        function (req, username, password, cb) {
          log.info(TAG, 'APP_LOGIN: req.site.id=' + req.site.id)
          const userService = new UserService(req.sequelize, req.models)
          userService.login({username, password}).then(resp => {
            if (resp.status) {
              const user = resp.user
              user.siteId = req.site.id
              cb(null, user)
            } else {
              cb(null, false, {message: resp.errMessage, errCode: resp.errCode})
            }
          }).catch(err => {
            cb(err)
          })
        }))

      // Generic reusable user registration
      passport.use(APP_REGISTER, new LocalStrategy({passReqToCallback: true},
        function (req, username, password, cb) {
          log.info(TAG, 'passport.app_register()')
          const userService = new UserService(req.sequelize, req.models)
          userService.register(req.body).then(resp => {
            if (resp.status) {
              const user = resp.user
              user.siteId = req.site.id
              cb(null, user)
            } else {
              cb(null, false, {message: resp.errMessage})
            }
          }).catch(err => {
            log.error(TAG, err)
            cb(null, false, {message: 'Internal error'})
          })
        }))

      resolve()
    })
  }

  authAppLogin (option) {
    return passport.authenticate(APP_LOGIN, option)
  }

  authAppRegistration (option) {
    return passport.authenticate(APP_REGISTER, option)
  }
}

const instance = new PassportManager()
module.exports = instance
