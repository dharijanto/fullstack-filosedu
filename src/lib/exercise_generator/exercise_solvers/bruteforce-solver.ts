let path = require('path')
let log = require('npmlog')

let Utility = require(path.join(__dirname, '../../utils/utility'))
import * as Promise from 'bluebird'
import ExerciseSolver from './exercise-solver'

const TAG = 'BruteforceSolver'

export interface GeneratedQuestionData {
  knowns: { [key: string]: any},
  unknowns: { [key: string]: any}
}

export interface BruteforceQuestion {
  quantity: number
  idealTimePerQuestion?: number
  reviewQuantity?: number
  competencyQuantity?: number
  solver: {
    type: 'bruteforce_solver',
    randomGeneratorFn: () => GeneratedQuestionData,
    isEqualFn: (unknowns1, unknowns2) => boolean,
    timeout?: number
  }
  knowns: string[]
  unknowns: string[]
  isAnswerFn: (knowns, unknowns) => boolean
  printFn: (knowns) => string | Promise<string>
}

export default class BruteforceSolver extends ExerciseSolver {
  public static readonly solverName = 'bruteforce_solver'
  protected question: BruteforceQuestion

  constructor (questionData) {
    super(questionData)
  }
  // Check if the given question really matches the criteria
  structuralCheck (question: BruteforceQuestion) {
    const requiredKeys = ['quantity', 'solver', 'knowns', 'unknowns', 'isAnswerFn', 'printFn']
    requiredKeys.forEach(key => {
      if (!(key in question)) {
        throw new Error(`${key} is not found!`)
      }
    })
    if (!('randomGeneratorFn' in question.solver)) {
      throw new Error('randomGeneratorFn is not found!')
    }
    // TODO: Check the types of each of the values
  }

  private _generateQuestions (quantity): GeneratedQuestionData[] {
    const getRandom = this.question.solver.randomGeneratorFn
    const isEqual = this.question.solver.isEqualFn
    const knowns = this.question.knowns
    const unknowns = this.question.unknowns
    const timeout = this.question.solver.timeout || 1000 // Default exercise generation timeout
    const generatedSet: GeneratedQuestionData[] = []

    // Timeout checker
    let ts1 = Utility.getTimeInMillis()
    while (generatedSet.length < quantity) {
      if ((Utility.getTimeInMillis() - ts1) > timeout) {
        throw new Error('Timeout limit exceeded!')
      } else {
        // Generated random knowns
        let random = getRandom()
        // Make sure what's generated is correct
        if (!('knowns' in random) || !('unknowns' in random)) {
          throw new Error('Random generator function is not correct! Either knowns or unknowns are not generated')
        } else {
          knowns.forEach(known => {
            if (!(known in random.knowns)) {
              throw new Error(`Random generator function is not correct!`)
            }
          })
          unknowns.forEach(unknown => {
            if (!(unknown in random.unknowns)) {
              throw new Error(`Random generator function is not correct!`)
            }
          })
        }

        if (!generatedSet.find(generated => isEqual(generated, random))) {
          log.verbose(TAG, `_generatedQuestions(): random=${JSON.stringify(random)}`)
          generatedSet.push(random)
        }
      }
    }

    log.verbose(TAG, '_generateQuestions(): questions generated in: ' + (Utility.getTimeInMillis() - ts1) + ' milliseconds')
    return generatedSet
  }

  // Generate question for sub-topic exercise
  generateQuestions (): GeneratedQuestionData[] {
    const quantity = this.question.quantity || 0
    return this._generateQuestions(quantity)
  }

  // Generate question for topic exercise
  generateTopicQuestions (): GeneratedQuestionData[] {
    const quantity = this.question.reviewQuantity || 0
    return this._generateQuestions(quantity)
  }
}
