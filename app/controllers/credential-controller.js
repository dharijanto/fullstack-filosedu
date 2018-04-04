var path = require('path')
var Promise = require('bluebird')

var log = require('npmlog')
var PassportHelper = require(path.join(__dirname, '../utils/passport-helper'))
var passportManager = require(path.join(__dirname, '../../lib/passport-manager'))

var BaseController = require(path.join(__dirname, 'base-controller'))
var SchoolService = require(path.join(__dirname, '../../services/school-service'))

const TAG = 'CredentialController'

class CredentialController extends BaseController {
  constructor (initData) {
    super(initData)
    const schoolService = new SchoolService(this.getDb().sequelize, this.getDb().models)

    this.addInterceptor((req, res, next) => {
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

    this.routePost('/register', passportManager.authAppRegistration({
      failureRedirect: '/register',
      failureFlash: true
    }), (req, res, next) => {
      res.redirect(req.session.returnTo || '/')
    })

    this.routePost('/login', passportManager.authAppLogin({
      failureRedirect: '/login',
      failureFlash: true
    }), (req, res, next) => {
      log.verbose(TAG, 'submitlogin.POST(): redirecting to: ' + req.session.returnTo)
      res.redirect(req.session.returnTo || '/')
    })

    this.routeGet('/logout', PassportHelper.logOut())
  }

  initialize () {
    return new Promise((resolve, reject) => {
      resolve()
    })
  }
}

module.exports = CredentialController
