var $ = require('jquery')

$('.btn_submit_answer').on('click', function (e) {
  if (confirm('Are you sure want to submit the answer? Please check again !!')){

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
        $('.currentScore').text(`YOUR CURRENT SCORE IS ${currentScore}`)

        if (bestScore !== 0) {
          $('.bestScore').text(`YOUR BEST SCORE IS ${bestScore}`)
        }

        realAnswers.forEach((realAnswer, index) => {
          // var collectAnswer = ''
          var correctUnknowns = []
          var iteration = 0
          for (var unknown in realAnswer) {
            // collectAnswer = unknown + ' = ' + realAnswer[unknown]
            correctUnknowns.push(`${unknown} = ${realAnswer[unknown]}`)
          }
          $('.resultAnswer_' + index).empty()
          var answer = null
          if (correction[index] === true) {
            answer = $('<p style="color:green">Correct</p>')
          } else {
            answer = $('<p style="color:red;">Incorrect! Correct answer is ' + correctUnknowns.join(', ') + '</p>')
          }
          $('.resultAnswer_' + index).append(answer)
        })

        $('.btn_submit_answer').addClass('hidden')
        $('.btn_retry_question').removeClass('hidden')
      }
    })
  }
})
