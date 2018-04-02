var Promise = require('bluebird')

class ExerciseHelper {
  static getExerciseData (exerciseSolver, generatedExercise, exerciseId) {
    const data = {}
    var knowns = JSON.parse(generatedExercise.knowns)

    return Promise.map(knowns, known => {
      return exerciseSolver.formatQuestion(known)
    }).then(formattedQuestions => {
      data.allQuestion = {
        unknowns: exerciseSolver._question.unknowns,
        questions: formattedQuestions,
        userAnswers: generatedExercise.userAnswer
      }
      data.generateExerciseId = generatedExercise.id
      data.exerciseId = exerciseId
      return data
    })
  }

  static countTimeFinish (dateCreatedAt) {
    const timeStart = new Date(dateCreatedAt).getTime()
    const timeSubmit = Date.now()
    const timeFinish = ((timeSubmit - timeStart) / 1000).toFixed(2)
    return timeFinish
  }
}

module.exports = ExerciseHelper
