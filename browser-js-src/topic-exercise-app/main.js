var $ = require('jquery')
const ONE_SECOND_IN_MILLIS = 1000 // millisecond
const TAG = 'Topic-Exercise-App'

var axios = require('../libs/axios-wrapper')
var log = require('../libs/logger')
var Promise = require('bluebird')

var pathName = window.location.pathname
// to split and get topic id from url pathname
var topicId = pathName.split('/')[2]

// Keep track of elapsed time between questions and sets
var questionTime = 0
var setTime = 0
setInterval(function () {
  questionTime += 1
  setTime += 1
}, ONE_SECOND_IN_MILLIS)

$('#leaderboard-button').on('click', function (e) {
  $('#leaderboard-content').empty()
  axios.get(`/topics/${topicId}/getLeaderboard`).then(rawResp => {
    const resp = rawResp.data
    $('#leaderboard-content').append(resp.data)
  }).catch(err => {
    alert(err)
    console.error(err)
  })
})

$('.btn_submit_answer').on('click', function (e) {
  postAnswer()
})

$('#resetQuestion').on('click', function (e) {
  postAnswer().then(resp => {
    if (resp.status) {
      setTimeout(
        function () {
          window.location.reload()
        },
        2000)
    } else {
      window.location.reload()
    }
  })
})

function postAnswer () {
  return new Promise((resolve, reject) => {
    axios.post(window.location.href, {
      userAnswers: $('form#topicQuestion').serialize()
    }).then(rawResp => {
      var resp = rawResp.data
      if (resp.status) {
        $('input').prop('disabled', true)
        $('input').prop('read-only', true)

        var realAnswers = resp.data.summaryAnswers
        var currentScore = resp.data.currentScore
        var starsHTML = resp.data.starsHTML
        var timersHTML = resp.data.timersHTML
        var ranking = resp.data.ranking
        var currentTimeFinish = resp.data.currentTimeFinish
        var currentRanking = resp.data.currentRanking
        var totalRanking = resp.data.totalRanking
        var isPerfectScore = resp.data.isPerfectScore

        $('#currentScore').removeClass('hidden')
        $('#currentScore').text(`Nilai yang diperoleh: ${currentScore}`)
        $('.bestScore').html(starsHTML)
        $('.bestTimer').html(timersHTML)
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
          for (var x in realAnswer.unknown) {
            correctUnknowns.push(`${x} = ${realAnswer.unknown[x]}`)
          }
          $('.resultAnswer_' + index).empty()
          var answer = null
          if (realAnswer.isCorrect) {
            answer = $('<p style="color:green">Benar</p>')
          } else {
            answer = $('<p style="color:red;">Salah. Jawaban yang benar: ' + correctUnknowns.join(', ') + '</p>')
          }
          $('.resultAnswer_' + index).append(answer)
        })

        $('.btn_submit_answer').addClass('hidden')
        $('.btn_retry_question').removeClass('hidden')
        resolve({status: true})
      } else {
        $('#submissionError').removeClass('hidden')
        $('#submissionError').text(`Gagal memasukan jawaban: ${resp.errMessage}`)
        console.error('Gagal memasukan jawaban: ' + resp.errMessage, resp)
        resolve({status: false})
      }
    }).catch(err => {
      $('#submissionError').removeClass('hidden')
      $('#submissionError').text(`Gagal memasukan jawaban: server mengalami kendala`)
      console.error(err)
      reject(err)
    })
  })
}

// remember to get Exercise date. not subtopic
var createdAt = $('input[name=createdAt]').val()
var timerElapsed = (new Date(createdAt)).getTime()
var idealTime = $('input[name=idealTime]').val()
var worstTime = idealTime * 3

$('#timer').timer({
  format: '%M:%S',
  seconds: (Date.now() - timerElapsed) / 1000,
  repeat: true
})

// call the function every 5 seconds
window.setInterval(function () {
  changeProgressBar()
}, 1000)

function changeProgressBar () {
  // Get current value of progress bar
  var currentValueProgressBar = $('#timer').data('seconds')
  if (currentValueProgressBar <= idealTime) {
    // do nothing
  } else {
    var valueProgressBarToBeApllied = 100 - ((currentValueProgressBar - idealTime) * (100 / (worstTime - idealTime)))
    // Set the width of progress bar
    $('.progress-bar').css('width', valueProgressBarToBeApllied + '%')
  }
}

// when page first load, first call only
changeProgressBar()
