var path = require('path')
var _ = require('lodash')

var Exercise = require(path.join(__dirname, 'exercise'))

class BruteforceSolver extends Exercise {
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

  // TODO:
  // 1. Take into account the timeout specified in the file
  generateQuestions () {
    const quantity = this._question.quantity
    const getRandom = this._question.solver.randomGeneratorFn
    const isEqual = this._question.solver.isEqualFn
    const knowns = this._question.knowns
    const unknowns = this._question.unknowns

    const generatedKnowns = []
    while (generatedKnowns.length < quantity) {
      // Generated random knowns
      let random = getRandom()
      // Make sure what's generated is correct
      if (!('knowns' in random) || !('unknowns' in random)) {
        throw new Error('Random generator function is not correct! Either knowns are unknowns are not generated')
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

      if (!generatedKnowns.find(unknowns => isEqual(unknowns, random.unknowns))) {
        generatedKnowns.push(random)
      }
    }

    return generatedKnowns
  }
}

module.exports = {
  name: 'bruteforce_solver',
  class: BruteforceSolver
}
