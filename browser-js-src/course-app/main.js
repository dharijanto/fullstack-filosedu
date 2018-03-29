var $ = require('jquery')
const ONE_SECOND_IN_MILLIS = 1000 // millisecond
const TAG = 'Exercise-App'

var axios = require('../libs/axios-wrapper')
var log = require('../libs/logger')

// Keep track of elapsed time between questions and sets
var questionTime = 0
var setTime = 0
setInterval(function () {
  questionTime += 1
  setTime += 1
}, ONE_SECOND_IN_MILLIS)

$('#leaderboard-button').on('click', function (e) {
  $('#leaderboard-content').empty()
  axios.post('/topics/getLeaderboard', {
    pathname: window.location.pathname
  }).then(rawResp => {
    const resp = rawResp.data
    $('#leaderboard-content').append(resp.data)
  }).catch(err => {
    alert(err)
    console.error(err)
  })
})

$('.btn_submit_answer').on('click', function (e) {
  $.post(window.location.href, {
    userAnswers: $('form#topicQuestion').serialize()
  }).done(function (resp) {
    if (resp.status) {
      $('input').prop('disabled', true)
      $('input').prop('read-only', true)

      var correction = resp.data.isAnswerCorrect
      var realAnswers = resp.data.realAnswers
      var currentScore = resp.data.currentScore
      // var bestScore = resp.data.bestScore
      var starsHTML = resp.data.starsHTML
      var ranking = resp.data.ranking
      var currentTimeFinish = resp.data.currentTimeFinish
      var currentRanking = resp.data.currentRanking
      var totalRanking = resp.data.totalRanking
      var isPerfectScore = resp.data.isPerfectScore

      $('#currentScore').removeClass('hidden')
      $('#currentScore').text(`Nilai yang diperoleh: ${currentScore}`)
      $('.bestScore').html(starsHTML)
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
  }).fail(err => {
    $('#submissionError').removeClass('hidden')
    $('#submissionError').text(`Gagal memasukan jawaban: server mengalami kendala`)
    console.error(err)
  })
})
