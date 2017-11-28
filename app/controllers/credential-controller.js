var path = require('path')

var log = require('npmlog')
var PassportHelper = require(path.join(__dirname, '../utils/passport-helper'))
var passport = require('passport')

var BaseController = require(path.join(__dirname, 'base-controller'))

const TAG = 'CredentialController'

class CredentialController extends BaseController {
  constructor (initData) {
    super(initData)

    this.routeGet('/login', (req, res, next) => {
      res.locals.error = req.flash('error')
      res.render('login')
    })

    this.routeGet('/register', (req, res, next) => {
      res.locals.error = req.flash('error')
      res.render('register')
    })

    this.routePost('/register', passport.authenticate('app_register', {
      failureRedirect: '/register',
      failureFlash: true
    }), (req, res, next) => {
      res.redirect(req.session.returnTo || '/')
    })

    this.routePost('/login', passport.authenticate('app_login', {
      failureRedirect: '/login',
      failureFlash: true
    }), (req, res, next) => {
      log.verbose(TAG, 'submitlogin.POST(): redirecting to: ' + req.session.returnTo)
      res.redirect(req.session.returnTo || '/')
    })

    this.routeGet('/logout', PassportHelper.logOut())
  }
}

module.exports = CredentialController
