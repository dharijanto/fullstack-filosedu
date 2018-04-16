var Promise = require('bluebird')
var marked = require('marked')

class ExerciseSolver {
  formatQuestion (knowns) {
    return new Promise((resolve, reject) => {
      const result = this._question.printFn(knowns)
      if (result instanceof Promise) {
        result.then(data => {
          resolve(data)
        }).catch(err => {
          reject(err)
        })
      } else {
        resolve(result)
      }
    }).then(data => {
      return marked(data)
    })
  }

  generateQuestions () {
    throw new Error('Not implemented!')
  }

  isAnswer (knowns, unknowns) {
    return this._question.isAnswerFn(knowns, unknowns)
  }
}

module.exports = ExerciseSolver
