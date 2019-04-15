let path = require('path')

let LocalStrategy = require('passport-local').Strategy
let log = require('npmlog')
let passport = require('passport')
import * as Promise from 'bluebird'
import UserService from '../services/user-service'

const TAG = 'FilosPassportManager'
const APP_LOGIN = 'app_login'
const APP_REGISTER = 'app_register'

// Contains all the logic related to passport
class PassportManager {
  initialize () {
    return new Promise((resolve, reject) => {
      // Generic reusable user login
      passport.use(APP_LOGIN, new LocalStrategy({ passReqToCallback: true },
        function (req, username, password, cb) {
          const schoolId = req.body.schoolId
          log.verbose(TAG, 'APP_LOGIN: req.site.id=' + req.site.id)
          UserService.login({ username, password, schoolId }).then(resp => {
            log.verbose(TAG, 'APP_LOGIN: resp=' + JSON.stringify(resp))
            if (resp.status && resp.data) {
              const user = resp.data
              log.verbose(TAG, 'APP_LOGIN: user=' + JSON.stringify(user))
              cb(null, { ...user, siteId: req.site.id })
            } else {
              cb(null, false, { message: resp.errMessage, errCode: resp.errCode })
            }
          }).catch(err => {
            cb(err)
          })
        }))

      // Generic reusable user registration
      passport.use(APP_REGISTER, new LocalStrategy({ passReqToCallback: true },
        function (req, username, password, cb) {
          log.verbose(TAG, 'passport.app_register()')
          UserService.register(req.body).then(resp => {
            log.verbose(TAG, 'passport.app_register(): resp=' + JSON.stringify(resp))
            if (resp.status && resp.data) {
              const user = resp.data
              cb(null, { ...user, siteId: req.site.id })
            } else {
              cb(null, false, { message: resp.errMessage })
            }
          }).catch(err => {
            log.error(TAG, err)
            cb(null, false, { message: 'Internal error' })
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

export default new PassportManager()
