/*
  Generate the question of format:
    5x = 10

  General form:
    ax = b
*/

var _ = require('lodash')

var mathjax = require(path.join(__dirname, './lib/mathjax-helper'))

const knowns = ['a', 'b']
const unknowns = ['x']

const randomGeneratorFn = () => {
  const result = {knowns: {}, unknowns: {}}
  result.knowns.a = _.random(1, 15)
  const multiplier = _.random(1, 15)
  result.knowns.b = result.knowns.a * multiplier
  result.unknowns.x = result.knowns.b / result.knowns.a
  return result
}

// param1: knowns
// param2: unknowns
const isAnswerFn = ({a, b}, {x}) => {
  a = parseInt(a)
  b = parseInt(b)
  x = parseInt(x)

  return x === b / a
}

// Describe how the question will be printed
const printFn = ({a, b}) => {
  return mathjax(`${a}x = ${b}`).then(resp => {
    return resp.data.svg
  })
}

// In addition to exact matches, this describe the other matches
// unknowns1 = {a, b}
// unknowns2 = {a, b}
const isEqualFn = (question1, question2) => {
  // For this example, exact match is the only match
  return _.isEqual(question1, question2)
}

module.exports = {
  quantity: 5, // The number of questions to be generated
  solver: {
    type: 'bruteforce_solver', // The questions are generated using bruteforce
    randomGeneratorFn, // 'bruteforce_solver' uses random generator to generate each of the variables
    isEqualFn, // Return true if 2 equations are the same
    timeout: 1000 // Maximum time to generate all of the questions
  },
  knowns, // 'Given' variables
  unknowns, // 'Question' variables
  isAnswerFn, // Return true if the combination of 'knowns' and 'unknowns' solve the problem
  printFn // Print the question
}
