var path = require('path')

var log = require('npmlog')
var Promise = require('bluebird')
var pug = require('pug')
var Sequelize = require('sequelize')

var CRUDService = require(path.join(__dirname, 'crud-service'))
var ExerciseGenerator = require(path.join(__dirname, '../lib/exercise_generator/exercise-generator'))

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

  getExercise (exerciseId) {
    return this.readOne({modelName: 'Exercise', searchClause: {id: exerciseId}})
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
  generateExercise (exercise, isTopic = false) {
    var exerciseSolver = ExerciseGenerator.getExerciseSolver(exercise.data)
    var questions = null
    if (isTopic) {
      questions = exerciseSolver.generateTopicQuestions()
    } else {
      questions = exerciseSolver.generateQuestions()
    }

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
      return this.generateExercise(exerciseData, true).then(resp => {
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
    generatedExercise:
    {
      id: 140,
      exerciseHash: '306e75a560185c08fa9937e1095d9af3',
      knowns: '[{"a":10,"b":3},{"a":10,"b":1},{"a":10,"b":5},{"a":10,"b":9},{"a":10,"b":6},{"a":10,"b":2}]',
      unknowns: '[{"x":13},{"x":11},{"x":15},{"x":19},{"x":16},{"x":12}]',
      userAnswer: null,
      submitted: false,
      score: null,
      timeFinish: null,
      createdAt: 2018-04-10T02:26:51.000Z,
      updatedAt: 2018-04-10T02:26:51.000Z,
      exerciseId: 34,
      userId: 99
    }

    return:
    {
      "formatted": {
        "renderedQuestions": [
            "\n<span><img src='http://app-filosedu.nusantara-local.com/images/1519379519782_tens.jpeg' width='5%' /></span>\n<span><table class=\"image-repeat\" style=\"width: 23.333333333333332%;\"><tbody><tr><td style=\"padding:5px;\"><img src=\"http://app-filosedu.nusantara-local.com/images/1519379524931_unit.jpeg\" width=\"100%\"/></td><td style=\"padding:5px;\"><img src=\"http://app-filosedu.nusantara-local.com/images/1519379524931_unit.jpeg\" width=\"100%\"/></td><td style=\"padding:5px;\"><img src=\"http://app-filosedu.nusantara-local.com/images/1519379524931_unit.jpeg\" width=\"100%\"/></td></tr></tbody></table></span>\n\nBerapa jumlah balok diatas? (dalam angka)\n",
        ],
        "unknowns": [
            ["x"],
            ["x"],
            ["x"],
            ["x"],
            ["x"],
            ["x"]
        ]
      },
      "exerciseId": 34
    }
  */
  formatExercise (generatedExercise, exerciseSolver) {
    const data = {}
    var knowns = JSON.parse(generatedExercise.knowns)
    var unknowns = JSON.parse(generatedExercise.unknowns)

    return Promise.join(
      Promise.map(knowns, known => {
        return exerciseSolver.formatQuestion(known)
      }),
      Promise.map(unknowns, unknown => {
        return Object.keys(unknown)
      })
    ).spread((formattedQuestions, unknowns) => {
      data.formatted = {
        renderedQuestions: formattedQuestions,
        unknowns
      }
      data.exerciseId = generatedExercise.exerciseId
      return data
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

  _destroySingleGeneratedExercise (userId, exerciseId) {
    return this._models['GeneratedExercise'].destroy({where: {userId, exerciseId, submitted: false}})
  }

  _createSingleGeneratedExercise (exerciseHash, data, userId, exerciseId) {
    return this.create({
      modelName: 'GeneratedExercise',
      data: {
        exerciseHash,
        knowns: data.knowns,
        unknowns: data.unknowns,
        exerciseId,
        userId
      }
    })
  }

  updateExercise (userId, data, exerciseHash) {
    return this._destroySingleGeneratedExercise(userId, data.exerciseId).then(() => {
      return this._createSingleGeneratedExercise(exerciseHash, data, userId, data.exerciseId)
    })
  }

  saveAndGetGeneratedExercise (generateExerciseId, userAnswer) {
    return this.update({
      modelName: 'GeneratedExercise',
      data: {
        id: generateExerciseId,
        userAnswer,
        submitted: true
      }
    }).then(resp => {
      return this.read({modelName: 'GeneratedExercise', searchClause: {id: generateExerciseId}})
    })
  }

  /*
    Input:
      id: 1,
      score: 2,
      userAnswer: '[{x: "3"}]',
      submitted: true,
      timeFinish: 23.09
  */
  updateGenerateExercise (data) {
    return this.update({
      modelName: 'GeneratedExercise',
      data
    })
  }

  // Get exercise that is curently active
  getGeneratedExercise ({userId, exerciseId}) {
    return this.readOne({
      modelName: 'GeneratedExercise',
      searchClause: {userId, exerciseId, submitted: false}
    })
  }

  // Get all exercises that have been submitted
  getSubmittedExercises ({userId, exerciseId}) {
    return this.read({
      modelName: 'GeneratedExercise',
      searchClause: {userId, exerciseId, submitted: true}
    })
  }

  /*
  exerciseDetails:
  [ { knowns: '[{"a":3},{"a":5},{"a":4},{"a":2}]',
      unknowns: '[{"x":3},{"x":5},{"x":4},{"x":2}]',
      userAnswer: [],
      exerciseId: 23 },
    { knowns: '[{"a":4,"b":1}]',
      unknowns: '[{"x":5}]',
      userAnswer: [],
      exerciseId: 25 },
    { knowns: '[{"a":4,"b":1},{"a":3,"b":2},{"a":3,"b":1}]',
      unknowns: '[{"x":"Lima"},{"x":"Lima"},{"x":"Empat"}]',
      userAnswer: [],
      exerciseId: 31 } ]
      userAnswers: [ 'x=1', 'x=2', 'x=3']
  return: {
    status: true/false
    data: [
      { isCorrect: false, userAnswer: '4', unknown: [Object] },
      { isCorrect: false, userAnswer: '4', unknown: [Object] },
      { isCorrect: true, userAnswer: '4', unknown: [Object] },
      { isCorrect: false, userAnswer: '4', unknown: [Object] },
      { isCorrect: false, userAnswer: '4', unknown: [Object] },
      { isCorrect: false, userAnswer: '4314', unknown: [Object] },
      { isCorrect: false, userAnswer: '', unknown: [Object] },
      { isCorrect: false, userAnswer: '4', unknown: [Object] }
    ]
  }
  */
  checkAnswer (exerciseDetails, userAnswers) {
    // pointerIndex later tobe used as get answer when query with knowns
    var pointerIndex = 0
    return Promise.map(exerciseDetails, (exerciseDetail, index, length) => {
      return this.readOne({modelName: 'Exercise', searchClause: {id: exerciseDetail.exerciseId}}).then(resp => {
        if (resp.status) {
          const exercise = resp.data
          const exerciseSolver = ExerciseGenerator.getExerciseSolver(exercise.data)
          return JSON.parse(exerciseDetail.knowns).map((known, index2) => {
            var userAnswer = userAnswers[pointerIndex].split('=')[1]
            var isCorrect = exerciseSolver.isAnswer(known, {x: userAnswer})
            pointerIndex++
            return {isCorrect, userAnswer, unknown: JSON.parse(exerciseDetail.unknowns)[index2]}
          })
        } else {
          return {status: false, errMessage: 'Exercise is not avaiable'}
        }
      })
    }).then(results => {
      var resultAnswers = results.reduce((acc, currentValue) => {
        return acc.concat(currentValue)
      }, [])
      return {status: true, data: resultAnswers}
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
        topicExerciseHash,
        createdAt: Date.now()
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
  getTopic (topicId) {
    return this.readOne({
      modelName: 'Topic',
      searchClause: {
        id: topicId
      }
    })
  }

  // Get user score of an exercise
  //
  // Return:
  // 0 - 4: How many of the submitted scores are > 80%
  _getExerciseStars (userId, id, tableName) {
    if (tableName === 'generatedTopicExercises') {
      return this._sequelize.query(`
  SELECT score FROM ${tableName}
  WHERE submitted = 1 AND topicId = ${id} AND userId = ${userId}
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
    } else {
      return this._sequelize.query(`
  SELECT score FROM generatedExercises
  WHERE submitted = 1 AND userId = ${userId} AND exerciseId = ${id}
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
  }

  /*
    if renderStar is true
      will return {
        status: true,
        data: '<span><img /></span>'
      }
    else
      {
        status: true,
        data: {
          stars: 0.25 / 1 / 0
        }
      }
  */
  _getExerciseStarsUniversal (userId, id, tableName, renderStar = true) {
    return this._getExerciseStars(userId, id, tableName).then(resp => {
      if (resp.status) {
        if (renderStar) {
          const stars = resp.data.stars
          const html = pug.renderFile(path.join(__dirname, '../app/views/non-pages/stars.pug'), {stars})
          return {status: true, data: html}
        } else {
          return resp
        }
      } else {
        return (resp)
      }
    })
  }

  getSubtopicExerciseStars (userId, id, renderStar = true) {
    return this._getExerciseStarsUniversal(userId, id, 'generatedExercises', renderStar)
  }

  getTopicExerciseStars (userId, id, renderStar = true) {
    return this._getExerciseStarsUniversal(userId, id, 'generatedTopicExercises', renderStar)
  }

  // Specially called from course controller
  getSubtopicStar (userId, subtopicId) {
    return this.read({
      modelName: 'Exercise', searchClause: {subtopicId}
    }).then(resp => {
      return Promise.map(resp.data || [], exercise => {
        return this._getExerciseStars(userId, exercise.id, 'generatedExercises')
      }).then(datas => {
        const stars = datas.reduce((acc, resp) => {
          return acc + resp.data.stars
        }, 0)
        return {status: true, data: {stars}}
      })
    })
  }

  // Get leaderboard data
  _getExerciseRanking (id, tableName) {
    if (tableName === 'generatedTopicExercises') {
      return this._sequelize.query(
        `SELECT MIN(timeFinish) AS timeFinish, userId, users.fullName AS fullName, users.grade AS grade, schools.name AS schoolName
    FROM generatedTopicExercises INNER JOIN users ON users.id = generatedTopicExercises.userId INNER JOIN schools ON schools.id = users.schoolId
    WHERE submitted = TRUE AND topicId = ${id} AND score = 100 AND timeFinish IS NOT NULL GROUP BY userId ORDER BY MIN(timeFinish);`, { type: Sequelize.QueryTypes.SELECT }).then(resp => {
        return {status: true, data: resp}
      })
    } else {
      return this._sequelize.query(
        `SELECT MIN(timeFinish) AS timeFinish, userId, users.fullName AS fullName, users.grade AS grade, schools.name AS schoolName
    FROM generatedExercises INNER JOIN users ON users.id = generatedExercises.userId INNER JOIN schools ON schools.id = users.schoolId
    WHERE submitted = TRUE AND exerciseId = ${id} AND score = 100 AND timeFinish IS NOT NULL GROUP BY userId ORDER BY MIN(timeFinish);`,
        { type: Sequelize.QueryTypes.SELECT }).then(resp => {
        return {status: true, data: resp}
      })
    }
  }

  getExerciseLeaderboard (id, isTopic = true, renderLeaderboard = true) {
    var tableName = null
    if (isTopic) {
      tableName = 'generatedTopicExercises'
    } else {
      tableName = 'generatedExercises'
    }
    return this._getExerciseRanking(id, tableName).then(resp => {
      if (resp.status) {
        if (renderLeaderboard) {
          const exerciseData = resp.data
          const html = pug.renderFile(path.join(__dirname, '../app/views/non-pages/ranking.pug'), {exerciseData})
          return {status: true, data: html}
        } else {
          return resp
        }
      } else {
        return (resp)
      }
    })
  }

  // Get the number of rank in leaderboard
  _getCurrentRanking (timeFinish, id, isTopic = true) {
    return new Promise((resolve, reject) => {
      var queryDB = null
      if (isTopic) {
        queryDB = `SELECT COUNT(*) AS total
  FROM (SELECT COUNT(*) FROM generatedTopicExercises
  WHERE submitted = TRUE AND timeFinish < ${timeFinish} AND topicId = ${id} AND score = 100 AND timeFinish IS NOT NULL
  GROUP BY userId
  ORDER BY MIN(timeFinish)) AS totalrow;`
      } else {
        queryDB = `SELECT COUNT(*) AS total
  FROM (SELECT COUNT(*) FROM generatedExercises
  WHERE submitted = TRUE AND timeFinish < ${timeFinish} AND exerciseId = ${id} AND score = 100 AND timeFinish IS NOT NULL
  GROUP BY userId
  ORDER BY MIN(timeFinish)) AS totalrow;`
      }

      return this._sequelize.query(queryDB,
        { type: Sequelize.QueryTypes.SELECT }).then(resp => {
        resolve({status: true, data: {count: resp[0].total}})
      }).catch(err => {
        reject(err)
      })
    })
  }

  getSubtopicCurrentRanking (timeFinish, exerciseId) {
    return this._getCurrentRanking(timeFinish, exerciseId, false)
  }

  getTopicCurrentRanking (timeFinish, topicId) {
    return this._getCurrentRanking(timeFinish, topicId)
  }

  // Get the number of submissions in the leaderboard
  _getTotalRanking (id, isTopic = true) {
    return new Promise((resolve, reject) => {
      var queryDB = null
      if (isTopic) {
        queryDB = `SELECT COUNT(*) AS total
  FROM (SELECT COUNT(*) FROM generatedTopicExercises WHERE submitted = TRUE AND topicId = ${id} AND score = 100 AND timeFinish IS NOT NULL
  GROUP BY userId
  ORDER BY MIN(timeFinish)) AS totalrow;`
      } else {
        queryDB = `SELECT COUNT(*) AS total
  FROM (SELECT COUNT(*) FROM generatedExercises WHERE submitted = TRUE AND exerciseId = ${id} AND score = 100 AND timeFinish IS NOT NULL
  GROUP BY userId
  ORDER BY MIN(timeFinish)) AS totalrow;`
      }
      return this._sequelize.query(queryDB,
        { type: Sequelize.QueryTypes.SELECT }).then(resp => {
        resolve({status: true, data: {count: resp[0].total}})
      }).catch(err => {
        reject(err)
      })
    })
  }

  getSubtopicTotalRanking (exerciseId) {
    return this._getTotalRanking(exerciseId, false)
  }

  getTopicTotalRanking (topicId) {
    return this._getTotalRanking(topicId)
  }
}

module.exports = ExerciseService