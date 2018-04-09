var Promise = require('bluebird')

class ExerciseHelper {
  static getExerciseData (exerciseSolver, generatedExercise, exerciseId) {
    const data = {}
    var knowns = JSON.parse(generatedExercise.knowns)
    var unknowns = JSON.parse(generatedExercise.unknowns)

    return Promise.join(
      Promise.map(knowns, known => {
        return exerciseSolver.formatQuestion(known)
      }),
      Promise.map(unknowns, unknown => {
        return Object.keys(unknown)
      })
    ).spread((formattedQuestions, unknowns) => {
      data.formatted = {
        renderedQuestions: formattedQuestions,
        unknowns
      }
      data.exerciseId = exerciseId
      return (data)
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
