class Exercise {
  formatQuestion (knowns) {
    return this._question.printFn(knowns)
  }

  generateKnowns () {
    throw new Error('Not implemented!')
  }

  isAnswer (knowns, unknowns) {
    return this._question.isAnswerFn(knowns, unknowns)
  }
}

module.exports = Exercise
