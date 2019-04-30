const path = require('path')

const log = require('npmlog')

const BaseController = require(path.join(__dirname, 'base-controller'))
const PathFormatter = require(path.join(__dirname, '../../lib/path-formatter'))

import UserService from '../../services/user-service'
import SchoolService from '../../services/school-service'

const TAG = 'AccountManagementController'

// TODO: Update URL from /get/user/account-management -> /account-management/get/user
class AccountManagementController extends BaseController {
  constructor (initData) {
    super(initData)

    this.addInterceptor((req, res, next) => {
      log.verbose(TAG, 'req.path=' + req.path)
      next()
    })

    this.routeGet('/account-management', (req, res, next) => {
      res.render('account-management')
    })

    this.routeGet('/account-management/school/get', (req, res, next) => {
      SchoolService.getAll().then(resp => {
        res.json(resp)
      })
    })

    this.routeGet('/account-management/user/get', (req, res, next) => {
      const schoolId = req.query.schoolId
      UserService.getUsers(schoolId).then(resp => {
        res.json(resp)
      }).catch(err => {
        next(err)
      })
    })

    this.routePost('/account-management/user/add', (req, res, next) => {
      const schoolId = req.query.schoolId
      return UserService.register({ ...req.body, schoolId }).then(resp => {
        res.json(resp)
      }).catch(err => {
        next(err)
      })
    })

    this.routePost('/account-management/user/edit', (req, res, next) => {
      return UserService.updateCredential(req.body).then(resp => {
        res.json(resp)
      }).catch(next)
    })

    this.routePost('/account-management/user/delete', (req, res, next) => {
      return UserService.deleteById(req.body.id).then(resp => {
        res.json({ status: true })
      }).catch(err => {
        next(err)
      })
    })
  }
}

export = AccountManagementController
