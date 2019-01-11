var $ = require('jquery')

require('nc-input-library')
var NCInputManager = require('./nc-input-manager')

$(document).ready(function () {
  var ncInputs = NCInputManager.initializeEditors('#subjectEditor', '#topicEditor', '#topicDependencyEditor', '#subtopicEditor')
})
