import * as Promise from 'bluebird'
import BruteforceSolver, { GeneratedQuestionData } from '../lib/exercise_generator/exercise_solvers/bruteforce-solver'
import CRUDService from './crud-service-neo'
import ExerciseGenerator from '../lib/exercise_generator/exercise-generator'
import ExerciseService from './exercise-service'

let path = require('path')

let log = require('npmlog')
let pug = require('pug')
let moment = require('moment')
let Sequelize = require('sequelize')

const AppConfig = require(path.join(__dirname, '../app-config'))
const Utils = require(path.join(__dirname, '../lib/utils'))

const TAG = 'TopicExerciseService'

export interface GeneratedTopicExerciseDetail {
  knowns: string, // stringified JSON
  unknowns: string, // stringified JSON
  userAnswer: string, // stringified JSON
  exerciseHash: string
  exerciseId: number
}

class TopicExerciseService extends CRUDService {
  // TODO: We should use version on courseService instead of this
  private getTopic (topicId): Promise<NCResponse<Topic>> {
    return this.readOne<Topic>({ modelName: 'Topic', searchClause: { id: topicId } })
  }

  // TODO: Should call formatExercise()
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
          exerciseId: 40,
          idealTime: 60,
          subtopicName: 'Pengenalan Hasil Bilangan 1-5'
        }
        formatted: {
          renderedQuestions, // HTML-rendered question array
          unknowns, // Variable for inputs
          subtopicName: 'Penjumlahan Hasil Bilangan 1-5'
        }
      }
    }
  */
  getFormattedExercise (topicId, userId): Promise<NCResponse<FormattedTopicExercise>> {
    if (topicId && userId) {
      return Promise.join<any>(
        this.getExercises(topicId),
        this.getGeneratedTopicExercise(userId, topicId),
        this.getExercisesHash(topicId),
        this.getTopic(topicId)
      ).spread((resp: NCResponse<Exercise[]>, resp2: NCResponse<GeneratedTopicExercise>,
                resp3: NCResponse<string>, resp4: NCResponse<Topic>) => {
        if (resp3.status && resp4.status) {
          const topicExerciseHash = resp3.data
          // If there's valid exercise to be restored
          if (resp2.status && resp2.data && resp2.data.topicExerciseHash === topicExerciseHash) {
            return this.formatGeneratedTopicExercise(resp2.data)
          } else if (resp.status && resp.data &&
                    ((resp2.status && resp2.data && resp2.data.topicExerciseHash !== topicExerciseHash) ||
                    !resp2.status)) {
            // If there's expired generated exercise or no generated exercise to be restored
            return this.generateTopicExercise(topicId, userId, resp.data).then(resp5 => {
              if (resp5.status && resp5.data) {
                return this.formatGeneratedTopicExercise(resp5.data)
              } else {
                return { status: false, errMessage: resp5.errMessage }
              }
            })
          } else {
            // We should never get here..
            throw new Error('Unexpected error!')
          }
        } else {
          throw new Error(`Failed to retrieve topic or topicExerciseHash: ${resp3.errMessage || resp4.errMessage}`)
        }
      })
    } else {
      return Promise.resolve({ status: false, errMessage: 'topicId and userId are required!' })
    }
  }
  /*
      return:
        { status: true,
          data: {
            id,
            data: [nodeJsCodeForExercise1, nodeJsCodeForExercise2]
          }
    */
  private getExercises (topicId): Promise<NCResponse<Exercise[]>> {
    log.verbose(TAG, `course.service.getExerciseRelatedWithTopicId.GET (topicId): ${topicId}`)
    return this.getSequelize().query(`
  SELECT exercises.id, exercises.data, exercises.createdAt, exercises.updatedAt, exercises.subtopicId
  FROM exercises AS exercises
  INNER JOIN subtopics AS subtopic ON exercises.subtopicId = subtopic.id AND subtopic.topicId = ${topicId}
  ORDER BY subtopic.subtopicNo ASC, exercises.id ASC;`, { type: Sequelize.QueryTypes.SELECT }
    ).then(resp => {
      return { status: true, data: resp }
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
  private getExercisesHash (topicId): Promise<NCResponse<string>> {
    return this.getExercises(topicId).then(resp => {
      if (resp.status && resp.data) {
        const combinedHash = resp.data.reduce((acc, hash) => {
          return acc + ExerciseGenerator.getHash(hash)
        }, '')
        let topicExerciseHash = ExerciseGenerator.getHash(combinedHash)
        return { status: true, data: topicExerciseHash }
      } else {
        return { status: false, errMessage: resp.errMessage }
      }
    })
  }

  generateTopicExercise (topicId, userId, exercises: Exercise[]): Promise<NCResponse<GeneratedTopicExercise>> {
    return this.getExercisesHash(topicId).then(resp => {
      if (resp.status && resp.data) {
        const topicExerciseHash = resp.data
        return Promise.map(exercises, exercise => {
          return ExerciseService.generateExercise(exercise, true).then(resp => {
            if (resp.status) {
              // Check this has questions
              const parsedKnowns = JSON.parse(resp.data.exerciseData.knowns)
              if (parsedKnowns.length > 0) {
                return {
                  exerciseData: resp.data.exerciseData
                }
              } else {
                // Skip over empty questions
                return null
              }
            } else {
              return null
            }
          })
        }).then(results => {
          const exerciseDetail: any[] = []
          let idealTime = 0

          // Needed for TS to typecheck
          function notEmpty<TValue> (value: TValue | null | undefined): value is TValue {
            return value !== null && value !== undefined
          }

          results.filter(notEmpty).forEach(result => {
            idealTime += result.exerciseData.idealTime
            exerciseDetail.push(result.exerciseData)
          })

          // In case that the exercise is no longer up-to-date, we have to delete stale generated exercise
          return this.getModels('GeneratedTopicExercise').destroy({where: {
            topicId,
            userId,
            submitted: false,
            onCloud: AppConfig.CLOUD_SERVER
          }}).then(() => {
            return this.create<GeneratedTopicExercise>({
              modelName: 'GeneratedTopicExercise',
              data: {
                topicId,
                userId,
                exerciseDetail: JSON.stringify(exerciseDetail),
                topicExerciseHash,
                idealTime,
                onCloud: AppConfig.CLOUD_SERVER
              }
            })
          })
        })
      } else {
        return { status: false, errMessage: 'Failed to retrieve exercise hash!' }
      }
    })

  }

    // TODO: Should call formatExercise()
  /*
    This is like generateExercise, but skips exercise that doesn't have any questions

    exerciseDatas: [{
      id: 13,
      data: // NodeJS Code describing the exercise
      createdAt: 2018-02-21T08:50:28.000Z,
      updatedAt: 2018-03-04T13:38:48.000Z,
      subtopicId: 13,
      subtopic: 'Pengenalan Bilangan 1 - 5',
      subtopic.description: '',
      subtopic.data: '{"detail":""}',
      subtopic.subtopicNo: 101,
      subtopic.topicId: 12
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
        }],
        idealTime: 50
      }
    }
  */
  generateExercises (exercises: Exercise[]) {
    return Promise.map(exercises, exercise => {
      return ExerciseService.generateExercise(exercise, true).then(resp => {
        if (resp.status) {
          // Check this has questions
          const parsedKnowns = JSON.parse(resp.data.exerciseData.knowns)
          if (parsedKnowns.length > 0) {
            return {
              exerciseData: resp.data.exerciseData,
              formatted: resp.data.formatted
            }
          } else {
            // Skip over empty questions
            return null
          }
        } else {
          return null
        }
      })
    }).then(results => {
      const exerciseData: any[] = []
      const formatted: any[] = []
      let idealTime = 0

      // Needed for TS to typecheck
      function notEmpty<TValue> (value: TValue | null | undefined): value is TValue {
        return value !== null && value !== undefined
      }

      results.filter(notEmpty).forEach(result => {
        idealTime += result.exerciseData.idealTime
        exerciseData.push(result.exerciseData)
        formatted.push(result.formatted)
      })

      return {
        status: true,
        data: {
          exerciseData,
          formatted,
          idealTime
        }
      }
    })
  }

  /*
    Promise.join<any>(
      this.getExercises(topicId),
      this.getGeneratedTopicExercise(userId, topicId),
      this.getExercisesHash(topicId),
      this.getTopic(topicId)
    ).spread((resp: NCResponse<Exercise[]>, resp2: NCResponse<GeneratedTopicExercise>,
              resp3: NCResponse<string>, resp4: NCResponse<Topic>) => {
      // log.verbose(TAG, 'exercise.review.GET: resp=' + JSON.stringify(resp))
      // log.verbose(TAG, 'exercise.review.GET: resp2=' + JSON.stringify(resp2))
      if (resp3.status && resp4.status) {
        const topicName = resp4.data
        const topicExerciseHash = resp3.data
        // If there's valid exercise to be restored
        if (resp2.status && resp2.data && resp2.data.topicExerciseHash === topicExerciseHash) {
          const generatedTopicExercise: GeneratedExercise[] = JSON.parse(resp2.data.exerciseDetail)
          const idealTime = resp2.data.idealTime
          const elapsedTime = Utils.getElapsedTime(resp2.data.createdAt)
          return this.formatExercises(generatedTopicExercise, topicId, idealTime, elapsedTime).then(resp5 => {
            if (resp5.status && resp5.data) {
              return {
                formatted: resp5.data,
                topicName,
                idealTime,
                elapsedTime
              }
            } else {
              throw new Error('Could not formatExercise: ' + resp5.errMessage)
            }
          })
  */

  private formatGeneratedTopicExercise (generatedTopicExercise: GeneratedTopicExercise): Promise<NCResponse<FormattedTopicExercise>> {
    const topicId = generatedTopicExercise.topicId
    const generatedExercises: GeneratedExercise[] = JSON.parse(generatedTopicExercise.exerciseDetail)
    return Promise.map(generatedExercises, generatedExercise => {
      return this.readOne<Exercise>({ modelName: 'Exercise', searchClause: { id: generatedExercise.exerciseId } }).then(resp2 => {
        if (resp2.status && resp2.data) {
          let exerciseSolver = ExerciseGenerator.getExerciseSolver(resp2.data.data)
          let unknowns: Array<string[]> = []
          let formattedQuestionsPromises: Array<Promise<string>> = []
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
            } as FormattedExercise
          })
        } else {
          throw new Error(resp2.errMessage)
        }
      })
    }).then(formattedExercises => {
      return this.readOne<Topic>({ modelName: 'Topic', searchClause: { id: topicId } }).then(resp => {
        if (resp.status && resp.data) {
          return {
            status: true,
            data: {
              topicName: resp.data.topic,
              formattedExercises,
              idealTime: generatedTopicExercise.idealTime,
              elapsedTime: Utils.getElapsedTime(generatedTopicExercise.createdAt)
            }
          }
        } else {
          return { status: false, errMessage: '' }
        }
      })
    })
  }

  /*
  Input:
    generatedExercises: [{
      knowns: '[{"a":2,"b":2},{"a":2,"b":1}]',
      unknowns: '[{"x":"Empat"},{"x":"Tiga"}]',
      userAnswer: [],
      exerciseId: 14,
      subtopicName: 'Penjumlahan Hasil Bilangan 1-5',
      idealTime: 40
    }]

  Output:
    [{
      "status": true,
      "data": {
        renderedQuestions: ["\n2 + 3 = ?\n", "\n1 + 2 = ?\n"], // HTML-rendered question array
        unknowns: [["x"], ["x"]], // Variable for inputs
      }
    }]
  */
  // TODO: Re-use .formatExercise() from exercise-service
  private formatExercises (generatedExercises: GeneratedExercise[]): Promise<NCResponse<FormattedExercise[]>> {
    return Promise.map(generatedExercises, generatedExercise => {
      return this.readOne<Exercise>({ modelName: 'Exercise', searchClause: { id: generatedExercise.exerciseId } }).then(resp => {
        if (resp.status && resp.data) {
          let exerciseSolver = ExerciseGenerator.getExerciseSolver(resp.data.data)
          let unknowns: any[] = []
          let formattedQuestionsPromises: Array<Promise<string>> = []
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
        data: formattedExercises
      }
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
  userAnswers: [{x: 3}, {x: 5}, {x: 4}, {x: 2}, {x: 5}, {x: 'lima'}, {x: 'lima'}, {x: 'empat'}]
  return: {
    status: true/false
    data: [
      {isCorrect: false, unknown: {"x":3}},
      {isCorrect: false, unknown: {"x":5}},
      {isCorrect: true, unknown: {"x":"Lima"}},

    ]
  }
  */
  checkAnswer (exerciseDetails: GeneratedTopicExerciseDetail[], userAnswers: Array<{[key: string]: any}>): Promise<NCResponse<any>> {
    return Promise.map(exerciseDetails, (exerciseDetail, index) => {
      return this.readOne<Exercise>({ modelName: 'Exercise', searchClause: { id: exerciseDetail.exerciseId } }).then(resp => {
        if (resp.status && resp.data) {
          const exercise = resp.data
          const exerciseSolver = ExerciseGenerator.getExerciseSolver(exercise.data)
          const knowns = JSON.parse(exerciseDetail.knowns)
          const unknowns = JSON.parse(exerciseDetail.unknowns)
          return knowns.map((known, index) => {
            return { known, unknown: unknowns[index], isAnswerFn: exerciseSolver.isAnswer.bind(exerciseSolver) }
          })
        } else {
          throw new Error('Exercise with id=' + exerciseDetail.exerciseId + ' could not be found!')
        }
      })
    }).then(results => {
      // [[{known: {a: 3}, unknown, isAnswerFn}, {known: {a: 5}, unknown, isAnswerFn: [Object]}], [[{}, {}]. [{}, {}]] -> [{}, {}, {}, {}]]
      // [{known: {a: 3}, unknown, isAnswerFn: [Object]}, {known: {a: 5}, unknown, isAnswerFn: [Object]}]
      const flattenedResults = results.reduce((acc, resultArr) => {
        return acc.concat(resultArr)
      }, [])
      const data = flattenedResults.map((result, index) => {
        return { isCorrect: result.isAnswerFn(result.known, userAnswers[index]), unknown: result.unknown }
      })

      return { status: true, data }
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
  getGeneratedTopicExercise (userId, topicId): Promise<NCResponse<GeneratedTopicExercise>> {
    return this.readOne<GeneratedTopicExercise>({
      modelName: 'GeneratedTopicExercise',
      searchClause: {
        userId,
        topicId,
        submitted: false,
        onCloud: AppConfig.CLOUD_SERVER
      }
    })
  }

  /*
  Input:
    topicId: 3
    userId; 5,
    exerciseDetail:
    [ { knowns: '[{"a":2,"b":2},{"a":2,"b":1}]',
        unknowns: '[{"x":"Empat"},{"x":"Tiga"}]',
        userAnswer: [],
        exerciseId: 14 } ],
    topicExerciseHash: 'kdkdkdk',
    idealTime: 50

    If there's already unsubmitted generatedTopicExercise, remove it first. Then
    save generatedTopicExercise of a user to database
  */
  saveGeneratedTopicExercise (topicId, userId, exerciseDetail, topicExerciseHash, idealTime) {
    return this.getModels('GeneratedTopicExercise').destroy({where: {
      topicId,
      userId,
      submitted: false,
      onCloud: AppConfig.CLOUD_SERVER
    }}).then(() => {
      return this.create<GeneratedTopicExercise>({
        modelName: 'GeneratedTopicExercise',
        data: {
          topicId,
          userId,
          exerciseDetail: JSON.stringify(exerciseDetail),
          topicExerciseHash,
          idealTime,
          onCloud: AppConfig.CLOUD_SERVER
        }
      })
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
    return this.update<GeneratedTopicExercise>({
      modelName: 'GeneratedTopicExercise',
      data: {
        id: generatedTopicId,
        submitted: true,
        submittedAt: moment().local().format('YYYY-MM-DD HH:mm:ss'),
        onCloud: AppConfig.CLOUD_SERVER,
        score,
        timeFinish,
        exerciseDetail
      }
    })
  }

  getExerciseStars (userId, id) {
    return this.getSequelize().query(`
SELECT score FROM generatedTopicExercises
WHERE submitted = 1 AND topicId = ${id} AND userId = ${userId}
ORDER BY score DESC LIMIT 4;`,
    { type: Sequelize.QueryTypes.SELECT }).then(datas => {
      const stars = datas.reduce((acc, data) => {
        if (parseInt(data.score, 10) >= 80) {
          return acc + 1
        } else {
          return acc
        }
      }, 0)
      return { status: true, data: { stars } }
    })
  }

  getRenderedExerciseStars (userId, id, renderStar = true) {
    return this.getExerciseStars(userId, id).then(resp => {
      if (resp.status) {
        const stars = resp.data.stars
        const html = pug.renderFile(path.join(__dirname, '../app/views/non-pages/stars.pug'), { stars })
        return { status: true, data: { html, stars } }
      } else {
        return resp
      }
    })
  }

  getTopicExerciseCheckmark (userId, topicId, render = false) {
    return this.getSequelize().query(`
SELECT score FROM generatedTopicExercises
WHERE submitted = 1 AND topicId = ${topicId} AND userId = ${userId} AND score > 80
ORDER BY score DESC LIMIT 1;`,
    { type: Sequelize.QueryTypes.SELECT }).then(datas => {
      const isChecked = datas.length > 0
      if (render) {
        const html = pug.renderFile(path.join(__dirname, '../app/views/non-pages/ceckmark.pug'), { isChecked })
        return { status: true, data: html }
      } else {
        return { status: true, data: { isChecked } }
      }
    })
  }

  getExerciseTimers (userId, id) {
    return this.getSequelize().query(`
SELECT score FROM generatedTopicExercises
WHERE submitted = 1 AND topicId = ${id} AND userId = ${userId}
AND timeFinish < idealTime AND score = 100
ORDER BY score DESC LIMIT 1;`,
    { type: Sequelize.QueryTypes.SELECT }).then(datas => {
      const timers = datas.reduce((acc, data) => {
        if (parseInt(data.score, 10) >= 80) {
          return acc + 1
        } else {
          return acc
        }
      }, 0)

      return { status: true, data: { timers } }
    })
  }

  getRenderedExerciseTimers (userId, id, tableName) {
    return this.getExerciseTimers(userId, id).then(resp => {
      if (resp.status) {
        const timers = resp.data.timers
        const html = pug.renderFile(path.join(__dirname, '../app/views/non-pages/timers.pug'), { timers })
        return { status: true, data: html }
      } else {
        return (resp)
      }
    })
  }

    // Get leaderboard data
  getExerciseRanking (topicId) {
    return this.getSequelize().query(
`SELECT MIN(timeFinish) AS timeFinish, userId, users.fullName AS fullName, users.grade AS grade, schools.name AS schoolName
FROM generatedTopicExercises INNER JOIN users ON users.id = generatedTopicExercises.userId INNER JOIN schools ON schools.id = users.schoolId
WHERE submitted = TRUE AND topicId = ${topicId} AND score = 100 AND timeFinish IS NOT NULL GROUP BY userId ORDER BY MIN(timeFinish) LIMIT 10;`,
    { type: Sequelize.QueryTypes.SELECT }).then(resp => {
      return { status: true, data: resp }
    })
  }

  getExerciseLeaderboard (topicId) {
    return this.getExerciseRanking(topicId).then(resp => {
      if (resp.status) {
        const exerciseData = resp.data
        const html = pug.renderFile(path.join(__dirname, '../app/views/non-pages/ranking.pug'), { exerciseData })
        return { status: true, data: html }
      } else {
        return resp
      }
    })
  }

  // Get the number of rank in leaderboard
  getCurrentRanking (timeFinish, topicId) {
    return new Promise((resolve, reject) => {
      const queryDB = `SELECT COUNT(*) AS total
FROM (SELECT COUNT(*) FROM generatedTopicExercises
WHERE submitted = TRUE AND timeFinish < ${timeFinish} AND topicId = ${topicId} AND score = 100 AND timeFinish IS NOT NULL
GROUP BY userId
ORDER BY MIN(timeFinish)) AS totalrow;`
      return this.getSequelize().query(queryDB,
        { type: Sequelize.QueryTypes.SELECT }).then(resp => {
          resolve({ status: true, data: { count: resp[0].total } })
        }).catch(err => {
          reject(err)
        })
    })
  }

  // Get the number of submissions in the leaderboard
  getTotalRanking (id) {
    return new Promise((resolve, reject) => {
      let queryDB = `SELECT COUNT(*) AS total
FROM (SELECT COUNT(*) FROM generatedTopicExercises WHERE submitted = TRUE AND topicId = ${id} AND score = 100 AND timeFinish IS NOT NULL
GROUP BY userId
ORDER BY MIN(timeFinish)) AS totalrow;`
      return this.getSequelize().query(queryDB,
        { type: Sequelize.QueryTypes.SELECT }).then(resp => {
          resolve({ status: true, data: { count: resp[0].total } })
        }).catch(err => {
          reject(err)
        })
    })
  }
}

export default new TopicExerciseService()
