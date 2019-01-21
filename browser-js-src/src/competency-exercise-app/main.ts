let $ = require('jquery')
const ONE_SECOND_IN_MILLIS = 1000 // millisecond
const TAG = 'Topic-Exercise-App'

let axios = require('../libs/axios-wrapper')
let log = require('../libs/logger')
let Utils = require('../libs/utils')

$('.btn-submit-answer').on('click', function (e) {
  postAnswer()
})

function postAnswer () {
  const userAnswers = []
  const jqueryForms = $('form[name="question"]')
  for (let i = 0; i < jqueryForms.length; i++) {
    const jqueryForm = $(jqueryForms[i])
    // [{name: "X", value: "1"}, {name: "y", value: "2"}]
    userAnswers.push(jqueryForm.serializeObject())
  }

  return axios.post(window.location.href, {
    userAnswers
  }).then(rawResp => {
    let resp = rawResp.data
    if (resp.status) {
      $('input').prop('disabled', true)
      $('input').prop('read-only', true)
      window.location.reload()
      return { status: true }
    } else {
      $('#submissionError').removeClass('hidden')
      $('#submissionError').text(`Gagal memasukan jawaban: ${resp.errMessage}`)
      console.error('Gagal memasukan jawaban: ' + resp.errMessage, resp)
      return { status: false }
    }
  }).catch(err => {
    $('#submissionError').removeClass('hidden')
    $('#submissionError').text(`Gagal memasukan jawaban: server mengalami kendala`)
    throw err
  })
}

// ---------------- EXERCISE TIMER CODE -----------------
// ------------------------------------------------------
// TODO: Refactor this so that exercise and topic-exercise share the same code
// How long since the exercise was generated
setInterval(() => {
  window['elapsedTime'] += 1
  updateTimer()
}, 1000)

function updateTimer () {
  // Get current value of progress bar
  $('#elapsedTime').html(`Elapsed: <strong> ${parseInt(window['elapsedTime'], 10)} detik</strong>`)
}

// ------------------------------------------------------
// ------------------------------------------------------