var $ = require('jquery')
var _ = require('lodash')
var axios = require('axios')
var rootPath = require('cmsRootPath')

var codeMirror = require('codemirror')
require('jquery-simple-upload')
var marked = require('marked')
require('summernote')

// Needed to highlight codeMirror editor
require('codemirror/mode/javascript/javascript')
var Formatter = require('../libs/formatter')

var unsaved = false

$('.addNewExercise').on('click', function () {
  var divTextRight = $('<div class="text-right"></div>')
  var btnDeleteExercise = $('<a class="btn btn-danger deleteExercise" data-exercise-id="">Delete</a>')
  var btnGenerate = $('<button class="btn btn-primary btnGenerate"> Generate </button>')
  var labelInsert = $('<label>Insert the code here :</label>')
  var textAreaCode = $('<textarea class="form-control" id="" rows="10"></textarea>')
  var divResultCode = $('<div class="resultCode"></div>')
  var divFormGroup = $('<div class="form-group"></div>')

  divTextRight.append(btnDeleteExercise)
  divTextRight.append(btnGenerate)

  divFormGroup.append(labelInsert)
  divFormGroup.append(textAreaCode)
  divFormGroup.append(divResultCode)
  divFormGroup.append(divTextRight)

  $('#exerciseContainer').append(divFormGroup)
  var newIndex = $('#exerciseContainer').children().length
  var exerciseId = 'new-exercise-' + newIndex
  $('#exerciseContainer').children().last().find('textarea').attr('name', exerciseId)
  $('#exerciseContainer').children().last().find('textarea').attr('id', exerciseId)
  initCodeMirror(exerciseId)

  btnDeleteExercise.on('click', function (e) {
    deleteExercise(this)
  })

  btnGenerate.on('click', function () {
    generateExercise(this)
  })
})

function deleteExercise (deleteBtnElement) {
  var exerciseId = $(deleteBtnElement).data('exercise-id')
  if (confirm('Are you sure want to delete this?')) {
    if (exerciseId) {
      $.post(rootPath + 'delete/Exercise', {
        id: exerciseId
      },
      function (data, status) {
        if (data.status) {
          // Remove the container of exercise
          $(deleteBtnElement).parent().parent().remove()
        } // TODO: What if delete fail?
        // TODO: Error handling
      })
    } else {
      // If the delete button doesn't have 'data-exercise-id' attribute,
      // the data is not yet in the backend.
      $(deleteBtnElement).parent().parent().remove()
    }
  }
}

// Ask backend to generate execise from NodeJS code in the code mirror.
function generateExercise (generateBtnElement) {
  var exerciseContainer = $(generateBtnElement).parent().parent()
  var resultCode = exerciseContainer.find('.resultCode')
  var exerciseCode = exerciseContainer.find('textarea')[0].value
  var url = rootPath + 'generateExercise'

  // TODO: Disable the button while request is being processed (i.e. slow internet)
  resultCode.empty() // Clear generated exercise
  $(generateBtnElement).attr('disabled', 'disabled')

  $.ajax({
    type: 'POST',
    url,
    data: {
      code: exerciseCode
    },
    success: function (resp, status) {
      $(generateBtnElement).removeAttr('disabled')
      if (resp.status) {
        resp.data.forEach((e, index) => {
          $(resultCode).append(`${marked(e.question)}`)
          $(resultCode).append(`<br>`)
          $(resultCode).append(`Answer: ${JSON.stringify(e.answer)}`)
          $(resultCode).append($(`<hr>`))
        })
      } else {
        var errMessage = $('<p style="color:red">' + resp.errMessage + '</p>')
        $(resultCode).append(errMessage)
      }
    },
    error: function (jqXHR, textStatus, err) {
      $(generateBtnElement).removeAttr('disabled')
      var errMessage = $('<p style="color:red"> Error: ' + textStatus + '</p>')
      $(resultCode).append(errMessage)
    },
    timeout: 3000

  })
}

function initCodeMirror (elementId) {
  var editor = codeMirror.fromTextArea(document.getElementById(elementId), {
    lineNumbers: true,
    styleActiveLine: true,
    matchBrackets: true,
    theme: 'material'
  })

  // TODO: Better than this, we should call save only when 'Generate' or 'Submit' is called
  editor.on('change', function (codeMirror) { codeMirror.save() })
  editor.on('keyup', onInputChange)
}

$(document).ready(function () {
  // Debounce this to prevent spamming request to Youtube that can cause 'This Video is Unavailable'
  var embedId = null
  const tryEmbedYoutube = _.debounce(() => {
    const currentEmbedId = Formatter.getYoutubeEmbedURL($('#ytInput').val())
    // Handle keyUp that doesn't change the input (e.g. arrow key)
    if (currentEmbedId && currentEmbedId !== embedId) {
      $('#ytPlayer').attr('src', `https://www.youtube.com/embed/${currentEmbedId}?autoplay=0&origin=http://www.nusantara-cloud.com`)
      $('#ytPlayer').css('display', 'block')
      $('#ytError').css('display', 'none')
    } else if (!currentEmbedId) { // Hide video if current embedId is invalid
      $('#ytPlayer').css('display', 'none')
      $('#ytPlayer').attr('src', ``)
      $('#ytError').css('display', 'block')
    }
    embedId = currentEmbedId
  }, 500)

  axios.get('video').then(resp => {
    console.log(JSON.stringify(resp.data))
  }).catch(err => {
    console.error(err)
  })

  $('#ytInput').keyup(function () {
    tryEmbedYoutube()
  })
  // Embed when page first load
  tryEmbedYoutube()

  $('.deleteExercise').on('click', function () {
    deleteExercise(this)
  })

  $('.btnGenerate').on('click', function () {
    generateExercise(this)
  })

  // TODO: Use a single class to hook all inputs
  $('.subtopicInput').on('keyup', e => {
    onInputChange()
  })

  $('#subtopicDescription').summernote({
    minHeight: 300
  })

  $('#subtopicDescription').on('summernote.change', e => {
    onInputChange()
  })

  $('#btnSave').on('success.ic', function (evt, elt, resp, textStatus, xhr, requestId) {
    resp = JSON.parse(resp)
    if (resp.status) {
      unsaved = false
      for (var key in resp.data.newExerciseIds) {
        const textArea = $('#exerciseContainer').find(`textarea[name=${key}]`)
        textArea.attr('name', `exercise-${resp.data.newExerciseIds[key]}`)
        textArea.parent().find('.btn-danger').attr('data-exercise-id', `${resp.data.newExerciseIds[key]}`)
      }
      $('#btnSave').text('Up to Date')
    } else {
      alert('Error=' + resp.errMessage)
      $('#btnSave').text('Failed to Save...')
    }
  })

  $('#btnSave').on('error.ic', function (evt, elt, status, str, xhr) {
    alert('Error ' + str)
    $('#btnSave').text('Error')
  })

  $('#videoUpload').change(function () {
    $('#videoUpload').simpleUpload(`videoUpload`, {
      start: function (file) {
        $('#videoFilename').css('color', 'black')
        console.log('upload started')
        $('#videoFilename').html(file.name)
        $('#videoProgress').html('')
        $('#videoProgressBar').width(0)
      },
      progress: function (progress) {
        console.log('upload progressing')
        $('#videoProgress').html(`Progress: ${Math.round(progress)} %`)
        $('#videoProgressBar').width(progress + '%')
      },
      success: function (resp) {
        console.log('success: ' + JSON.stringify(resp))
        // console.log(JSON.stringify(data))
        if (resp.status) {
          $('#videoFilename').html('Success')
          $('#videoFilename').css('color', 'green')
        } else {
          $('#videoFilename').html('Failed' + resp.errMessage ? `: ${resp.errMessage}` : '')
          $('#videoFilename').css('color', 'red')
        }
      },
      error: function (err) {
        console.log('error: ' + JSON.stringify(err))
        $('#videoFilename').html('Failed')
        $('#videoFilename').css('color', 'red')
      }
    })
  })

  // Initialize each of exercises CodeMirror
  if ($('#exerciseContainer').children().length > 0) {
    var numExercises = $('#exerciseContainer').children().length
    for (var i = 0; i < numExercises; i++) {
      var exerciseId = 'exercise-' + i
      initCodeMirror(exerciseId)
    }
  }
})

// Buffered input change listener
function onInputChange () {
  unsaved = true
  $('#btnSave').text('Save Changes')
}

window.onbeforeunload = function () {
  if (unsaved) {
    return 'You have unsaved changes on this page. Do you want to leave and discard it?'
  }
}
