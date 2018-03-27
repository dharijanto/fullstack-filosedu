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

  static getTopicExerciseData (exerciseSolver, generatedExercise) {
    var knowns = JSON.parse(generatedExercise.knowns)

    return Promise.map(knowns, known => {
      return exerciseSolver.formatQuestion(known)
    }).then(formattedQuestions => {
      return {
        allQuestion: {
          unknowns: exerciseSolver._question.unknowns,
          questions: formattedQuestions || [],
          userAnswers: generatedExercise.userAnswer
        }
      }
    })
  }
}

module.exports = ExerciseHelper
