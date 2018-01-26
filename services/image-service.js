var path = require('path')
var fs = require('fs')

var log = require('npmlog')
var multer = require('multer')
var Promise = require('bluebird')

var CRUDService = require(path.join(__dirname, 'crud-service'))
var AppConfig = require(path.join(__dirname, '../app-config.js'))

const TAG = 'ImageService'
class ImageService extends CRUDService {
  constructor (sequelize, models) {
    super(sequelize, models)
  }

  getImages () {
    log.verbose(TAG, `Cloud Server Status = ${AppConfig.CLOUD_SERVER}`)
    return new Promise((resolve, reject) => {
      fs.readdir(AppConfig.IMAGE_PATH, (err, files) => {
        if (err) {
          reject(err)
        }
        files = files.map(data => {
          return {
            url: AppConfig.IMAGE_MOUNT_PATH + data, // output: '/images/timestamp_filename.jpg'
            public_id: data
          }
        })
        resolve({status: true, data: {resources: files}})
      })
    })
  }

  static uploadImageMiddleware () {
    var fileName = null
    const upload = multer({
      storage: multer.diskStorage({
        destination: (req, file, callback) => {
          callback(null, AppConfig.IMAGE_PATH)
        },
        filename: (req, file, callback) => {
          fileName = Date.now() + '_' + file.originalname
          callback(null, fileName)
        }
      })
    }).single('file')
    return upload
  }

  deleteImage (fileName) {
    return new Promise((resolve, reject) => {
      var path = AppConfig.IMAGE_PATH + '/' + fileName
      fs.exists(path, (exists) => {
        if (exists) {
          // Unlink is used for remove file
          fs.unlink(path, (err) => {
            if (err) {
              reject(err)
            }
          })
          resolve({status: true})
        } else {
          resolve({status: false, errMessage: 'File tidak ada / sudah dihapus'})
        }
      })
    })
  }
}

module.exports = ImageService