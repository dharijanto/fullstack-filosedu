var $ = require('jquery')
const ONE_SECOND_IN_MILLIS = 1000 // millisecond
const TAG = 'Topic-Exercise-App'

var axios = require('../libs/axios-wrapper')
var log = require('../libs/logger')
var Utils = require('../libs/utils')

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
    const userAnswers = []
    const jqueryForms = $('form[name="question"]')
    for (var i = 0; i < jqueryForms.length; i++) {
      const jqueryForm = $(jqueryForms[i])
      // [{name: "X", value: "1"}, {name: "y", value: "2"}]
      userAnswers.push(jqueryForm.serializeObject())
    }

    axios.post(window.location.href, {
      userAnswers
    }).then(rawResp => {
      var resp = rawResp.data
      if (resp.status) {
        $('input').prop('disabled', true)
        $('input').prop('read-only', true)

        const grade = resp.data.grade
        const starsHTML = resp.data.starsHTML
        const timersHTML = resp.data.timersHTML
        const ranking = resp.data.ranking
        const timeFinish = resp.data.timeFinish
        const currentRanking = resp.data.currentRanking
        const totalRanking = resp.data.totalRanking

        $('#currentScore').removeClass('hidden')
        $('#currentScore').text(`Nilai yang diperoleh: ${grade.score}`)
        $('.bestScore').html(starsHTML)
        $('.bestTimer').html(timersHTML)
        $('.rankingScore').html(ranking)

        if (parseInt(grade.score) === 100) {
          $('.rankingScore').append(`<p>Soal diselesaikan dalam <b>${timeFinish} detik</b>. Waktu ini ada di urutan ${currentRanking} dari ${totalRanking}</p>`)
        } else {
          $('.rankingScore').append(`<p>Soal diselesaikan dalam <b>${timeFinish} detik</b>. Hanya nilai 100 yang masuk penilaian. </p>`)
        }
        if (parseInt(currentScore) < 80) {
          $('.bestScore').append('<p>Dapatkan skor diatas 80 untuk memperoleh bintang</p>')
        }

        grade.correctAnswers.forEach((correctAnswer, index) => {
          let stringifiedCorrectAnswer = null
          for (let key in correctAnswer) {
            if (stringifiedCorrectAnswer === null) {
              stringifiedCorrectAnswer = `${key}=${correctAnswer[key]}`
            } else {
              stringifiedCorrectAnswer += ` ${key}=${correctAnswer[key]}`
            }
          }

          let answerMessage
          if (grade.isCorrect[index]) {
            answerMessage = $('<p style="color:green">Benar</p>')
          } else {
            answerMessage = $('<p style="color:red;">Salah. Jawaban yang benar: ' + stringifiedCorrectAnswer + '</p>')
          }
          $('.resultAnswer_' + index).empty()
          $('.resultAnswer_' + index).append(answerMessage)
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

// ---------------- EXERCISE TIMER CODE -----------------
// ------------------------------------------------------
// TODO: Refactor this so that exercise and topic-exercise share the same code
// How long since the exercise was generated
setInterval(() => {
  window['elapsedTime'] += 1
  updateProgressBar()
}, 1000)

function updateProgressBar () {
  // Get current value of progress bar
  if (window['idealTime']) {
    console.log(`idealTime=${window['idealTime']} elapsedTime=${window['elapsedTime']}`)
    const currentPercent = Math.min(window['elapsedTime'], window['idealTime']) / window['idealTime'] * 100.0
    $('.progress-bar').css('width', currentPercent + '%')
  }
  $('#elapsedTime').html(`Elapsed: <strong> ${elapsedTime} detik</strong>`)
}

// when page first load, first call only
updateProgressBar()
// ------------------------------------------------------
// ------------------------------------------------------
