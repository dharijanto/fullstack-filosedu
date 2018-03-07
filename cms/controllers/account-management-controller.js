const path = require('path')

const log = require('npmlog')

const BaseController = require(path.join(__dirname, 'base-controller'))
const PathFormatter = require(path.join(__dirname, '../../lib/path-formatter'))
const UserService = require(path.join(__dirname, '../../services/user-service'))

const TAG = 'AccountManagementController'
class AccountManagementController extends BaseController {
  constructor (initData) {
    super(initData)

    this.addInterceptor((req, res, next) => {
      log.verbose(TAG, 'req.path=' + req.path)
      req.userService = new UserService(this.getDb().sequelize, this.getDb().models)
      next()
    })

    this.routeGet('/accountmanagement', (req, res, next) => {
      PathFormatter.hashBundle('cms', 'js/account-management-cms-bundle.js').then(resp => {
        res.locals.bundle = resp
        res.render('account-management')
      })
    })

    this.routeGet('/get/user/accountmanagement', (req, res, next) => {
      req.userService.getAll().then(resp => {
        res.json(resp)
      })
    })

    this.routePost('/add/user/accountmanagement', (req, res, next) => {
      req.userService.register(req.body).then(resp => {
        res.json(resp)
      }).catch(err => {
        next(err)
      })
    })

    this.routePost('/edit/user/accountmanagement', (req, res, next) => {
      req.userService.updateCredential(req.body).then(resp => {
        res.json(resp)
      }).catch(err => {
        next(err)
      })
    })

    this.routePost('/delete/user/accountmanagement', (req, res, next) => {
      req.userService.deleteById(req.body.id).then(resp => {
        res.json({status: true})
      }).catch(err => {
        next(err)
      })
    })
  }
}

module.exports = AccountManagementController
