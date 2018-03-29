var path = require('path')

// var Promise = require('bluebird')
var log = require('npmlog')
var marked = require('marked')
var Promise = require('bluebird')
var Sequelize = require('sequelize')

var CRUDService = require(path.join(__dirname, 'crud-service'))
var ExerciseGenerator = require(path.join(__dirname, '../lib/exercise_generator/exercise-generator'))
var ExerciseHelper = require(path.join(__dirname, '../app/utils/exercise-helper'))

const TAG = 'ExerciseService'
class ExerciseService extends CRUDService {
  /*
    return:
      { status: true,
        data: {
        id,
        data: [nodeJsCodeForExercise1, nodeJsCodeForExercise2]
      }
  */
  getTopicExercises (topicId) {
    log.verbose(TAG, `course.service.getExerciseRelatedWithTopicId.GET (topicId): ${topicId}`)
    return this._sequelize.query(`
SELECT exercises.id, exercises.data
FROM exercises AS exercises
INNER JOIN subtopics AS subtopic ON exercises.subtopicId = subtopic.id AND subtopic.topicId = ${topicId}
ORDER BY subtopic.subtopicNo ASC, exercises.id ASC;`, { type: Sequelize.QueryTypes.SELECT }
    ).then(resp => {
      return {status: true, data: resp}
    })
  }

  /*
    exercise: {
      id: 13,
      data: // NodeJS Code describing the exercise
      createdAt: 2018-02-21T08:50:28.000Z,
      updatedAt: 2018-03-04T13:38:48.000Z,
      subtopicId: 13,
      subtopic: 'Pengenalan Bilangan 1 - 5',
      description: '',
      subtopicData: '{"detail":""}',
      subtopicNo: 101,
      topicId: 12
    }

    return: {
      status: true,
      data :{
        exerciseData: {
          knowns,  // Already stringified
          unknowns, // Already stringified
          userAnswer, // DONE
          exerciseId
        }
        formatted: {
          renderedQuestions, // HTML-rendered question array
          unknowns, // Variable for inputs
          userAnswer
        }
      }
    }
  */
  generateExercise (exercise) {
    var exerciseSolver = ExerciseGenerator.getExerciseSolver(exercise.data)
    var questions = exerciseSolver.generateTopicQuestions()

    var knowns = []
    var unknowns = []
    var formattedQuestionsPromises = []
    var answerUnknowns = []
    /*
      questions content:
      [ { knowns: { a: 23, b: 13 }, unknowns: { x: 36 } },
        { knowns: { a: 10, b: 12 }, unknowns: { x: 22 } } ]
    */
    questions.forEach(question => {
      formattedQuestionsPromises.push(exerciseSolver.formatQuestion(question.knowns))
      knowns.push(question.knowns)
      unknowns.push(Object.keys(question.unknowns))
      answerUnknowns.push(question.unknowns)
    })

    return Promise.all(formattedQuestionsPromises).then(renderedQuestions => {
      return {
        status: true,
        data: {
          exerciseData: {
            knowns: JSON.stringify(knowns),
            unknowns: JSON.stringify(answerUnknowns),
            userAnswer: [],
            exerciseId: exercise.id
          },
          formatted: {
            renderedQuestions,
            unknowns
          }
        }
      }
    })
  }

  /*
    This is like generateExercise, but skips exercise that doesn't have any questions

    exerciseDatas: [{
      id: 13,
      data: // NodeJS Code describing the exercise
      createdAt: 2018-02-21T08:50:28.000Z,
      updatedAt: 2018-03-04T13:38:48.000Z,
      subtopicId: 13,
      subtopic: 'Pengenalan Bilangan 1 - 5',
      description: '',
      subtopicData: '{"detail":""}',
      subtopicNo: 101,
      topicId: 12
    }],
    return: {
      status: true,
      data :{
        exerciseData: [{
          knowns,  // Already stringified
          unknowns, // Already stringified
          userAnswer, // DONE
          exerciseId
        }]
        formatted: [{
          renderedQuestions: ["\n2 + 3 = ?\n", "\n1 + 2 = ?\n"], // HTML-rendered question array
          unknowns: [["x"], ["x"]], // Variable for inputs
          userAnswer
        }]
      }
    }
  */
  generateExercises (exerciseDatas) {
    return Promise.map(exerciseDatas, exerciseData => {
      return this.generateExercise(exerciseData).then(resp => {
        if (resp.status) {
          // Check this has questions
          const parsedKnowns = JSON.parse(resp.data.exerciseData.knowns)
          if (parsedKnowns.length > 0) {
            return {
              exerciseData: resp.data.exerciseData,
              formatted: resp.data.formatted
            }
          } else {
            return null
          }
        } else {
          return null
        }
      })
    }).then(results => {
      const exerciseData = []
      const formatted = []

      results.filter(result => result != null).forEach(result => {
        exerciseData.push(result.exerciseData)
        formatted.push(result.formatted)
      })

      return {
        status: true,
        data: {
          exerciseData,
          formatted
        }
      }
    })
  }

  /*
  Input:
    generatedExercises: [{
      knowns: '[{"a":2,"b":2},{"a":2,"b":1}]',
      unknowns: '[{"x":"Empat"},{"x":"Tiga"}]',
      userAnswer: [],
      exerciseId: 14
    }]

  Output:
    [{
      "status": true,
      "data": {
        formatted: [{
          renderedQuestions: ["\n2 + 3 = ?\n", "\n1 + 2 = ?\n"], // HTML-rendered question array
          unknowns: [["x"], ["x"]], // Variable for inputs
          userAnswer
        }]
      }
    }]
  */
  formatExercises (generatedExercises) {
    return Promise.map(generatedExercises, generatedExercise => {
      return this.readOne({modelName: 'Exercise', searchClause: {id: generatedExercise.exerciseId}}).then(resp => {
        if (resp.status) {
          var exerciseSolver = ExerciseGenerator.getExerciseSolver(resp.data.data)
          var unknowns = []
          var formattedQuestionsPromises = []
          JSON.parse(generatedExercise.knowns).forEach(knowns => {
            formattedQuestionsPromises.push(exerciseSolver.formatQuestion(knowns))
          })
          JSON.parse(generatedExercise.unknowns).forEach(_unknowns => {
            unknowns.push(Object.keys(_unknowns))
          })

          return Promise.all(formattedQuestionsPromises).then(renderedQuestions => {
            return {
              renderedQuestions,
              unknowns
            }
          })
        } else {
          throw new Error(resp.errMessage)
        }
      })
    }).then(formattedExercises => {
      /*
        formattedExercise: {
          renderedQuestions: ['', ''],
          unknowns: [['x', 'y'], ['x', 'y']]
        }
      */
      return {
        status: true,
        data: {
          formatted: formattedExercises
        }
      }
    })
  }

  /*
    Input:
      topicId: 5
    Output:
      {
        status: true,
        data: {
          topicExerciseHash: 'kekekekek'
        }
      }
  */
  getTopicExerciseHash (topicId) {
    return new Promise((resolve, reject) => {
      this.getTopicExercises(topicId).then(resp => {
        if (resp.status) {
          var tempCollectHash = ''
          resp.data.forEach(topicExercise => {
            tempCollectHash += ExerciseGenerator.getHash(topicExercise.data)
          })
          var topicExerciseHash = ExerciseGenerator.getHash(tempCollectHash)
          resolve({
            status: true,
            data: {
              topicExerciseHash
            }
          })
        } else {
          reject(new Error(resp.errMessage))
        }
      })
    })
  }
  /*
    Return whether the topicExercise given is still valid or not.
    Not valid if:
      1. Any of the exercise has changed
      2. Any of the exercise has been deleted

    exercises: [{
      id: 1,
      data: 'code nodejs'
    }]
    topicExerciseHash: 'kdkdkdkd'
    return:
      {status: true}
  */
  checkHash (exercises, topicExerciseHash) {
    return new Promise((resolve, reject) => {
      var tempHash = ''
      exercises.forEach(exercise => {
        var exerciseHash = ExerciseGenerator.getHash(exercise.data)
        // log.verbose(TAG, `checkHash(): exerciseHash=${exerciseHash} topicExercise.exerciseHash=${topicExerciseHash}`)
        tempHash += exerciseHash
      })

      var hashCollectedExercise = ExerciseGenerator.getHash(tempHash)
      log.verbose(TAG, `checkHash(): hashCollectedExercise=${hashCollectedExercise} topicExercise.exerciseHash=${topicExerciseHash}`)
      if (hashCollectedExercise === topicExerciseHash) {
        resolve({status: true})
      } else {
        resolve({status: false})
      }
    })
  }

  /*
  Input:
    knowns: {
      a: 6,
      b: 8
    },
    unknowns: {
      x: '9'
    }
  Output:
    status: true/false
    data: {
      isCorrect: true/false
    }
  */
  checkAnswer (exerciseId, knowns, unknowns) {
    return this.readOne({modelName: 'Exercise', searchClause: {id: exerciseId}}).then(resp => {
      if (resp.status) {
        const exercise = resp.data
        const exerciseSolver = ExerciseGenerator.getExerciseSolver(exercise.data)
        var isCorrect = exerciseSolver.isAnswer(knowns, {x: unknowns})
        return {status: true, data: {isCorrect}}
      } else {
        return {status: false, errMessage: 'Exercise is not avaiable'}
      }
    })
  }

  /*
  {
    status: true,
    data:
     [ { id: 3,
         submitted: false,
         score: null,
         timeFinish: null,
         exerciseDetail:
            [ { knowns: '[{"a":2,"b":2},{"a":2,"b":1}]',
                unknowns: '[{"x":"Empat"},{"x":"Tiga"}]',
                userAnswer: [],
                exerciseHash: '0c9a610a26d61394bfde9e877533e9b9',
                exerciseId: 14 } ],
         createdAt: 2018-03-23T07:51:34.000Z,
         updatedAt: 2018-03-23T07:51:34.000Z,
         topicId: 12,
         userId: 14 } ]
   }
  */
  getGeneratedTopicExercise (userId, topicId) {
    return this.readOne({
      modelName: 'GeneratedTopicExercise',
      searchClause: {
        userId,
        topicId,
        submitted: false
      }
    })
  }

  /*
    topicId: 3
    userId; 5,
    topicExerciseHash: 'kdkdkdk',
    exerciseDetail:
    [ { knowns: '[{"a":2,"b":2},{"a":2,"b":1}]',
        unknowns: '[{"x":"Empat"},{"x":"Tiga"}]',
        userAnswer: [],
        exerciseId: 14 } ]

  */
  createGeneratedTopicExercise (topicId, userId, exerciseDetail, topicExerciseHash) {
    return this.create({
      modelName: 'GeneratedTopicExercise',
      data: {
        topicId,
        userId,
        exerciseDetail: JSON.stringify(exerciseDetail),
        topicExerciseHash
      }
    })
  }

  /*
    Get generatedTopicExercise that is not yet submitted, and uppdate its
    exercise detail.

    generatedTopicExerciseId: 5,
    topicExerciseHash: 'kdkdkdk',
    exerciseDetail:
      [ { knowns: '[{"a":2,"b":2},{"a":2,"b":1}]',
          unknowns: '[{"x":"Empat"},{"x":"Tiga"}]',
          userAnswer: [],
          exerciseId: 14 } ],
    return: {
      status: true
    }
  */
  updateGeneratedTopicExercise (generatedTopicExerciseId, exerciseDetail, topicExerciseHash) {
    return this.update({
      modelName: 'GeneratedTopicExercise',
      data: {
        id: generatedTopicExerciseId,
        exerciseDetail: JSON.stringify(exerciseDetail),
        topicExerciseHash
      }
    }).then(resp => {
      return resp
    })
  }

  /*
    Input:
      generatedTopicId: 1,
      score: 100
      timeFinish: 23.23
      exerciseDetail: '[{knowns: {a: 1, b:2}, unknowns: [{x:3}]}]'
  */
  updateGeneratedTopicAnswer (generatedTopicId, score, timeFinish, exerciseDetail) {
    return this.update({
      modelName: 'GeneratedTopicExercise',
      data: {
        id: generatedTopicId,
        submitted: true,
        score,
        timeFinish,
        exerciseDetail
      }
    })
  }

  // Get user score of an exercise
  //
  // Return:
  // 0 - 4: How many of the submitted scores are > 80%
  getExerciseStar (userId, topicId) {
    return this._sequelize.query(`
SELECT score FROM generatedTopicExercises
WHERE submitted = 1 AND topicId = ${topicId} AND userId = ${userId}
ORDER BY score DESC LIMIT 4;`,
    { type: Sequelize.QueryTypes.SELECT }).then(datas => {
      const stars = datas.reduce((acc, data) => {
        if (parseInt(data.score) >= 80) {
          return acc + 1
        } else {
          return acc
        }
      }, 0)
      return {status: true, data: {stars}}
    })
  }

  // Get the number of submissions in the leaderboard
  getTotalRanking (topicId) {
    return new Promise((resolve, reject) => {
      return this._sequelize.query(
        `SELECT COUNT(*) AS total
  FROM (SELECT COUNT(*) FROM generatedTopicExercises WHERE submitted = TRUE AND topicId = ${topicId} AND score = 100 AND timeFinish IS NOT NULL
  GROUP BY userId
  ORDER BY MIN(timeFinish)) AS totalrow;`,
        { type: Sequelize.QueryTypes.SELECT }).then(resp => {
        resolve({status: true, data: {count: resp[0].total + 1}})
      }).catch(err => {
        reject(err)
      })
    })
  }

  // Get the number of rank in leaderboard
  getCurrentRanking (timeFinish, topicId) {
    return new Promise((resolve, reject) => {
      return this._sequelize.query(
        `SELECT COUNT(*) AS total
  FROM (SELECT COUNT(*) FROM generatedTopicExercises
  WHERE submitted = TRUE AND timeFinish < ${timeFinish} AND topicId = ${topicId} AND score = 100 AND timeFinish IS NOT NULL
  GROUP BY userId
  ORDER BY MIN(timeFinish)) AS totalrow;`,
        { type: Sequelize.QueryTypes.SELECT }).then(resp => {
        resolve({status: true, data: {count: resp[0].total + 1}})
      }).catch(err => {
        reject(err)
      })
    })
  }

  /*
    Input:
      topicId: 12
    Output:
      {
        status: true,
        data: {
          id: 1
          topic: penjumlahan
        }
      }
  */
  getTopicContent (topicId) {
    return this.readOne({
      modelName: 'Topic',
      searchClause: {
        id: topicId
      }
    })
  }

  // Get leaderboard data
  getExerciseRanking (data) {
    return this._sequelize.query(
      `SELECT MIN(timeFinish) AS timeFinish, userId, users.fullName AS fullName, users.grade AS grade, schools.name AS schoolName
  FROM generatedTopicExercises INNER JOIN users ON users.id = generatedTopicExercises.userId INNER JOIN schools ON schools.id = users.schoolId
  WHERE submitted = TRUE AND topicId = ${data.topicId} AND score = 100 AND timeFinish IS NOT NULL GROUP BY userId ORDER BY MIN(timeFinish);`, { type: Sequelize.QueryTypes.SELECT }).then(resp => {
      return {status: true, data: resp}
    })
  }
}

module.exports = ExerciseService
