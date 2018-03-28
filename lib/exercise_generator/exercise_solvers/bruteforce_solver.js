var path = require('path')
var log = require('npmlog')
// var _ = require('lodash')

var ExerciseSolver = require(path.join(__dirname, 'exercise-solver'))
var Utility = require(path.join(__dirname, '../../utils/utility'))

const TAG = 'BruteforceSolver'

class BruteforceSolver extends ExerciseSolver {
  constructor (questionData) {
    super()
    this._structuralCheck(questionData)
    this._question = questionData
  }

  // Check if the given question really matches the criteria
  _structuralCheck (question) {
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

  _generateQuestions (quantity) {
    const getRandom = this._question.solver.randomGeneratorFn
    const isEqual = this._question.solver.isEqualFn
    const knowns = this._question.knowns
    const unknowns = this._question.unknowns
    const timeout = this._question.solver.timeout || 1000 // Default exercise generation timeout
    const generatedSet = []

    // Timeout checker
    var ts1 = Utility.getTimeInMillis()
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
              throw new Error(`Random generator function is not correct! Some knowns are not generated`)
            }
          })
          unknowns.forEach(unknown => {
            if (!(unknown in random.unknowns)) {
              throw new Error(`Random generator function is not correct! Some unknowns are not generated`)
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

  // TODO:
  // 1. Take into account the timeout specified in the file
  generateQuestions () {
    const quantity = this._question.quantity || 0
    return this._generateQuestions(quantity)
  }

  generateTopicQuestions () {
    const quantity = this._question.reviewQuantity || 0
    return this._generateQuestions(quantity)
  }
}

module.exports = {
  name: 'bruteforce_solver',
  class: BruteforceSolver
}
