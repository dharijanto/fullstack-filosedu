var $ = require('jquery')

$('.btn_submit_answer').on('click', function (e) {
  if (confirm('Submit your answers?')) {

    var answers = $('#questionSubmit').children()
    var userAnswers = []

    answers.each((index, value) => {
      userAnswers.push($(value).serializeObject())
    })

    $.post('/checkAnswer', {
      userAnswers,
      generatedExerciseId: $('input[name=generatedExerciseId]').val(),
      exerciseId: $('input[name=exerciseId]').val()
    }).done(function (resp) {
      if (resp.status) {
        $('input').prop('disabled', true)
        $('input').prop('read-only', true)

        var correction = resp.data.isAnswerCorrect
        var realAnswers = resp.data.realAnswers
        var currentScore = resp.data.currentScore
        var bestScore = resp.data.bestScore

        $('.scoreSection').removeClass('hidden')
        $('.currentScore').text(`Your score is ${currentScore}`)

        if (bestScore !== 0) {
          $('.bestScore').text(`Your best score is ${bestScore}`)
        }

        realAnswers.forEach((realAnswer, index) => {
          // var collectAnswer = ''
          var correctUnknowns = []
          for (var unknown in realAnswer) {
            // collectAnswer = unknown + ' = ' + realAnswer[unknown]
            correctUnknowns.push(`${unknown} = ${realAnswer[unknown]}`)
          }
          $('.resultAnswer_' + index).empty()
          var answer = null
          if (correction[index] === true) {
            answer = $('<p style="color:green">Correct</p>')
          } else {
            answer = $('<p style="color:red;">Incorrect! Answer is ' + correctUnknowns.join(', ') + '</p>')
          }
          $('.resultAnswer_' + index).append(answer)
        })

        $('.btn_submit_answer').addClass('hidden')
        $('.btn_retry_question').removeClass('hidden')
      } else {
        console.error('Failed to submit answers!', resp)
      }
    }).fail(err => {
      console.error(err)
    })
  }
})
