var $ = require('jquery')
var unique = require('uniq')
var codeMirror = require('codemirror')
var axios = require('axios')
var intercooler = require('intercooler')
var Promise = require('bluebird')

class MyClass {
}


// this section is initialize code mirror when page loaded
var elementIdText = 'textcoder0'
if ($('#codeInput').children().length > 0) {
  var banyaknyaTextArea = $('#codeInput').children().length
  var index = 0
  while (index < banyaknyaTextArea) {
    elementIdText = 'textcoder' + index
    initCodeMirror(elementIdText)
    index++
  }
} else {
  initCodeMirror(elementIdText)
}

// this is behavior of button when clicked to add new code editor
$('.addNewCode').on('click', function (e) {
  var CodeForm = $('<div class="form-group"> <label>Insert the code here :</label> <textarea class="form-control" id="textcoder2" rows="10" name="exercise_code[]"></textarea> <div class="text-right"> <a class="btn btn-danger" onclick="deleteCode(this)">Delete this</a> <a class="btn btn-primary btn-check-code"> Check the Code </a></div>')
  // CodeForm.find('textarea').attr('id', elementIdText)
  $('#codeInput').append(CodeForm)

  if ($('#codeInput').children().length > 1){
    elementIdText = 'textcoder' + $('#codeInput').children().length
    $('#codeInput').children().last().find('textarea').attr('id', elementIdText)
    initCodeMirror(elementIdText)
  }
})

function imageSelected (param) {
  alert('call back ' + param)
}

$('#imagePicker').NCImagePicker({
  callbackFn: imageSelected,
  postURL: 'http://cms.nusantara-local.com:8080/07d4d76b54b75f5b12c6458cbbd1f1aa/imageupload',
  getURL: 'http://cms.nusantara-local.com:8080/07d4d76b54b75f5b12c6458cbbd1f1aa/imageupload',
  deleteURL: 'http://cms.nusantara-local.com:8080/07d4d76b54b75f5b12c6458cbbd1f1aa/imagedelete'
})

function initCodeMirror (elementId) {
  var editor = codeMirror.fromTextArea(document.getElementById(elementId), {
    lineNumbers: true,
    mode: 'htmlmixed',
    styleActiveLine: true,
    matchBrackets: true,
    theme: 'material',
    continuousScanning: 500
  })

  editor.on('change', function(codeMirror) { codeMirror.save() })
}


var HelloButton = function (context) {
  var ui = $.summernote.ui

  // create button
  var button = ui.button({
    contents: '<i class="fa fa-child"/> Hello',
    tooltip: 'hello',
    click: function () {
      // invoke insertText method with 'hello' on editor module.
      context.invoke('editor.insertText', 'hello')
    }
  })

  return button.render()   // return button as jquery object
}

$('#description').summernote({
  minHeight: 300,
  //- toolbar: [
  //-     ['mybutton', ['hello']]
  //-   ],
  //- buttons: {
  //-     hello: HelloButton
  //-   }
})

var unsaved = false
// Buffered input change listener
// var onInputChanged = _.debounce(function onInputChange () {
//   unsaved = true
//   $('#btnSave').text('Save Change')
// }, 100)
$('#btnSave').on('success.ic', function(evt, elt, data, textStatus, xhr, requestId) {
  console.log(data)
  data = JSON.parse(data)
  if (data.status) {
    unsaved = false
    const filename = data.filename
    if (filename) {
      $('input[name="filename"]').val(filename)
    }
    console.log('textStatus=' + textStatus)
    $('#btnSave').text('Up to Date')
  } else {
    $('#btnSave').text('Failed to Save...')
  }
})
$('#btnSave').on('error.ic', function(evt, elt, status, str, xhr) {
  alert('Error=' + str)
  $('#btnSave').text('Error')
})




$('.btn-check-code').on('click')