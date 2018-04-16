var $ = require('jquery')

var axios = require('../libs/axios-wrapper')
var log = require('../libs/logger')

const ONE_SECOND_IN_MILLIS = 1000 // millisecond
const TAG = 'Exercise-App'
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

$('#leaderboard-button').on('click', function (e) {
  $('#leaderboard-content').empty()
  axios.post('/exercise/getLeaderboard', {
    exerciseId: $('input[name=exerciseId]').val()
  }).then(rawResp => {
    const resp = rawResp.data
    $('#leaderboard-content').append(resp.data)
  }).catch(err => {
    alert(err)
    console.error(err)
  })
})

$('.btn_submit_answer').on('click', function (e) {
  $('.btn_submit_answer').attr('disabled', true)
  onNextQuestion()
  onSetCompleted()
  var answers = $('#questionSubmit').children()
  var userAnswers = []

  answers.each((index, value) => {
    userAnswers.push($(value).serializeObject())
  })

  axios.post(window.location.href, {
    userAnswers,
    generatedExerciseId: $('input[name=generatedExerciseId]').val(),
    exerciseId: $('input[name=exerciseId]').val()
  }).then(rawResp => {
    const resp = rawResp.data
    $('.btn_submit_answer').removeAttr('disabled')
    if (resp.status) {
      $('input').prop('disabled', true)
      $('input').prop('read-only', true)

      var correction = resp.data.isAnswerCorrect
      var realAnswers = resp.data.realAnswers
      var currentScore = resp.data.currentScore
      var bestScore = resp.data.bestScore
      var starsHTML = resp.data.starsHTML
      var ranking = resp.data.ranking
      var currentTimeFinish = resp.data.currentTimeFinish
      var currentRanking = resp.data.currentRanking
      var totalRanking = resp.data.totalRanking
      var isPerfectScore = resp.data.isPerfectScore

      $('#currentScore').removeClass('hidden')
      $('#currentScore').text(`Nilai yang diperoleh: ${currentScore}`)
      $('.bestScore').empty()
      $('.bestScore').append(starsHTML)
      $('.rankingScore').html(ranking)

      if (isPerfectScore) {
        $('.rankingScore').append(`<p>Soal diselesaikan dalam <b>${currentTimeFinish} detik</b>. Waktu ini ada di urutan ${currentRanking} dari ${totalRanking}</p>`)
      } else {
        $('.rankingScore').append(`<p>Soal diselesaikan dalam <b>${currentTimeFinish} detik</b>. Hanya nilai 100 yang masuk penilaian. </p>`)
      }

      if (parseInt(currentScore) < 80) {
        $('.bestScore').append('<p>Dapatkan skor diatas 80 untuk memperoleh bintang</p>')
      }

      realAnswers.forEach((realAnswer, index) => {
        var correctUnknowns = []
        for (var unknown in realAnswer) {
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
  }).catch(err => {
    $('.btn_submit_answer').removeAttr('disabled')
    $('#submissionError').removeClass('hidden')
    $('#submissionError').text(`Gagal memasukan jawaban: server mengalami kendala`)
    console.error(err)
  })
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
