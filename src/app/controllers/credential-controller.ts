import * as path from 'path'
import * as Promise from 'bluebird'

import * as log from 'npmlog'

import PassportManager from '../../lib/passport-manager'

let PassportHelper = require(path.join(__dirname, '../utils/passport-helper'))
let BaseController = require(path.join(__dirname, 'base-controller'))
let SchoolService = require(path.join(__dirname, '../../services/school-service'))

const TAG = 'CredentialController'

class CredentialController extends BaseController {
  constructor (initData) {
    super(initData)
    const schoolService = new SchoolService(this.getDb().sequelize, this.getDb().models)

    this.addInterceptor((req, res, next) => {
      log.verbose(TAG, 'req.path=' + req.path)
      log.verbose(TAG, 'cloudServer=' + res.locals.cloudServer)
      next()
    })

    this.routeGet('/login', (req, res, next) => {
      schoolService.getAll().then(resp => {
        if (resp.status) {
          res.locals.schools = resp.data
        } else {
          next(new Error(resp.errMessage))
        }
        res.locals.error = req.flash('error')
        res.render('login')
      }).catch(err => {
        next(err)
      })
    })

    this.routeGet('/register', (req, res, next) => {
      schoolService.getAll().then(resp => {
        if (resp.status) {
          res.locals.schools = resp.data
        } else {
          next(new Error(resp.errMessage))
        }
        res.locals.error = req.flash('error')
        res.render('register')
      }).catch(err => {
        next(err)
      })
    })

    this.routePost('/register', PassportManager.authAppRegistration({
      failureRedirect: '/register',
      failureFlash: true
    }), (req, res, next) => {
      res.redirect(req.session.returnTo || '/')
    })

    this.routePost('/login', PassportManager.authAppLogin({
      failureRedirect: '/login',
      failureFlash: true
    }), (req, res, next) => {
      log.verbose(TAG, 'submitlogin.POST(): Login success! Redirecting to: ' + (req.session.returnTo || '/'))
      res.redirect(req.session.returnTo || '/')
    })

    this.routeGet('/logout', PassportHelper.logOut())
  }

  initialize () {
    return Promise.resolve()
  }
}

module.exports = CredentialController
