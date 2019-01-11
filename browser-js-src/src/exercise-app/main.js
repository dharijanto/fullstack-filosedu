var $ = require('jquery')

var axios = require('../libs/axios-wrapper')
var log = require('../libs/logger')

var Promise = require('bluebird')

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
  postAnswer()
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

function postAnswer () {
  return new Promise((resolve, reject) => {
    $('.btn_submit_answer').attr('disabled', true)
    onNextQuestion()
    onSetCompleted()
    var answers = []

    $('#questionSubmit').children().each((index, value) => {
      answers.push($(value).serializeObject())
    })

    axios.post(window.location.href, {
      answers,
      generatedExerciseId: $('input[name=generatedExerciseId]').val(),
      exerciseId: $('input[name=exerciseId]').val()
    }).then(rawResp => {
      const resp = rawResp.data
      $('.btn_submit_answer').removeAttr('disabled')
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
        if (parseInt(score) < 80) {
          $('.bestScore').append('<p>Dapatkan skor diatas 80 untuk memperoleh bintang</p>')
        }

        correctAnswers.forEach((realAnswer, index) => {
          var correctUnknowns = []
          for (var unknown in realAnswer) {
            correctUnknowns.push(`${unknown} = ${realAnswer[unknown]}`)
          }
          $('.resultAnswer_' + index).empty()
          var answer = null
          if (isCorrectArr[index] === true) {
            answer = $('<p style="color:green">Benar</p>')
          } else {
            answer = $(`<p style="color:red;">Salah. 
              Jawaban yang benar: ${correctUnknowns.join(', ')} </p>`)
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
      $('.btn_submit_answer').removeAttr('disabled')
      $('#submissionError').removeClass('hidden')
      $('#submissionError').text(`Gagal memasukan jawaban: server mengalami kendala: ` + err.message)
      console.error(err)
      reject(err)
    }).finally(() => {
      clearInterval(stopWatch)
    })
  })
}

$('#resetQuestion').on('click', function (e) {
  postAnswer().then(resp => {
    if (resp.status) {
      window.location.reload()
    } else {
      window.location.reload()
    }
  })
})

// ---------------- EXERCISE TIMER CODE -----------------
// TODO: Refactor this so that exercise and topic-exercise share the same code
// How long since the exercise was generated
const stopWatch = setInterval(() => {
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
