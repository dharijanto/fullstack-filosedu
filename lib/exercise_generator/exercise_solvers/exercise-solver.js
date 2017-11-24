class ExerciseSolver {
  formatQuestion (knowns) {
    return this._question.printFn(knowns)
  }

  generateQuestions () {
    throw new Error('Not implemented!')
  }

  isAnswer (knowns, unknowns) {
    return this._question.isAnswerFn(knowns, unknowns)
  }
}

module.exports = ExerciseSolver
