const ONE_SECOND_IN_MILLIS = 1000 // millisecond
const TAG = 'Topic-Exercise-App'

const axios = require('../libs/axios-wrapper')
const log = require('../libs/logger')
const Utils = require('../libs/utils')
const Formatter = require('../libs/formatter')
const pathName = window.location.pathname
// to split and get topic id from url pathname
const topicId = pathName.split('/')[2]

import * as $ from 'jquery'
import 'jquery-serializeobject'

import '../libs/numeric-keyboard'

// Keep track of elapsed time between questions and sets
/* let questionTime = 0
let setTime = 0
setInterval(function () {
  questionTime += 1
  setTime += 1
}, ONE_SECOND_IN_MILLIS) */

// Populate on-screen numeric keyboard for each input
const vkeyboards = $('.virtual-keyboard')
vkeyboards.each((index, vkeyboard) => {
  const targetInput = $(vkeyboard).siblings('.answerInput').first()
  // Clear out the input
  $(targetInput).val('')
  $(vkeyboard)['NumericKeyboard']({ targetInput })
})

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

$('#btn-submit-answer').on('click', function (e) {
  postAnswer()
})

$('#btn-retry').on('click', function (e) {
  location.reload()
})

$('#btn-reset').on('click', function (e) {
  $('#btn-reset').attr('disabled', 'true')
  postAnswer().then((resp: any) => {
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
    for (let i = 0; i < jqueryForms.length; i++) {
      const jqueryForm = $(jqueryForms[i])
      // [{name: "X", value: "1"}, {name: "y", value: "2"}]
      userAnswers.push(jqueryForm['serializeObject']())
    }

    axios.post(window.location.href, {
      userAnswers
    }).then(rawResp => {
      $('#btn-submit-answer').addClass('hidden')
      let resp = rawResp.data
      if (resp.status) {
        $('input').prop('disabled', true)
        $('input').prop('read-only', true)

        const grade = resp.data.grade
        const starsHTML = resp.data.starsHTML
        const checkmarkHTML = resp.data.checkmarkHTML
        const ranking = resp.data.ranking
        const timeFinish = resp.data.timeFinish
        const currentRanking = resp.data.currentRanking
        const totalRanking = resp.data.totalRanking

        $('#currentScore').removeClass('hidden')
        $('#currentScore').text(`Nilai yang diperoleh: ${grade.score}`)
        $('.stars').html(starsHTML)
        $('.checkmark').html(checkmarkHTML)
        $('.rankingScore').html(ranking)

        if (parseInt(grade.score, 10) === 100) {
          $('.rankingScore').append(`<p>Soal diselesaikan dalam <b>${timeFinish} detik</b>. Waktu ini ada di urutan ${currentRanking} dari ${totalRanking}</p>`)
        } else {
          $('.rankingScore').append(`<p>Soal diselesaikan dalam <b>${timeFinish} detik</b>. Hanya nilai 100 yang masuk penilaian. </p>`)
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

        $('#btn-retry').removeClass('hidden')
        resolve({ status: true })
      } else {
        $('#submissionError').removeClass('hidden')
        $('#submissionError').text(`Gagal memasukan jawaban: ${resp.errMessage}`)
        console.error('Gagal memasukan jawaban: ' + resp.errMessage, resp)
        resolve({ status: false })
      }
    }).catch(err => {
      $('#btn-submit-answer').removeClass('hidden')
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

$('.exercise-timer').find('#targetTime').text(Formatter.secsToTimerFormat(window['idealTime']))

function updateProgressBar () {
  // Get current value of progress bar
  if (window['idealTime']) {
    // console.log(`idealTime=${window['idealTime']} elapsedTime=${window['elapsedTime']}`)
    const currentPercent = Math.min(window['elapsedTime'], window['idealTime']) / window['idealTime'] * 100.0
    $('.progress-bar').css('width', currentPercent + '%')
  }
  $('#elapsedTime').html(Formatter.secsToTimerFormat(window['elapsedTime']))
}

// when page first load, first call only
updateProgressBar()
// ------------------------------------------------------
// ------------------------------------------------------
