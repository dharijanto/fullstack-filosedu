/*
This script is used to sync a local server's videos and images
with what's specified in the database. The files are downloaded
from S3

Install and configure Filos on a local server:
1. Download source code
2. Create and configure app-config.js base on app-config_template.js
3. Restore database from filosedu-backup git
4. Run this script

*/

var https = require('https')
var fs = require('fs')
var path = require('path')

const Sequelize = require('sequelize')
var Promise = require('bluebird')

var AppConfig = require(path.join(__dirname, '../app-config'))
var VideoService = require(path.join(__dirname, '../services/video-service'))
var ImageService = require(path.join(__dirname, '../services/image-service'))

var createSequelizeModel = require(path.join(__dirname, '../db-structure'))
var sequelize = new Sequelize(AppConfig.SQL_DB, {logging: false})
var models = createSequelizeModel(sequelize, {})

const videoService = new VideoService(sequelize, models)
const imageService = new ImageService(sequelize, models)

const CONCURRENT_DOWNLOAD = 3

var download = function (url, dest) {
  return new Promise((resolve, reject) => {
    return fs.access(dest, fs.F_CONSTANT_OK, (err) => {
      if (err) {
        var file = fs.createWriteStream(dest)
        https.get(url, function (response) {
          response.pipe(file)
          file.on('finish', function () {
            file.close(() => {
              resolve()
            })
          })
        }).on('error', (err) => {
          // If error happen, we need to delete local file
          fs.unlink(dest, err => {
            console.error(err)
          })
          reject(err)
        })
      } else {
        console.log('download(): file=' + dest + ' is already existed. Skipped...')
        resolve()
      }
    })
  })
}

function fetchVideoFromS3 () {
  return videoService.getAllVideos().then(resp => {
    if (resp.status) {
      const videos = resp.data
      console.log(`There are ${videos.length} number of videos to download...`)
      return Promise.map(videos, video => {
        return download(
          JSON.parse(video.sourceLink).HD,
          AppConfig.VIDEO_PATH + '/' + video.filename)
      })
    } else {
      return Promise.resolve()
    }
  }).catch(err => {
    console.error(err)
  })
}

function fetchImageFromS3 () {
  return imageService.getAllImages().then(resp => {
    if (resp.status) {
      const images = resp.data
      console.log(`There are ${images.length} images to download...`)
      return Promise.map(images, image => {
        return fs.access(AppConfig.IMAGE_PATH + '/' + image.filename, fs.F_CONSTANT_OK, (err) => {
          if (err) {
            return download(
              image.sourceLink,
              AppConfig.IMAGE_PATH + '/' + image.filename)
          } else {
            console.log('Image File Already Exists, No Download Required')
          }
        })
      })
    } else {
      console.log('No Image Inside DB')
    }
  }).catch(err => {
    console.error(err)
  })
}

console.log('Downloading files....')
Promise.join(
  fetchVideoFromS3(),
  fetchImageFromS3()
).then(resp => {
  console.log('done!')
  sequelize.close()
}).catch(err => {
  console.error(err)
})
