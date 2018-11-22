import * as path from 'path'
import ExerciseSolver from './exercise-solver'
import BruteforceSolver from './bruteforce-solver'

export interface SolverConstructor {
  solverName: string
  new (questionData): ExerciseSolver
}

export default [ BruteforceSolver ] as Array<SolverConstructor>
