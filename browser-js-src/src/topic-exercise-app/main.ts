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

let stopwatch

$(document).ready(function () {
  // Prevent 'enter' button from submitting current form
  $(window).keydown(function (event) {
    if (event.keyCode === 13) {
      event.preventDefault()
      return false
    }
  })

  // Populate on-screen numeric keyboard for each input
  const vkeyboards = $('.virtual-keyboard')
  vkeyboards.each((index, vkeyboard) => {
    const targetInput = $(vkeyboard).siblings('.answerInput').first()
    // Clear out the input
    $(targetInput).val('')
    $(vkeyboard)['NumericKeyboard']({ targetInput })
  })

  // TODO: implement this on the UI
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
    submitAnswers()
  })

  // The button is shown after a submission is made. When pressed, a new set of questions
  // is shown by reloading the page
  $('#btn-retry').on('click', function (e) {
    location.reload()
  })

  // Pressed to reset the timer. Essentially doing a submit and immediately\
  // reload to force a new set of questions to appear
  $('#btn-reset').on('click', function (e) {
    $('#btn-reset').attr('disabled', 'true')
    submitAnswers().finally(() => {
      window.location.reload()
    })
  })

  // UI-side timer to show ticks
  stopwatch = setInterval(() => {
    window['elapsedTime'] += 1
    // Latest UI doesn't have timer progress bar
    // updateProgressBar()
    $('#elapsedTime').html(Formatter.secsToTimerFormat(window['elapsedTime']))
  }, 1000)
  $('.exercise-timer').find('#targetTime').text(Formatter.secsToTimerFormat(window['idealTime']))

  // Latest UI doesn't have timer progress bar
  // updateProgressBar()
})

function submitAnswers () {
  return new Promise((resolve, reject) => {
    const userAnswers = []
    const forms = $('form[name="question"]')
    for (let i = 0; i < forms.length; i++) {
      const form = $(forms[i])
      // [{name: "X", value: "1"}, {name: "y", value: "2"}]
      userAnswers.push(form['serializeObject']())
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
    }).finally(() => {
      clearInterval(stopwatch)
    })
  })
}
// Latest UI doesn't have timer progress bar
// function updateProgressBar () {
//   // Get current value of progress bar
//   if (window['idealTime']) {
//     // console.log(`idealTime=${window['idealTime']} elapsedTime=${window['elapsedTime']}`)
//     const currentPercent = Math.min(window['elapsedTime'], window['idealTime']) / window['idealTime'] * 100.0
//     $('.progress-bar').css('width', currentPercent + '%')
//   }
// }
