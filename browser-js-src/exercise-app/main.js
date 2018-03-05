var $ = require('jquery')
const ONE_SECOND_IN_MILLIS = 1000 // millisecond
const TAG = 'Exercise-App'

var log = require('../libs/logger')

// Keep track of elapsed time between questions and sets
var questionTime = 0
var setTime = 0
setInterval(function () {
  questionTime += 1
  setTime += 1
}, ONE_SECOND_IN_MILLIS)

function onNextQuestion () {
  const exerciseId = $('#exerciseId').val()
  log.verbose(TAG, 'onNextQuestion(): questionTime=' + questionTime + ' exerciseId=' + exerciseId)

  // Switch to the next question
  if (questionTime !== 0) {
    addQuestionTime(exerciseId, questionTime)
    questionTime = 0
  }
}

function onSetCompleted () {
  const exerciseId = $('#exerciseId').val()
  log.verbose(TAG, 'onSetCompleted(): setTime=' + setTime + ' exerciseId=' + exerciseId)
  addSetTime(exerciseId, setTime)
}

$('.answerInput').on('focus', onNextQuestion)

$('.backToVideoBtn').on('click', function (e) {
  const exerciseId = $(this).data('exercise-id')
  const href = $(this).data('href')
  addBackToVideo(exerciseId, () => {
    window.location.href = href
  })
})

$('.btn_submit_answer').on('click', function (e) {
  onNextQuestion()
  if (confirm('Masukan jawaban?')) {
    onSetCompleted()
    var answers = $('#questionSubmit').children()
    var userAnswers = []

    answers.each((index, value) => {
      userAnswers.push($(value).serializeObject())
    })

    $.post('/submitAnswer', {
      userAnswers,
      generatedExerciseId: $('input[name=generatedExerciseId]').val(),
      exerciseId: $('input[name=exerciseId]').val()
    }).done(function (resp) {
      if (resp.status) {
        $('input').prop('disabled', true)
        $('input').prop('read-only', true)

        var correction = resp.data.isAnswerCorrect
        var realAnswers = resp.data.realAnswers
        var currentScore = resp.data.currentScore
        var bestScore = resp.data.bestScore
        var starsHTML = resp.data.starsHTML

        $('#currentScore').removeClass('hidden')
        $('#currentScore').text(`Nilai yang diperoleh: ${currentScore}`)

        $('.bestScore').html(starsHTML)

        realAnswers.forEach((realAnswer, index) => {
          // var collectAnswer = ''
          var correctUnknowns = []
          for (var unknown in realAnswer) {
            // collectAnswer = unknown + ' = ' + realAnswer[unknown]
            correctUnknowns.push(`${unknown} = ${realAnswer[unknown]}`)
          }
          $('.resultAnswer_' + index).empty()
          var answer = null
          if (correction[index] === true) {
            answer = $('<p style="color:green">Benar</p>')
          } else {
            answer = $('<p style="color:red;">Salah. Jawaban yang benar: ' + correctUnknowns.join(', ') + '</p>')
          }
          $('.resultAnswer_' + index).append(answer)
        })

        $('.btn_submit_answer').addClass('hidden')
        $('.btn_retry_question').removeClass('hidden')
      } else {
        $('#submissionError').removeClass('hidden')
        $('#submissionError').text(`Gagal memasukan jawaban: ${resp.errMessage}`)
        console.error('Gagal memasukan jawaban: ' + resp.errMessage, resp)
      }
    }).fail(err => {
      $('#submissionError').removeClass('hidden')
      $('#submissionError').text(`Gagal memasukan jawaban: server mengalami kendala`)
      console.error(err)
    })
  }
})

// ---Analyitics  Section ---
function addBackToVideo (exerciseId, callback) {
  $.ajax({
    method: 'POST',
    url: '/exercise/analytics',
    data: {
      exerciseId,
      value: 1,
      key: 'backToVideo'
    }
  }).done(function (resp) {
    if (!resp.status) {
      console.error(JSON.stringify(resp.errMessage))
    }
    callback()
  }).fail(function (jqXHR, textStatus) {
    console.error(textStatus)
    callback()
  })
}

function addQuestionTime (exerciseId, questionTime) {
  $.ajax({
    method: 'POST',
    url: '/exercise/analytics',
    data: {
      exerciseId,
      value: questionTime, // in seconds
      key: 'questionTime'
    }
  }).done(function (resp) {
    if (!resp.status) {
      console.error(JSON.stringify(resp.errMessage))
    }
  }).fail(function (jqXHR, textStatus) {
    console.error(textStatus)
  })
}

function addSetTime (exerciseId, setTime) {
  $.ajax({
    method: 'POST',
    url: '/exercise/analytics',
    data: {
      exerciseId,
      value: setTime, // in seconds
      key: 'setTime'
    }
  }).done(function (resp) {
    if (!resp.status) {
      console.error(JSON.stringify(resp.errMessage))
    }
  }).fail(function (jqXHR, textStatus) {
    console.error(textStatus)
  })
}
