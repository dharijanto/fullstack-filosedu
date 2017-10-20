/*
  Generate the question of format:
    X + 5 = 10 or 7 + X = 12

  General form:
    X + a = b or a + X = b

  Constraints:
    0 < A < 10
    0 < B < 10
    0 <= x < 15
*/

var _ = require('lodash')
// var MathHelper = require('./math-helper')

const knowns = ['a', 'b']
const unknowns = ['x']

const randomGeneratorFn = (variable) => {
  switch (variable) {
    case 'a':
    case 'b':
    case 'x':
      return _.random(0, 16)
  }
}

// param1: knowns
// param2: unknowns
const isAnswerFn = ({a, b}, {x}) => {
  return x + a === b
}

// Describe how the question will be printed
const printFn = ({a, b}) => {
  const formatted = [`x + ${a} = ${b}`, `${a} + x = ${b}`]
  return _.sample(formatted)
}

// In addition to exact matches, this describe the other matches
// equation1 = {a, b, c}
// equation2 = {a, b, c}
const isEqualFn = (equation1, equation2) => {
  // x + 5 = 7 is the same as 5 + x = 7
  return equation1.b === equation2.b && (equation1.x === equation2.a && equation1.a === equation2.x)
}

module.exports = {
  quantity: 10, // The number of questions to be generated
  solver: {
    type: 'bruteforce_solver', // The questions are generated using bruteforce
    randomGeneratorFn, // 'bruteforce_solver' uses random generator to generate each of the variables
    timeout: 1000 // Maximum time to generate all of the questions
  },
  knowns, // 'Given' variables
  unknowns, // 'Question' variables
  isAnswerFn, // Return true if the combination of 'knowns' and 'unknowns' solve the problem
  isEqualFn, // Return true if 2 equations are the same
  printFn // Print the question
}
