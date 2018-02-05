var path = require('path')

var AWS = require('aws-sdk')
var fs = require('fs')
var log = require('npmlog')
var multer = require('multer')
var Promise = require('bluebird')
var url = require('url')

const AppConfig = require(path.join(__dirname, '../app-config'))
var CRUDService = require(path.join(__dirname, 'crud-service'))

const TAG = 'VideoService'

class VideoService extends CRUDService {
  constructor (sequelize, models) {
    super(sequelize, models)
  }

  addVideo (filename, sourceLink = null, subtopicId) {
    return this.create({
      modelName: 'Videos',
      data: {
        filename,
        sourceLink,
        subtopicId
      }
    }).then(resp => {
      if (resp.status) {
        return {
          status: true,
          data: {
            selfHostedURL: url.resolve(AppConfig.VIDEO_MOUNT_PATH, filename)
          }
        }
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
            selfHostedURL: url.resolve(AppConfig.VIDEO_MOUNT_PATH, data.filename),
            filename: data.filename,
            remoteHostedURL: JSON.parse(data.sourceLink)
          }
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
    return new Promise((resolve, reject) => {
      fs.readFile(path.join(AppConfig.VIDEO_PATH, fileName), (err, data) => {
        if (err) {
          reject(err)
        }
        var s3 = new AWS.S3()
        AWS.config.update({region: AppConfig.AWS_REGION})
        // Changing from new Buffer to Buffer.from because it's deprecated in node v6
        var base64data = Buffer.from(data, 'binary')
        var params = {
          Bucket: AppConfig.AWS_BUCKET_NAME,
          Key: fileName,
          Body: base64data,
          ACL: 'public-read'
        }

        s3.putObject(params, function (err1, data1) {
          if (err1) {
            /* when error, we delete local file, its either success or fail */
            fs.unlink(path.join(AppConfig.VIDEO_PATH, fileName), (err2, data2) => {
              reject(err1)
            })
          } else {
            var elastictranscoder = new AWS.ElasticTranscoder()
            var paramElastic = {
              PipelineId: AppConfig.AWS_PIPELINE_ID, /* required */
              Input: {
                Key: fileName
              },
              // OutputKeyPrefix mean folder tujuan di S3
              // If not exist, it will create new
              OutputKeyPrefix: AppConfig.AWS_PREFIX_FOLDER_VIDEO_NAME,
              Outputs: [
                {
                  Key: AppConfig.PREFIX_360P + fileName,
                  PresetId: AppConfig.AWS_360P_PRESET_ID
                },
                {
                  Key: AppConfig.PREFIX_720P + fileName,
                  PresetId: AppConfig.AWS_720P_PRESET_ID
                }
              ]
            }

            elastictranscoder.createJob(paramElastic, function (err3, data3) {
              if (err3) {
                fs.unlink(path.join(AppConfig.VIDEO_PATH, fileName), (err2, data2) => {
                  reject(err1)
                })
                reject(err3)
              } else {
                // this aws link cannot insert inside path.join, because it will edit from http:// to http:/
                // thus make video not playable from videojs
                const awsURLPath = AppConfig.AWS_LINK + '/' + path.join(AppConfig.AWS_BUCKET_NAME, AppConfig.AWS_PREFIX_FOLDER_VIDEO_NAME)
                const aws360pURL = awsURLPath + AppConfig.PREFIX_360P + fileName
                const aws720pURL = awsURLPath + AppConfig.PREFIX_720P + fileName
                resolve({status: true,
                  data: {
                    URL: {
                      'nonHD': aws360pURL,
                      'HD': aws720pURL
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

  uploadAndSaveVideoToDB (fileName, subtopicId) {
    return new Promise((resolve, reject) => {
      if (AppConfig.CLOUD_SERVER) {
        this.uploadVideoToS3(fileName).then(resp => {
          if (resp.status) {
            return this.addVideo(fileName, JSON.stringify(resp.data.URL), subtopicId).then(resp2 => {
              if (resp2.status) {
                resolve(resp2)
              } else {
                resolve({status: false})
              }
            })
          } else {
            resolve({status: false})
          }
        }).catch(err => {
          reject(err)
        })
      } else {
        return this.addVideo(fileName, null, subtopicId).then(resp2 => {
          if (resp2.status) {
            resolve(resp2)
          } else {
            resolve({status: false})
          }
        }).catch(err => {
          reject(err)
        })
      }
    })
  }
}

module.exports = VideoService
