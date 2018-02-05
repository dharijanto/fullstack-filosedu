var path = require('path')
var fs = require('fs')

var AWS = require('aws-sdk')
var log = require('npmlog')
var multer = require('multer')
var Promise = require('bluebird')
var url = require('url')

var CRUDService = require(path.join(__dirname, 'crud-service'))
var AppConfig = require(path.join(__dirname, '../app-config.js'))

const TAG = 'ImageService'

var s3 = new AWS.S3()
AWS.config.update({region: AppConfig.AWS_REGION})

class ImageService extends CRUDService {
  constructor (sequelize, models) {
    super(sequelize, models)
  }

  getImages () {
    log.verbose(TAG, `Cloud Server Status = ${AppConfig.CLOUD_SERVER}`)
    return new Promise((resolve, reject) => {
      var params = {
        Bucket: 'examplebucket',
        Key: 'images_v1/'
      }

      s3.getObject(params, (err, data) => {
        if (err) {
          reject(err)
        } else {
          console.log(data)
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
        }
      })
    })
  }

  getAll () {
    return this._models['Images'].all({order: [['createdAt', 'DESC']]}).then(data => {
      if (data.length > 0) {
        var queryResult = data.map(result => {
          return {
            id: result.id,
            selfHostedURL: result.filename,
            remoteHostedURL: JSON.parse(result.sourceLink)
          }
        })
        return {
          status: true,
          data: queryResult
        }
      } else {
        return {status: true, data: {resources: []}}
      }
    }).catch(err => {
      console.error(err)
      return {status: false, errCode: 0, errMessage: 'Data not found'}
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
      // var imageLocation = path.join(AppConfig.IMAGE_PATH, fileName)
      var imageLocation = AppConfig.IMAGE_PATH + fileName
      fs.access(imageLocation, fs.constants.F_OK, (err) => {
        if (err) {
          console.log(err)
          reject(err)
        } else {
          console.log('is exists')
        }
        console.log('kdkdkdkdkdk')
      })
    })
    //   fs.exists(imageLocation, (exists) => {
    //     if (exists) {
    //       // Unlink is used for remove file
    //       fs.unlink(imageLocation, (err) => {
    //         if (err) {
    //           reject(err)
    //         }
    //       })
    //       resolve({status: true})
    //     } else {
    //       resolve({status: false, errMessage: 'File tidak ada / sudah dihapus'})
    //     }
    //   })
    // })
  }

  addImage (filename, sourceLink = null) {
    return this.create({
      modelName: 'Images',
      data: {
        filename,
        sourceLink
      }
    }).then(resp => {
      console.log(resp)
      if (resp.status) {
        return {
          status: true,
          data: {
            filename: resp.data.filename
          }
        }
      } else {
        return resp
      }
    })
  }

  uploadImageToS3 (fileName) {
    // example content fileName : 1517392398808_601_Arti_Pecahan.mp4
    return new Promise((resolve, reject) => {
      fs.readFile(path.join(AppConfig.IMAGE_PATH, fileName), (err, data) => {
        if (err) {
          reject(err)
        }
        // Changing from new Buffer to Buffer.from because it's deprecated in node v6
        var base64data = Buffer.from(data, 'binary')
        var params = {
          Bucket: AppConfig.AWS_BUCKET_NAME,
          Key: path.join(AppConfig.AWS_PREFIX_FOLDER_IMAGE_NAME, fileName),
          Body: base64data,
          ACL: 'public-read'
        }

        s3.putObject(params, function (err1, data1) {
          if (err1) {
            /* when error, we delete local file, its either success or fail */
            fs.unlink(path.join(AppConfig.IMAGE_PATH, fileName), (err2, data2) => {
              reject(err1)
            })
          } else {
            resolve({
              status: true,
              data: {
                URL: AppConfig.AWS_LINK + '/' + path.join(AppConfig.AWS_BUCKET_NAME, AppConfig.AWS_PREFIX_FOLDER_IMAGE_NAME, fileName)
              }
            })
          }
        })
      })
    })
  }

  uploadAndSaveImageToDB (fileName) {
    return new Promise((resolve, reject) => {
      if (AppConfig.CLOUD_SERVER) {
        this.uploadImageToS3(fileName).then(resp => {
          if (resp.status) {
            return this.addImage(fileName, JSON.stringify(resp.data.URL)).then(resp2 => {
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
        return this.addImage(fileName, null).then(resp2 => {
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

module.exports = ImageService
