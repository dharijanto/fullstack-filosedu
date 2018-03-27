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
  $.post(window.location.href, {
    userAnswers: $('form#topicQuestion').serialize()
  }).done(function (resp) {
    if (resp.status) {
      $('input').prop('disabled', true)
      $('input').prop('read-only', true)

      // var correction = resp.data.isAnswerCorrect
      // var realAnswers = resp.data.realAnswers
      var currentScore = resp.data.currentScore
      // var bestScore = resp.data.bestScore
      // var starsHTML = resp.data.starsHTML
      // var ranking = resp.data.ranking
      var currentTimeFinish = resp.data.currentTimeFinish
      // var currentRanking = resp.data.currentRanking
      // var totalRanking = resp.data.totalRanking
      var isPerfectScore = resp.data.isPerfectScore

      // $('#currentScore').removeClass('hidden')
      // $('#currentScore').text(`Nilai yang diperoleh: ${currentScore}`)
      // $('.bestScore').html(starsHTML)
      // $('.rankingScore').html(ranking)

      if (isPerfectScore) {
        $('.rankingScore').append(`<p>Ranking kamu adalah 11 dari 12 dan selesai dengan waktu penyelesaian ${currentTimeFinish} detik</p>`)
      } else {
        $('.bestScore').html('<p>Maaf, hanya yang nilai di atas 80 yang mendapat bintang</p>')
        $('.rankingScore').append(`<p>Maaf, hanya nilai 100 yang masuk penilaian</p>`)
      }
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
})

// ---Analyitics  Section ---
function addBackToVideo (exerciseId, callback) {
}

function addQuestionTime (exerciseId, questionTime) {
}

function addSetTime (exerciseId, setTime) {
}
