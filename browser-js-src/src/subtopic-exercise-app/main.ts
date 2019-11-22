let axios = require('../libs/axios-wrapper')
let log = require('../libs/logger')
const Formatter = require('../libs/formatter')

import * as $ from 'jquery'
import 'jquery-serializeobject'
import * as Promise from 'bluebird'

import '../libs/numeric-keyboard'

const TAG = 'Exercise-App'
// Keep track of elapsed time between questions and sets
let questionTime = 0
let setTime = 0
let stopwatch

$(document).ready(function () {
  // Force scroll to the top page, otherwise chrome remembers current scrolling
  $(document).scrollTop(0)
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
      if (resp.status) {
        $('#leaderboard-content').append(resp.data)
      } else {
        console.error(resp.errMessage)
      }
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

        $('#current-score').removeClass('hidden').text(`Nilai: ${score}`)
        $('#star-badges').empty().append(starsHTML)
        $('#time-badges').empty().append(timersHTML)
        $('#submission-leaderboard').html(ranking)

        let leaderboardMessage
        if (isPerfectScore) {
          leaderboardMessage = `<p>Soal diselesaikan dalam
          <b>${timeFinish} detik</b>. Waktu ini ada di
          urutan ke ${currentRanking} dari ${totalRanking}.</p>`
        } else {
          leaderboardMessage = `<p>Soal diselesaikan dalam
            <b>${timeFinish} detik</b>.
            Hanya nilai 100 yang masuk penilaian ranking. </p>`
        }
        $('#submission-leaderboard').prepend(leaderboardMessage)

        // TODO: This message and conditional checking should be from backend
        if (parseInt(score, 10) < 80) {
          $('#remarks').append('<p>Dapatkan nilai diatas 80 untuk memperoleh bintang.</p>')
        } else if (parseInt(score, 10) < 100) {
          $('#remarks').append('<p>Dapatkan nilai 100 untuk memperoleh jam.</p>')
        } else if (parseInt(timeFinish, 10) > parseInt(window['idealTime'], 10)) {
          $('#remarks').append('<p>Kerjakan lebih cepat untuk memperoleh jam.</p>')
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
        throw new Error(resp.errMessage)
      }
    }).catch(err => {
      $('.btn-submit-answer').removeAttr('disabled')
      $('#error-message').removeClass('hidden').text(`Gagal memasukan jawaban: ` + err.message)
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
    if (!resp.status) {
      console.error('Failed to reset: ' + resp.errMessage)
    }
  }).finally(() => {
    window.location.reload()
  })
})

$('#btn-retry').on('click', function (e) {
  window.location.reload()
})
