var path = require('path')

var log = require('npmlog')
var multer = require('multer')
var Promise = require('bluebird')
var Sequelize = require('sequelize')
var url = require('url')

const AppConfig = require(path.join(__dirname, '../app-config'))
var CRUDService = require(path.join(__dirname, 'crud-service'))

const TAG = 'VideoService'

class VideoService extends CRUDService {
  constructor (sequelize, models) {
    super(sequelize, models)
  }

  addVideo (filename, subtopicId) {
    return this.create({
      modelName: 'Videos',
      data: {
        filename,
        subtopicId
      }
    }).then(resp => {
      if (resp.status) {
        return {status: true, data: {videoUrl: url.resolve(AppConfig.VIDEO_MOUNT_PATH, filename)}}
      } else {
        return resp
      }
    })
  }

  getVideo (subtopicId) {
    return this.models['Videos'].findOne({where: {subtopicId}, order: ['createdAt', 'DESC']})
  }

  static getUploadMiddleware () {
    const upload = multer({
      storage: multer.diskStorage({
        destination: (req, file, callback) => {
          callback(null, AppConfig.VIDEO_PATH)
        },
        filename: (req, file, callback) => {
          callback(null, Date.now() + '_' + file.originalname)
        }
      }),
      limits: {
        files: 1
      }
    }).single('video')

    return upload
  }
}

module.exports = VideoService
