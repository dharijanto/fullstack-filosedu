var http = require('http')
var fs = require('fs')
var path = require('path')

const Sequelize = require('sequelize')
var Promise = require('bluebird')

var AppConfig = require(path.join(__dirname, '../app-config'))
var VideoService = require(path.join(__dirname, '../services/video-service'))
var ImageService = require(path.join(__dirname, '../services/image-service'))

var models = {}
var createSequelizeModel = require(path.join(__dirname, '../db-structure'))
var sequelize = new Sequelize(AppConfig.testDbPath, {logging: false})
models = createSequelizeModel(sequelize, models)

const videoService = new VideoService(sequelize, models)
const imageService = new ImageService(sequelize, models)

var download = function (url, dest, cb) {
  var file = fs.createWriteStream(dest)
  http.get(url, function (response) {
    response.pipe(file)
    file.on('finish', function () {
      file.close(cb)
    })
  }).on('error', (err) => {
    // If error happen, we need to delete local file
    fs.unlink(dest)
    if (cb) {
      cb(err.message)
    }
  })
}

function fetchVideoFromS3 () {
  return videoService.getAll().then(resp => {
    if (resp.status) {
      resp.data.map(data => {
        download(
          AppConfig.AWS_LINK + '/' + AppConfig.AWS_BUCKET_NAME + '/' + data.filename,
          AppConfig.VIDEO_PATH + '/' + data.filename,
          function (e) {
            if (e) {
              console.error(e)
            } else {
              console.log('Download Complete')
            }
          }
        )
      })
    } else {
      console.log('No Video Inside DB')
    }
  }).catch(err => {
    console.error(err)
  })
}

function fetchImageFromS3 () {
  return imageService.getAll().then(resp => {
    if (resp.status) {
    } else {
      console.log('No Image Inside DB')
    }
  }).catch(err => {
    console.error(err)
  })
}

Promise.join(
  fetchVideoFromS3(),
  fetchImageFromS3(),
  function (result1, result2) {
    console.log('Waiting, Downloading File')
  }
).then(resp => {
  console.log('Don\'t forget there\'s Download still ongoing')
})
