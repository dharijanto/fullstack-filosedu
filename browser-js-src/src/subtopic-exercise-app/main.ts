let axios = require('../libs/axios-wrapper')
let log = require('../libs/logger')
const Formatter = require('../libs/formatter')

import * as $ from 'jquery'
import 'jquery-serializeobject'
import * as Promise from 'bluebird'

import '../libs/numeric-keyboard'

const ONE_SECOND_IN_MILLIS = 1000 // millisecond
const TAG = 'Exercise-App'
// Keep track of elapsed time between questions and sets
let questionTime = 0
let setTime = 0
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
    const targetInput = $(vkeyboard).siblings('.answer-input').first()
    // Clear out the input
    $(targetInput).val('')
    $(vkeyboard)['NumericKeyboard']({ targetInput })
  })

  // UI-side timer to show ticks
  stopwatch = setInterval(() => {
    window['elapsedTime'] += 1
    questionTime += 1
    setTime += 1
    // Latest UI doesn't have timer progress bar
    // updateProgressBar()
    $('#elapsed-time').html(Formatter.secsToTimerFormat(window['elapsedTime']))
  }, 1000)
  $('.exercise-timer').find('#target-time').text(Formatter.secsToTimerFormat(window['idealTime']))

  $('.answer-input').on('focus', onNextQuestion)
  $('#back-to-video').on('click', function (e) {
    const exerciseId = $(this).data('exercise-id')
    const href = $(this).data('href')
    addBackToVideo(exerciseId, () => {
      window.location.href = href
    })
  })

  $('#leaderboard-button').on('click', function (e) {
    $('#leaderboard-content').empty()
    const url = new URL('leaderboard', window.location.href)
    axios.get(url.href).then(rawResp => {
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
})

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

const analyticsURL = new URL('analytics', window.location.href).href
// ---Analyitics  Section ---
function addBackToVideo (exerciseId, callback) {
  $.ajax({
    method: 'POST',
    url: analyticsURL,
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
    url: analyticsURL,
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
    url: analyticsURL,
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

function postAnswer () {
  return new Promise((resolve, reject) => {
    $('#btn-submit-answer').attr('disabled', 'true')
    onNextQuestion()
    onSetCompleted()
    let answers = []

    const forms = $('form[name="question"]')
    for (let i = 0; i < forms.length; i++) {
      const form = $(forms[i])
      // [{name: "X", value: "1"}, {name: "y", value: "2"}]
      answers.push(form['serializeObject']())
    }

    axios.post(window.location.href, {
      answers,
      generatedExerciseId: $('input[name=generatedExerciseId]').val(),
      exerciseId: $('input[name=exerciseId]').val()
    }).then(rawResp => {
      const resp = rawResp.data
      $('.btn-submit-answer').removeAttr('disabled')
      if (resp.status) {
        $('input').prop('disabled', true)
        $('input').prop('read-only', true)

        const isCorrectArr = resp.data.isCorrect
        const correctAnswers = resp.data.correctAnswers
        const score = resp.data.score
        const starsHTML = resp.data.starsHTML
        const timersHTML = resp.data.timersHTML
        const ranking = resp.data.ranking
        const timeFinish = resp.data.timeFinish
        const currentRanking = resp.data.currentRanking
        const totalRanking = resp.data.totalRanking
        const isPerfectScore = score === 100

        $('#currentScore').removeClass('hidden')
        $('#currentScore').text(`Nilai yang diperoleh: ${score}`)
        $('.bestScore').empty()
        $('.bestScore').append(starsHTML)
        $('.bestTimer').empty()
        $('.bestTimer').append(timersHTML)
        $('.rankingScore').html(ranking)

        if (isPerfectScore) {
          $('.rankingScore').append(`<p>Soal diselesaikan dalam
            <b>${timeFinish} detik</b>. Waktu ini ada di
            urutan ${currentRanking} dari ${totalRanking}</p>`)
        } else {
          $('.rankingScore').append(`<p>Soal diselesaikan dalam
            <b>${timeFinish} detik</b>.
            Hanya nilai 100 yang masuk penilaian ranking. </p>`)
        }

        // TODO: This message and conditional checking should be from backend
        if (parseInt(score, 10) < 80) {
          $('.bestScore').append('<p>Dapatkan skor diatas 80 untuk memperoleh bintang</p>')
        }

        correctAnswers.forEach((realAnswer, index) => {
          let correctUnknowns = []
          for (let unknown in realAnswer) {
            correctUnknowns.push(`${unknown} = ${realAnswer[unknown]}`)
          }
          $('.resultAnswer_' + index).empty()
          let answer = null
          if (isCorrectArr[index] === true) {
            answer = $('<p style="color:green">Benar</p>')
          } else {
            answer = $(`<p style="color:red;">Salah.
              Jawaban yang benar: ${correctUnknowns.join(', ')} </p>`)
          }
          $('.resultAnswer_' + index).append(answer)
        })
        resolve({ status: true })
      } else {
        $('#submissionError').removeClass('hidden')
        $('#submissionError').text(`Gagal memasukan jawaban: ${resp.errMessage}`)
        console.error('Gagal memasukan jawaban: ' + resp.errMessage, resp)
        resolve({ status: false })
      }
    }).catch(err => {
      $('.btn-submit-answer').removeAttr('disabled')
      $('#submissionError').removeClass('hidden')
      $('#submissionError').text(`Gagal memasukan jawaban: server mengalami kendala: ` + err.message)
      console.error(err)
      reject(err)
    }).finally(() => {
      clearInterval(stopwatch)
      $('#btn-retry').removeClass('hidden')
      $('#btn-submit-answer').addClass('hidden')
    })
  })
}

$('#btn-reset').on('click', function (e) {
  postAnswer().then((resp: any) => {
    if (resp.status) {
      window.location.reload()
    } else {
      window.location.reload()
    }
  })
})

$('#btn-retry').on('click', function (e) {
  location.reload()
})

// ---------------- EXERCISE TIMER CODE -----------------
// TODO: Refactor this so that exercise and topic-exercise share the same code
// How long since the exercise was generated
/*
function updateProgressBar () {
  // Get current value of progress bar
  if (window['idealTime']) {
    console.log(`idealTime=${window['idealTime']} elapsedTime=${window['elapsedTime']}`)
    const currentPercent = Math.min(window['elapsedTime'], window['idealTime']) / window['idealTime'] * 100.0
    $('.progress-bar').css('width', currentPercent + '%')
  }
  $('#elapsed-time').html(`Elapsed: <strong> ${parseInt(window['elapsedTime'], 10)} detik</strong>`)
} */

// when page first load, first call only
// updateProgressBar()
// ------------------------------------------------------
// ------------------------------------------------------
