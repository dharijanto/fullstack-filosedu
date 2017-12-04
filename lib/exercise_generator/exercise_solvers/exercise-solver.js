class ExerciseSolver {
  formatQuestion (knowns) {
    return new Promise((resolve, reject) => {
      try {
        const result = this._question.printFn(knowns)
        if (result instanceof Promise) {
          result.then(data => {
            resolve(data)
          }).catch(err => reject(err))
        } else {
          resolve(result)
        }
      } catch (err) {
        reject(err)
      }
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
