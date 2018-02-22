/*
  Generate the question of format:
    x = [1-5]

  General form:
    x = a
*/

var _ = require('lodash')

var mathjax = require(path.join(__dirname, './lib/mathjax-helper'))
var imageHelper = require(path.join(__dirname, './lib/image-helper'))

const knowns = ['a']
const unknowns = ['x']

const randomGeneratorFn = () => {
  const result = {knowns: {}, unknowns: {}}
  result.knowns.a = _.random(1, 5)
  result.unknowns.x = result.knowns.a
  return result
}

// param1: knowns
// param2: unknowns
const isAnswerFn = ({a}, {x}) => {
  a = parseInt(a)
  x = parseInt(x)

  return x === a
}

// Describe how the question will be printed
const printFn = ({a}) => {
return `
${imageHelper.repeat('1519265726137_fresh-apple-red-delicious-v-500-g.png', 30, 1, a)}
Ada berapa buah apel? (dalam angka)
`
}

// In addition to exact matches, this describe the other matches
// unknowns1 = {a, b}
// unknowns2 = {a, b}
const isEqualFn = (unknowns1, unknowns2) => {
  // For this example, exact match is the only match
  return _.isEqual(unknowns1, unknowns2)
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
