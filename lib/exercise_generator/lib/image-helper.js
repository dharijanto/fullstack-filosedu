var path = require('path')
var url = require('url')

var AppConfig = require('../../../app-config.js')

/*
  Width is on percentage value
*/
function single (fileName, width = 100) {
  var URL = null
  if (AppConfig.CLOUD_SERVER) {
    URL = url.resolve(AppConfig.AWS_IMAGE_CONF.AWS_LINK, path.join(AppConfig.AWS_IMAGE_CONF.AWS_BUCKET_NAME, AppConfig.AWS_IMAGE_CONF.AWS_PREFIX_FOLDER_IMAGE_NAME, fileName))
  } else {
    URL = url.resolve(AppConfig.BASE_URL, path.join(AppConfig.IMAGE_MOUNT_PATH, fileName))
  }
  return "<img src='" + URL + "' width='" + width + "%' />"
}

function repeat (fileName, width = 100, row = 1, column = 1) {
  var URL = null
  if (AppConfig.CLOUD_SERVER) {
    URL = url.resolve(AppConfig.AWS_IMAGE_CONF.AWS_LINK, path.join(AppConfig.AWS_IMAGE_CONF.AWS_BUCKET_NAME, AppConfig.AWS_IMAGE_CONF.AWS_PREFIX_FOLDER_IMAGE_NAME, fileName))
  } else {
    URL = url.resolve('/', path.join(AppConfig.IMAGE_MOUNT_PATH, fileName))
  }
  var table = '<table style="width: 100%;">'
  var tableBody = '<tbody>'
  for (var i = 0; i < row; i++) {
    var tableContent = '<tr>'
    for (var j = 0; j < column; j++) {
      tableContent += '<td style="padding:5px;"><img src="' + URL + '" width="' + width + '%"/></td>'
    }
    tableContent += '</tr>'
    tableBody += tableContent
  }
  tableBody += '</tbody>'
  table += tableBody
  table += '</table>'
  return table
}

module.exports = {
  single,
  repeat
}
