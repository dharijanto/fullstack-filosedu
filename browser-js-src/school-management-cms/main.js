var $ = require('jquery')

require('../nc-input-library/main')
var NCInputManager = require('./nc-input-manager')
require('../nc-image-picker')

var rootPath = require('cmsRootPath')

$(document).ready(function () {
  var ncInputs = NCInputManager.initializeEditors('#schoolEditor')

  $('input[name="logo"]').NCImagePicker({
    callbackFn: (imgSrc) => {
      $('input[name=logo]').val(imgSrc)
    },
    getURL: rootPath + 'school/images/get',
    postURL: rootPath + 'school/images/add',
    deleteURL: rootPath + 'school/images/delete'
  })
})
