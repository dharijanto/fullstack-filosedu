var $ = require('jquery')
var codeMirror = require('codemirror')
require('summernote')

var unsaved = false

// Initialize each of exercises CodeMirror
if ($('#codeInput').children().length > 0) {
  console.log('code input length = ' + $('#codeInput').children().length)
  var numExercises = $('#codeInput').children().length
  for (var i = 0; i < numExercises; i++) {
    var exerciseId = 'exercise-' + i
    initCodeMirror(exerciseId)
  }
}

$('.addNewCode').on('click', function () {
  var codeForm = $('<div class="form-group"> <label>Insert the code here :</label><textarea class="form-control" id="textcoder2" rows="10"></textarea> <div class="resultCode"></div> <div class="text-right"> <a class="btn btn-danger" onclick="deleteCode(this)">Delete this</a> <a class="btn btn-primary btn-generate"> Check the Code </a></div>')
  $('#codeInput').append(codeForm)
  var newIndex = $('#codeInput').children().length
  var exerciseId = 'textcoder_' + newIndex
  $('#codeInput').children().last().find('textarea').attr('name', exerciseId)
  $('#codeInput').children().last().find('textarea').attr('id', exerciseId)
  initCodeMirror(exerciseId)
})

// function imageSelected (param) {
//   alert('call back ' + param)
// }
// $('#imagePicker').NCImagePicker({
//   callbackFn: imageSelected,
//   postURL: 'http://cms.nusantara-local.com:8080/07d4d76b54b75f5b12c6458cbbd1f1aa/imageupload',
//   getURL: 'http://cms.nusantara-local.com:8080/07d4d76b54b75f5b12c6458cbbd1f1aa/imageupload',
//   deleteURL: 'http://cms.nusantara-local.com:8080/07d4d76b54b75f5b12c6458cbbd1f1aa/imagedelete'
// })

function initCodeMirror (elementId) {
  var editor = codeMirror.fromTextArea(document.getElementById(elementId), {
    lineNumbers: true,
    mode: 'htmlmixed',
    styleActiveLine: true,
    matchBrackets: true,
    theme: 'material',
    continuousScanning: 500
  })

  // TODO: Better than this, we should call save only when 'Generate' or 'Submit' is called
  editor.on('change', function (codeMirror) { codeMirror.save() })
  editor.on('keyup', onInputChange)
}

// var HelloButton = function (context) {
//   var ui = $.summernote.ui

//   // create button
//   var button = ui.button({
//     contents: '<i class="fa fa-child"/> Hello',
//     tooltip: 'hello',
//     click: function () {
//       // invoke insertText method with 'hello' on editor module.
//       context.invoke('editor.insertText', 'hello')
//     }
//   })

//   return button.render()   // return button as jquery object
// }

$('#description').summernote({
  minHeight: 300
// toolbar: [
//     ['mybutton', ['hello']]
//   ],
// buttons: {
//     hello: HelloButton
//   }
})

// Buffered input change listener
function onInputChange () {
  unsaved = true
  $('#btnSave').text('Save Changes')
  console.log('unsaved = ' + unsaved)
}

// TODO: Use a single class to hook all inputs
$('input[name=link_youtube]').on('keyup', e => {
  onInputChange()
})
$('#description').on('summernote.change', e => {
  onInputChange()
})

window.onbeforeunload = function () {
  if (unsaved) {
    return 'You have unsaved changes on this page. Do you want to leave and discard it?'
  }
}

$('#btnSave').on('success.ic', function (evt, elt, data, textStatus, xhr, requestId) {
  data = JSON.parse(data)
  if (data[0].status && data[1][0] && data[1][0].status && data[1][0].data) {
    unsaved = false
    data[1].map(data => {
      const textArea = $('#codeInput').find(`textarea[name=${data.data.currentStage}]`)
      textArea.attr('name', `question-${data.data.id}`)
      textArea.parent().find('.btn-danger').attr('onclick', `deleteCode(this, ${data.data.id})`)
    })
    $('#btnSave').text('Up to Date')
  } else if (data[0].status || data[2]) {
    unsaved = false
    $('#btnSave').text('Up to Date')
  } else {
    $('#btnSave').text('Failed to Save...')
  }
})
$('#btnSave').on('error.ic', function (evt, elt, status, str, xhr) {
  alert('Error=' + str)
  $('#btnSave').text('Error')
})

window.deleteCode = function (val, questionId) {
  // TODO: Add checks, if the id to be deleted is not yet on the backend, delete it immediately
  if (confirm('Are you sure you want to delete this?')) {
    $.post(rootPath + '/delete/Question', {
      id: questionId
    },
    function (data, status) {
      if(data.status) {
        $(val).parent().parent().remove()
      }
    })
  }
}

$('.btn-generate').on('click', e => {
  var parentCodeArea = $(e.target).parent().parent()
  var resultCode = parentCodeArea.find('.resultCode')
  var textArea = parentCodeArea.find('textarea')
  var contentTextArea = textArea[0].value
  var url = rootPath + '/checkcode'

  resultCode.empty()

  $.post(url, {
    text: contentTextArea
  },

  function (data, status) {
    data.data.forEach((e, index) => {
      $(resultCode).append(`${index + 1}. ${e.question} ? Answer: ${e.answer} <br/>`)
    })
  })
})
