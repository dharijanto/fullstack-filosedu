var path = require('path')

var fs = require('fs')
var md5 = require('md5')
var Promise = require('bluebird')

var AppConfig = require(path.join(__dirname, '../app-config'))

class PathFormatter {
  // Used to hash asset with md5 content.
  // The goal is to bypass frontend caching when the content is updated
  //
  // type: 'cms' or 'app'
  // mountPath: http path where the file is mounted
  //
  // TODO: Perhaps this is better to be done as pug utility
  //       (see expressCDN plugin as reference)
  static hashAsset (type, mountPath) {
    var assetPath = null
    if (type === 'cms') {
      assetPath = path.join(AppConfig.VIEWS_CMS_PATH, mountPath)
    } else {
      assetPath = path.join(AppConfig.VIEWS_APP_PATH, mountPath)
    }

    return new Promise((resolve, reject) => {
      return fs.readFile(assetPath, (err, content) => {
        if (err) {
          reject(err)
        } else {
          resolve(mountPath + '?hash=' + md5(content))
        }
      })
    })
  }
}

module.exports = PathFormatter
