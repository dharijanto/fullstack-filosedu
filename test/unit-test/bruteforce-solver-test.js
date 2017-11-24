var path = require('path')

var _ = require('lodash')
var chai = require('chai')
var expect = chai.expect

var data = require(path.join(__dirname, 'data'))// data.bruteforceQuestionPositiveQuestions
var ExerciseGenerator = require(path.join(__dirname, '../../lib/exercise_generator/exercise-generator'))

describe('Bruteforce Solver', function () {
  it('Should parse a specified question properly', function (done) {
    // console.log(data)
    data.bruteforceQuestionPositiveQuestions.forEach(item => {
      const q1 = require(path.join(__dirname, `data/${item}`))
      var exerciseSolver = ExerciseGenerator.getExerciseSolver(q1)
      // Since this is a bruteforce method, makes sense to try it multiple times
      _.range(0, 10).forEach(() => {
        var questions = exerciseSolver.generateQuestions()
        // Number of generated questions should be the same as what's asked
        expect(questions).to.have.length(q1.quantity)
        // Check that each question is correct
        questions.forEach(question => {
          // Specified knowns should be generated
          expect(Object.keys(question.knowns)).to.include.members(q1.knowns)
          // Specified unknowns should be generated
          expect(Object.keys(question.unknowns)).to.include.members(q1.unknowns)
          // Formatted question should be a string
          expect(exerciseSolver.formatQuestion(question.knowns)).to.be.a('string')
          // Questions should be answered correctly
          expect(exerciseSolver.isAnswer(question.knowns, question.unknowns)).to.be.ok
        })
      })
    })
    done()
  })
})
