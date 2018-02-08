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
      return this._models['Images'].findAll({order: [['createdAt', 'DESC']]}).then(datas => {
        if (datas.length > 0) {
          if (AppConfig.CLOUD_SERVER) {
            datas = datas.map(data => {
              return {
                url: data.sourceLink,
                public_id: data.filename
              }
            })
          } else {
            datas = datas.map(data => {
              var localURL = url.resolve('/', path.join(AppConfig.IMAGE_MOUNT_PATH, data.filename))
              return {
                url: localURL,
                public_id: data.filename
              }
            })
          }
          resolve({
            status: true,
            data: {
              resources: datas
            }
          })
        } else {
          resolve({
            status: true,
            data: {
              resources: []
            }
          })
        }
      }).catch(err => {
        log.verbose(`ImageService GetImages Error Message = ${JSON.stringify(err)}`)
        reject(err)
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

  _deleteImageLocal (fileName) {
    return new Promise((resolve, reject) => {
      fs.unlink(path.join(AppConfig.IMAGE_PATH, fileName), (err) => {
        if (err) {
          resolve(err)
        } else {
          resolve({status: true})
        }
      })
    })
  }

  _deleteImageDB (fileName) {
    return new Promise((resolve, reject) => {
      this._models['Images'].destroy({where: {filename: fileName}}).then(numRows => {
        resolve({status: true})
      }).catch(err => {
        reject(err)
      })
    })
  }

  deleteImage (fileName) {
    return Promise.join(
      this._deleteImageLocal(fileName),
      this._deleteImageDB(fileName),
      function (resp1, resp2) {
        if (AppConfig.CLOUD_SERVER) {
          var params = {
            Bucket: AppConfig.AWS_BUCKET_NAME,
            Key: AppConfig.AWS_PREFIX_FOLDER_IMAGE_NAME + fileName
          }

          // TODO: my account aws not allowed to delete
          s3.deleteObject(params, function (err, data) {
            if (err) {
              log.verbose(`s3 delete object = ${JSON.stringify(err)}`)
              return err
            } else {
              return {status: true}
            }
          })
        } else {
          if (resp1.status && resp2.status) {
            return {status: true}
          } else {
            return {status: false}
          }
        }
      }
    ).then(result => {
      return result
    })
  }

  _addImage (filename, sourceLink = null) {
    return this.create({
      modelName: 'Images',
      data: {
        filename,
        sourceLink
      }
    }).then(resp => {
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

  _uploadImageToS3 (fileName) {
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
            // when error, we delete local file, its either success or fail
            fs.unlink(path.join(AppConfig.IMAGE_PATH, fileName), (err2, data2) => {
              reject(err1)
            })
          } else {
            resolve({
              status: true,
              data: {
                URL: url.resolve(AppConfig.AWS_LINK, path.join(AppConfig.AWS_BUCKET_NAME, AppConfig.AWS_PREFIX_FOLDER_IMAGE_NAME, fileName))
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
        this._uploadImageToS3(fileName).then(resp => {
          if (resp.status) {
            return this._addImage(fileName, resp.data.URL).then(resp2 => {
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
        return this._addImage(fileName, null).then(resp2 => {
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
