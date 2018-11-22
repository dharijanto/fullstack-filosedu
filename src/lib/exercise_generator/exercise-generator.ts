import * as path from 'path'
import Solvers from './exercise_solvers'

let log = require('npmlog')
let Crypto = require(path.join(__dirname, '../crypto'))

const TAG = 'ExerciseGenerator'
export default class ExerciseGenerator {
  static getHash (questionData): string {
    // TODO:
    // Do something so that irrelevant changes don't change the hash
    // 1. Trim trailing spaces
    // 2. Remove comments
    return Crypto.md5(questionData)
  }

  static getExerciseSolver (questionData) {
    try {
      // If questionData is already parsed, use it, otherwise, it's retrieved
      // from database and needs to be eval-ed
      const parsedQuestion = typeof questionData === 'object' ? questionData : eval(questionData)
      const SolverClass = Solvers.find(solver => solver.solverName === parsedQuestion.solver.type)
      if (!SolverClass) {
        throw new Error(`No exercise solver with name=${parsedQuestion.solver.type}!`)
      }
      return new SolverClass(parsedQuestion)
    } catch (err) {
      log.error(TAG, err)
      throw err
    }
  }
}
