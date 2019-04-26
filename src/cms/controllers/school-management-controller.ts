const path = require('path')

const log = require('npmlog')

const AppConfig = require(path.join(__dirname, '../../app-config'))

const BaseController = require(path.join(__dirname, 'base-controller'))
const ImageService = require(path.join(__dirname, '../../services/image-service'))
const PathFormatter = require(path.join(__dirname, '../../lib/path-formatter'))

import SchoolService from '../../services/school-service'

const TAG = 'SchoolManagementController'
class SchoolManagementController extends BaseController {
  constructor (initData) {
    super(initData)
    const imageService = new ImageService(this.getDb().sequelize, this.getDb().models)

    this.addInterceptor((req, res, next) => {
      log.verbose(TAG, 'req.path=' + req.path)
      next()
    })

    this.routeGet('/schoolmanagement', (req, res, next) => {
      res.render('school-management')
    })

    this.routeGet('/school/management/get', (req, res, next) => {
      SchoolService.getAll().then(resp => {
        res.json(resp)
      })
    })

    this.routePost('/school/management/add', (req, res, next) => {
      SchoolService.create({ modelName: 'School', data: req.body }).then(resp => {
        res.json(resp)
      }).catch(err => {
        next(err)
      })
    })

    this.routePost('/school/management/edit', (req, res, next) => {
      SchoolService.update({ modelName: 'School', data: req.body }).then(resp => {
        res.json(resp)
      }).catch(err => {
        next(err)
      })
    })

    this.routePost('/school/management/delete', (req, res, next) => {
      SchoolService.deleteById(req.body.id).then(resp => {
        res.json({ status: true })
      }).catch(err => {
        next(err)
      })
    })

    this.routeGet('/school/images/get', (req, res, next) => {
      log.verbose(TAG, `req.path = ${req.path}`)
      imageService.getImages().then(resp => {
        if (resp.status) {
          return res.json({ status: true, data: resp.data })
        } else {
          return res.json({ status: false })
        }
      }).catch(err => {
        next(err)
      })
    })

    // Because uploading can take sometime
    function extendTimeout (req, res, next) {
      res.setTimeout(480000)
      next()
    }

    this.routePost('/school/images/add', extendTimeout, (req, res, next) => {
      log.verbose(TAG, `req.path = ${req.path}`)
      ImageService.uploadImageMiddleware()(req, res, err => {
        if (err) {
          res.json({ status: false, errMessage: err.message })
        } else {
          imageService.uploadAndSaveImageToDB(req.file.filename).then(resp => {
            if (resp.status) {
              res.json({
                status: true,
                data: {
                  url: AppConfig.IMAGE_MOUNT_PATH + resp.data.filename,
                  public_id: resp.data.filename,
                  originalName: resp.data.filename,
                  created_at: resp.data.filename.split('_')[0]
                }
              })
            } else {
              res.json({
                status: true,
                data: {}
              })
            }
          }).catch(err => {
            console.error(err)
            next(err)
          })
        }
      })
    })

    this.routePost('/school/images/delete', (req, res, next) => {
      log.verbose(TAG, `req.path = ${req.path}`)
      // publicId here means filename
      imageService.deleteImage(req.query.publicId).then(resp => {
        res.json(resp)
      }).catch(err => {
        next(err)
      })
    })
  }
}

module.exports = SchoolManagementController
