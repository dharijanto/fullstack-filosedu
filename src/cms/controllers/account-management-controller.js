const path = require('path')

const log = require('npmlog')

const BaseController = require(path.join(__dirname, 'base-controller'))
const PathFormatter = require(path.join(__dirname, '../../lib/path-formatter'))
const UserService = require(path.join(__dirname, '../../services/user-service'))
const SchoolService = require(path.join(__dirname, '../../services/school-service'))

const TAG = 'AccountManagementController'

// TODO: Update URL from /get/user/accountmanagement -> /accountmanagement/get/user
class AccountManagementController extends BaseController {
  constructor (initData) {
    super(initData)
    const userService = new UserService(this.getDb().sequelize, this.getDb().models)
    const schoolService = new SchoolService(this.getDb().sequelize, this.getDb().models)

    this.addInterceptor((req, res, next) => {
      log.verbose(TAG, 'req.path=' + req.path)
      next()
    })

    this.routeGet('/accountmanagement', (req, res, next) => {
      res.render('account-management')
    })

    this.routeGet('/accountmanagement/user/get', (req, res, next) => {
      userService.getAll().then(resp => {
        res.json(resp)
      }).catch(err => {
        next(err)
      })
    })

    this.routePost('/accountmanagement/user/add', (req, res, next) => {
      schoolService.readOne({modelName: 'School', searchClause: {name: req.body['school.name']}}).then(resp => {
        if (resp.status) {
          const data = Object.assign(req.body, {schoolId: resp.data.id})
          return userService.register(data).then(resp => {
            res.json(resp)
          })
        } else {
          res.json(resp)
        }
      }).catch(err => {
        next(err)
      })
    })

    this.routePost('/accountmanagement/user/edit', (req, res, next) => {
      return userService.updateCredential(req.body).then(resp => {
        res.json(resp)
      }).catch(next)
    })

    this.routePost('/accountmanagement/user/delete', (req, res, next) => {
      return userService.deleteById(req.body.id).then(resp => {
        res.json({status: true})
      }).catch(err => {
        next(err)
      })
    })
  }
}

module.exports = AccountManagementController
