var path = require('path')

var AWS = require('aws-sdk')
var fs = require('fs')
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

  addVideo (filename, sourceLink=null, subtopicId) {
    return this.create({
      modelName: 'Videos',
      data: {
        filename,
        sourceLink: JSON.stringify(sourceLink),
        subtopicId
      }
    }).then(resp => {
      if (resp.status) {
        return {status: true, data: {videoURL: url.resolve(AppConfig.VIDEO_MOUNT_PATH, filename)}}
      } else {
        return resp
      }
    })
  }

  addFeedback (videoId, userId, value) {
    return this.create({
      modelName: 'Feedbacks',
      data: {
        videoId,
        userId,
        value
      }
    })
  }

  getVideo (subtopicId) {
    return this._models['Videos'].findOne({where: {subtopicId}, order: [['createdAt', 'DESC']]}).then(data => {
      if (data) {
        return {
          status: true,
          data: {
            id: data.id,
            videoURL: url.resolve(AppConfig.VIDEO_MOUNT_PATH, data.filename),
            filename: data.filename,
            sourceLink: JSON.parse(data.sourceLink)
          }
        }
      } else {
        return {status: false, errCode: 0, errMessage: 'Data not found'}
      }
    })
  }

  getAll () {
    return this._models['Videos'].all({order: [['createdAt', 'DESC']]}).then(data => {
      if (data) {
        var queryResult = data.map(result => {
          return {
            id: result.id,
            filename: result.filename
          }
        })
        return {
          status: true,
          data: queryResult
        }
      } else {
        return {status: false, errCode: 0, errMessage: 'Data not found'}
      }
    })
  }

  static getUploadMiddleware () {
    var fileName = ''
    const upload = multer({
      storage: multer.diskStorage({
        destination: (req, file, callback) => {
          callback(null, AppConfig.VIDEO_PATH)
        },
        filename: (req, file, callback) => {
          var originalName = file.originalname.split(' ').join('_')
          fileName = Date.now() + '_' + originalName
          callback(null, fileName)
        }
      }),
      limits: {
        files: 1
      }
    }).single('video')
    return upload
  }

  uploadVideoToS3 (fileName) {
    // example content fileName : 1517392398808_601_Arti_Pecahan.mp4
    return new Promise ((resolve, reject) => {
      fs.readFile(AppConfig.VIDEO_PATH + '/' + fileName, (err, data) => {
        if (err) {
          reject(err)
        }
        var s3 = new AWS.S3()
        AWS.config.update({region: 'ap-southeast-1'})
        var base64data = new Buffer(data, 'binary')
        var params = {
          Bucket: 'ncloud-testing',
          Key: fileName,
          Body: base64data,
          ACL: 'public-read'
        }

        s3.putObject(params, function (err1, data1) {
          if (err1) {
            /* when error, we delete local file, its either success or fail */
            fs.unlink(AppConfig.VIDEO_PATH + '/' + fileName, (err2, data2) => {
              reject(err1)
            })
          } else {
              var elastictranscoder = new AWS.ElasticTranscoder()
              var paramElastic = {
              PipelineId: '1517283530132-1wj56s', /* required */
              Input: {
                Key: fileName,
              },
              // OutputKeyPrefix mean folder tujuan di S3
              // If not exist, it will create new
              OutputKeyPrefix: 'videos_v1/',
              Outputs: [
                {
                  Key: '360p_'+ fileName,
                  PresetId: '1517305976374-exb5fa',
                },
                {
                  Key: '720p_' + fileName,
                  PresetId: '1351620000001-000010'
                }
              ],
            }

            elastictranscoder.createJob(paramElastic, function(err3, data3) {
              if (err3) {
                fs.unlink(AppConfig.VIDEO_PATH + '/' + fileName, (err2, data2) => {
                  reject(err1)
                })
                reject(err3)
              } else {
                const awsURLPath = 'https://s3-ap-southeast-1.amazonaws.com/ncloud-testing/videos_v1/'
                resolve({status: true,
                  data: {
                    URL: {
                      'nonHD': awsURLPath + '360p_'+ fileName,
                      'HD': awsURLPath + '720p_'+ fileName
                    }
                  }
                })
              }
            })
          }
        })
      })
    })
  }
}

module.exports = VideoService
