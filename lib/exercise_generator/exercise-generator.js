var path = require('path')

var Crypto = require(path.join(__dirname, '../crypto'))
var Solvers = require(path.join(__dirname, 'exercise_solvers'))

// Abstract class
class ExerciseGenerator {
  static getHash (questionData) {
    // TODO:
    // Do something so that irrelevant changes don't change the hash
    // 1. Trim trailing spaces
    // 2. Remove comments
    return Crypto.md5(questionData)
  }

  static getExerciseSolver (questionData) {
    // If questionData is already parsed, use it, otherwise, eval it
    const question = typeof questionData === 'object' ? questionData : eval(questionData)
    const solver = Solvers.find(solver => solver.name === question.solver.type)
    if (!solver) {
      throw new Error(`No solver found with name=${question.solver.type}`)
    }
    const Solver = solver.class
    return new Solver(question)
  }
}

module.exports = ExerciseGenerator
