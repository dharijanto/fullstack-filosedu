var $ = require('jquery')

require('../nc-input-library/main')
var NCInputManager = require('./nc-input-manager')

$(document).ready(function () {
  var ncInputs = NCInputManager.initializeEditors('#accountEditor')
})