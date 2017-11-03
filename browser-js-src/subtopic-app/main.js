var $ = require('jquery')

$('.btn_submit_answer').on('click', function (e) {
  if (confirm('Are you sure want to submit the answer? Please check again !!')){
    $.post('/checkAnswer',
      $('#questionSubmit').serialize()
    ).done(function (resp) {
      if (resp.status) {
        var correction = resp.data.isAnswerCorrect
        var realAnswer = resp.data.realAnswer
        var currentScore = resp.data.currentScore
        var bestScore = resp.data.bestScore

        $('.scoreSection').removeClass('hidden')
        $('.currentScore').text(`YOUR CURRENT SCORE IS ${currentScore}`)

        if (bestScore !== 0) $('.bestScore').text(`YOUR BEST SCORE IS ${bestScore}`)

        for (var i = 0; i < correction.length; i++) {
          $('.resultAnswer_' + i).empty()

          var answer = null
          if (correction[i] === true) {
            answer = $('<p style="color:green">Correct</p>')
          } else {
            answer = $('<p style="color:red;">Incorrect! Correct answer is ' + realAnswer[i].x + '</p>')
          }
          $('.resultAnswer_' + i).append(answer)
        }

        $('.btn_submit_answer').addClass('hidden')
        $('.btn_retry_question').removeClass('hidden')
      }
    })
  }
})
