import * as Promise from 'bluebird'
import * as moment from 'moment-timezone'
import BruteforceSolver, { GeneratedQuestionData } from '../lib/exercise_generator/exercise_solvers/bruteforce-solver'
import CRUDService from './crud-service-neo'
import CourseService from './course-service'
import ExerciseGenerator from '../lib/exercise_generator/exercise-generator'
import ExerciseService from './exercise-service'
import ExerciseHelper from '../app/utils/exercise-helper'
import TopicExerciseService, { TopicExerciseAnswer } from './topic-exercise-service'
import * as Utils from '../lib/utils'

let path = require('path')

let log = require('npmlog')
let pug = require('pug')
let Sequelize = require('sequelize')

const AppConfig = require(path.join(__dirname, '../app-config'))

const TAG = 'CompetencyExerciseService'

/*
Design:
Since competency test can be quite timely (there are 120 subtopics), we don't want students
having to finish it immediately. Instead, there are checkpoints at every topics.
After every topic, a "time to take a break" page will be shown. Tell students that, once the
"start" button is pressed, timer is started until another "time to take a break" page is shown.
So make sure to do it in an environment without distraction. There's also "abandon test" button
in case student doesn't want to continue it.

Step:
1. Row entry is looked up from req.session.competencyExerciseId === competencyExecise.id
2. Check if submitted ==== false && abandoned === false
3. Check competency exercise hash. If it has changed, re-create.
4. Show "time to take a break" page
 */

interface TopicInformation {
  topicName: string
  topicNo: number
  topicQuantity: number
  questionQuantity: number
  idealTime: number
}

interface TopicResult {
  topicName: string
  skipped: boolean
  score: number
  idealTime: number
  timeFinish: string
  timeScore: number // X <= idealTime:  100. idealTime < X <= 2 * idealTime: 75%. 2 * idealTime < X <= 3 * idealTime: 50%.
}

export type CompetencyExerciseAnswer = Array<{[key: string]: any}>

/*
  These are the different states an exercise can be at.
  This state is inferred from GeneratedCompetencyExercise, but is presented
  in a more user-friendly way for controller to use.

  submitted: Has been submitted, report page and score are to be shown.
             This is identified by submitted column = true
  abandoned: Has been abandoned, abandoned page where user can re-take is to be shown.
             This is identified by abandoned column = true
             finished: exercises has been completed, but not yet submitted, submission page is to be shown.
             This is identified by all generatedTopicExercises' submitted = true
  exercising: In the middle of a topic exercise.
              This is identified by at least one generatedTopicExercise with submitted = false that
              has createdAt field defined.
  pendingExercise: There's a topic exercise to do, but not started
                   This is identified by the at least one generatedTopicExercise with submitted = true that
                   doesn't have createdAt field defined.
  skipped: "Belum belajar" button is pressed. Internally identified with submitted = true, but no createdAt

The most unintuitive things are probably exercising and pendingExercise state.
*/
export type ExerciseState = 'submitted' | 'abandoned' | 'finished' | 'exercising' | 'pendingExercise' | 'skipped'
type TopicState = 'finished' | 'skipped' | 'pending'

class CompetencyExerciseService extends CRUDService {
  getExerciseCodes () {
    return super.read<CompetencyExerciseCode>({
      modelName: 'CompetencyExerciseCode',
      searchClause: {}
    })
  }

  addExerciseCode (code: string) {
    return super.create<CompetencyExerciseCode>({
      modelName: 'CompetencyExerciseCode',
      data: {
        code: code.toLowerCase()
      }
    })
  }

  deleteExerciseCode (id: number) {
    return super.delete({
      modelName: 'CompetencyExerciseCode',
      data: {
        id
      }
    })
  }

  submitExerciseCode (code: string): Promise<NCResponse<any>> {
    if (code) {
      return super.readOne<CompetencyExerciseCode>({
        modelName: 'CompetencyExerciseCode',
        searchClause: {
          code: code.toLowerCase()
        }
      }).then(resp => {
        if (resp.status && resp.data) {
          const compExerciseCode = resp.data
          return super.update<CompetencyExerciseCode>({
            modelName: 'CompetencyExerciseCode',
            data: {
              id: compExerciseCode.id,
              hits: compExerciseCode.hits + 1
            }
          })
        } else {
          return { status: false, errMessage: 'Code tidak terdaftar' }
        }
      })
    } else {
      return Promise.resolve({ status: false, errMessage: 'Code harus diisi' })
    }
  }

  // Get an exercise that is not yet finished
  getGeneratedExercise (competencyExerciseId: number): Promise<NCResponse<GeneratedCompetencyExercise>> {
    if (competencyExerciseId) {
      return super.readOne<GeneratedCompetencyExercise>({
        modelName: 'GeneratedCompetencyExercise',
        searchClause: {
          id: competencyExerciseId
        }}
      )
    } else {
      return Promise.resolve({ status: false, errMessage: 'competencyExerciseId is required!' })
    }
  }

  // This function is supposed to return the original reference to the GeneratedTopicExercise,
  // instead of a clone of it. This behavior is expected by other functions that use this.
  getTopicExerciseByState (state: ExerciseState, topics: Partial<GeneratedTopicExercise>[]): NCResponse<GeneratedTopicExercise> {
    // const topics = JSON.parse(generatedExercise.exerciseDetail || '') as GeneratedTopicExercise[]
    let topic
    switch (state) {
      case 'exercising':
        topic = topics.find(topic => !topic.submitted && 'createdAt' in topic)
        if (topic !== undefined) {
          return { status: true, data: topic }
        } else {
          return { status: false, errMessage: `No topic with 'exercising' state!` }
        }
      case 'pendingExercise':
        topic = topics.find(topic => !topic.submitted && !('createdAt' in topic))
        if (topic !== undefined) {
          return { status: true, data: topic }
        } else {
          return { status: false, errMessage: `No topic with 'pendingExercise' state!` }
        }
      /* case 'skipped':
        topic = topics.find(topic => topic.submitted === true && !('createdAt' in topic))
        if (topic !== undefined) {
          return { status: true, data: topic }
        } else {
          return { status: false, errMessage: `No topic with 'pendingExercise' state!` }
        } */
      default:
        return { status: false, errMessage: `Unexpected state: ${state}` }
    }
  }

  /*
    NOTE: This returns the state for a topic, not for the entire competency exercise.
          For example, an exercise is 'finished' if it's ready to be submitted. But a topic
          is finished if it is already submitted. The semantics are a bit different
  */
  private getTopicState (generatedTopicExercise: Partial<GeneratedTopicExercise>): NCResponse<TopicState> {
    let state: TopicState
    if (generatedTopicExercise.createdAt && generatedTopicExercise.submitted) {
      state = 'finished'
    } else if (!('createdAt' in generatedTopicExercise) && generatedTopicExercise.submitted) {
      state = 'skipped'
    } else if (!('createdAt' in generatedTopicExercise) && !generatedTopicExercise.submitted) {
      state = 'pending'
    } else {
      return { status: false, errMessage: 'Unexpected state!' }
    }
    return { status: true, data: state }
  }

  /*
    NCResponse convention:
    true: the generated exercise is found
    false: the generated exercise is not found or found but with invalid state
   */
  getExerciseState (generatedExercise: GeneratedCompetencyExercise): NCResponse<ExerciseState> {
    let state: ExerciseState
    const topics = JSON.parse(generatedExercise.exerciseDetail || '') as GeneratedTopicExercise[]
    log.verbose(TAG, 'getExerciseState: topics=' + JSON.stringify(topics, null, 2))
    if (generatedExercise.submitted) {
      state = 'submitted'
    } else if (generatedExercise.abandoned) {
      state = 'abandoned'
    } else if (this.getTopicExerciseByState('exercising', topics).status) {
      state = 'exercising'
    } else if (this.getTopicExerciseByState('pendingExercise', topics).status) {
      state = 'pendingExercise'
    } else if (topics.find(topic => !topic.submitted) === undefined) {
      state = 'finished'
    } else {
      return { status: false, errMessage: 'generatedCompetencyExercise has an invalid state!' }
    }
    return { status: true, data: state }
  }

  getExerciseStateById (competencyExerciseId: number): Promise<NCResponse<ExerciseState>> {
    return super.readOne<GeneratedCompetencyExercise>({
      modelName: 'GeneratedCompetencyExercise',
      searchClause: {
        id: competencyExerciseId
      }}
    ).then(resp => {
      if (resp.status && resp.data) {
        return this.getExerciseState(resp.data)
      } else {
        return { status: false, errMessage: 'generatedCompetencyExercise could not be found: ' + resp.errMessage }
      }
    })
  }

  getSubmittedExerciseInformation (generatedExercise: GeneratedCompetencyExercise): Promise<NCResponse<TopicResult[]>> {
    function computeTimeScore (idealTime, timeFinish) {
      if (timeFinish <= idealTime) {
        return 100
      } else if (timeFinish > idealTime && timeFinish <= idealTime * 2) {
        return 75
      } else if (timeFinish > idealTime * 2 && timeFinish <= idealTime * 3) {
        return 50
      } else if (timeFinish > idealTime * 3 && timeFinish <= idealTime * 4) {
        return 25
      } else {
        return 0
      }
    }

    const resp2 = this.getExerciseState(generatedExercise)
    if (resp2.status && resp2.data) {
      if (resp2.data === 'submitted') {
        const topics = JSON.parse(generatedExercise.exerciseDetail || '') as GeneratedTopicExercise[]
        return Promise.map(topics, topic => {
          const resp = this.getTopicState(topic)
          if (resp.status) {
            return CourseService.getTopic(topic.topicId).then(resp2 => {
              if (resp2.status && resp2.data) {
                return {
                  topicName: resp2.data.topic,
                  skipped: resp.data === 'skipped',
                  score: parseInt('' + topic.score, 10),
                  idealTime: parseInt('' + topic.idealTime, 10),
                  timeFinish: '' + parseInt('' + topic.timeFinish, 10),
                  timeScore: computeTimeScore(topic.idealTime, topic.timeFinish)
                }
              } else {
                throw new Error(`Failed to get topic information: ${resp2.errMessage}`)
              }
            })
          } else {
            throw new Error('Failed to get topic state: ' + resp.errMessage)
          }
        }).then(results => {
          return { status: true, data: results }
        })
      } else {
        return Promise.resolve({ status: false, errMessage: `Only 'submitted' exercise can be processed!` })
      }
    } else {
      return Promise.resolve({ status: false, errMessage: `Failed to get exercise state: ${resp2.errMessage}` })
    }
  }

  // Given an exercise with state 'pendingExercise', return "break page" associated with it
  getPendingTopicInformation (generatedExercise: GeneratedCompetencyExercise): Promise<NCResponse<TopicInformation>> {
    const resp2 = this.getExerciseState(generatedExercise)
    if (resp2.status && resp2.data) {
      if (resp2.data === 'pendingExercise') {
        const topics = JSON.parse(generatedExercise.exerciseDetail || '') as GeneratedTopicExercise[]
        let generatedTopicExercise: Partial<GeneratedTopicExercise> | null = null
        // TODO: Can we use this.getTopicExerciseByState instead?
        let idx
        for (idx = 0; idx < topics.length; idx++) {
          const topic = topics[idx]
          if (!topic.submitted && topic.createdAt === undefined) {
            generatedTopicExercise = topics[idx]
            break
          }
        }
        // const generatedTopicExercise = topics.find(topic => !topic.submitted && topic.createdAt === undefined)
        if (generatedTopicExercise !== null) {
          try {
            const generatedExercises = JSON.parse(generatedTopicExercise.exerciseDetail || '') as GeneratedExercise[]
            const { questionQuantity, idealTime } = generatedExercises.reduce(({ questionQuantity, idealTime }, genExercise) => {
              return {
                questionQuantity: questionQuantity + JSON.parse(genExercise.knowns).length,
                idealTime: idealTime + genExercise.idealTime
              }
            }, { questionQuantity: 0, idealTime: 0 })
            // const questionQuantity = generatedExercises.length
            return CourseService.getTopic(generatedTopicExercise.topicId).then(resp => {
              if (resp.status && resp.data) {
                return {
                  status: true,
                  data: {
                    topicName: resp.data.topic,
                    topicNo: idx + 1,
                    topicQuantity: topics.length,
                    questionQuantity,
                    idealTime
                  }
                } as NCResponse<TopicInformation>
              } else {
                return { status: false, errMessage: `Failed to retrieve topic: ${resp.errMessage}` }
              }
            })
          } catch (err) {
            return Promise.reject(err)
          }
        } else {
          return Promise.resolve({ status: false, errMessage: `Couldn't retrieve pending generatedTopicExercise!` })
        }

      } else {
        return Promise.resolve({ status: false, errMessage: `Only information about 'pendingExercise' can be retrieved!` })
      }
    } else {
      return Promise.resolve({ status: false, errMessage: `Failed to get exercise state: ${resp2.errMessage}` })
    }
  }

  // Given an exercise with 'pendingExercise' state, turn it to 'exercising' and return
  // formatted exercise
  startExercise (generatedExercise: GeneratedCompetencyExercise): Promise<NCResponse<FormattedTopicExercise>> {
    const resp2 = this.getExerciseState(generatedExercise)
    if (resp2.status && resp2.data) {
      if (resp2.data === 'pendingExercise') {
        // Update status from 'pendingExercise' to 'exercising'
        // This is essentially done by adding 'createdAt' into the first unsubmitted GeneratedTopicExercise
        // Existence of 'createdAt' field identifies that user is currently exercising on that topic
        const generatedTopicExercises: Partial<GeneratedTopicExercise>[] = JSON.parse(generatedExercise.exerciseDetail)
        const exerciseIndex = generatedTopicExercises.findIndex(generatedTopicExercise => {
          // console.dir(generatedTopicExercise)
          return !generatedTopicExercise.submitted && !('createdAt' in generatedTopicExercise)
        })
        if (exerciseIndex !== -1) {
          generatedTopicExercises[exerciseIndex].createdAt = moment().local().format('YYYY-MM-DD HH:mm:ss')
          console.dir('Updateing generatedTopicExercises to be: ' + JSON.stringify(generatedTopicExercises, null, 2))
          return super.update<GeneratedCompetencyExercise>({
            modelName: 'GeneratedCompetencyExercise',
            data: { id: generatedExercise.id, exerciseDetail: JSON.stringify(generatedTopicExercises) }
          }).then(resp => {
            if (resp.status) {
              // We can just pass generatedExercise with exerciseDetail updated manually, but
              // we wanna make that the update really went through, so we re-read it.
              return this.getGeneratedExercise(generatedExercise.id).then(resp => {
                if (resp.status && resp.data) {
                  return this.continueExercise(resp.data)
                } else {
                  return { status: false, errMessage: 'Failed to get generatedExercise!' }
                }
              })
            } else {
              return { status: false, errMessage: 'Failed to update generatedCompetencyExercise!' }
            }
          })
        } else {
          return Promise.resolve({ status: false, errMessage: 'There is no topic exercise to start!' })
        }
      } else {
        return Promise.resolve({ status: false, errMessage: `Only 'pendingExercise' can be started!` })
      }
    } else {
      return Promise.resolve({ status: false, errMessage: `Failed to get exercise state: ${resp2.errMessage}` })
    }
  }

  // Given an exercise with 'exercising' state, return formatted version of it
  continueExercise (generatedExercise: GeneratedCompetencyExercise): Promise<NCResponse<FormattedTopicExercise>> {
    const resp2 = this.getExerciseState(generatedExercise)
    if (resp2.status && resp2.data) {
      if (resp2.data === 'exercising') {
        return this.formatExercise(generatedExercise)
      } else {
        return Promise.resolve({ status: false, errMessage: `Only 'exercising' can be continued! Exercise state=${resp2.data}` })
      }
    } else {
      return Promise.resolve({ status: false, errMessage: `Failed to get exercise state: ${resp2.errMessage}` })
    }
  }

  // Given an exercise with 'finished' state, submit it
  submitExercise (competencyExerciseId: number, { name, phone, email }): Promise<NCResponse<number>> {
    return this.getGeneratedExercise(competencyExerciseId).then(resp => {
      if (resp.status && resp.data) {
        const generatedExercise = resp.data
        const resp2 = this.getExerciseState(generatedExercise)
        if (resp2.status && resp2.data) {
          if (resp2.data === 'finished') {
            const topics = JSON.parse(generatedExercise.exerciseDetail) as Partial<GeneratedTopicExercise>[]
            const score = topics.reduce((acc, topic) => acc + (topic.score || 0), 0) / topics.length
            return super.update<GeneratedCompetencyExercise>({
              modelName: 'GeneratedCompetencyExercise',
              data: { id: generatedExercise.id, score, submitted: true, name, phone, email }
            })
          } else {
            return Promise.resolve({ status: false, errMessage: `Unexpected exercise state: 'resp2.data'` })
          }
        } else {
          return Promise.resolve({ status: false, errMessage: 'Failed to get exercise state: ' + resp2.errMessage })
        }
      } else {
        return { status: false, errMessage: `Failed to getGeneratedExercise: ${competencyExerciseId}` }
      }
    })
  }

  // Given an exercise with 'finished' state, abandon it
  abandonExercise (generatedExercise: GeneratedCompetencyExercise, userId?: number): Promise<NCResponse<number>> {
    const resp2 = this.getExerciseState(generatedExercise)
    if (resp2.status && resp2.data) {
      if (resp2.data !== 'finished') {
        return super.update<GeneratedCompetencyExercise>({
          modelName: 'GeneratedCompetencyExercise',
          data: {
            id: generatedExercise.id,
            abandoned: true,
            submitted: false,
            userId
          }
        })
      } else {
        return Promise.resolve({ status: false, errMessage: `'finished' exercise can't be abandoned!` })
      }
    } else {
      return Promise.resolve({ status: false, errMessage: `Failed to get exercise state: ${resp2.errMessage}` })
    }
  }

  skipTopic (generatedExercise: GeneratedCompetencyExercise): Promise<NCResponse<number>> {
    const resp2 = this.getExerciseState(generatedExercise)
    if (resp2.status && resp2.data) {
      if (resp2.data === 'pendingExercise') {
        const topics = JSON.parse(generatedExercise.exerciseDetail) as Partial<GeneratedTopicExercise>[]
        const resp3 = this.getTopicExerciseByState('pendingExercise', topics)
        if (resp3.status && resp3.data) {
          const pendingGeneratedExercise = resp3.data
          pendingGeneratedExercise.submitted = true
          return super.update<GeneratedCompetencyExercise>({
            modelName: 'GeneratedCompetencyExercise',
            data: {
              id: generatedExercise.id,
              exerciseDetail: JSON.stringify(topics)
            }
          })
          // console.dir(topics)
          // return Promise.resolve({ status: true, data: 1 }) as Promise<NCResponse<number>>
        } else {
          return Promise.resolve({ status: false, errMessage: `Failed to get pending exercise: ${resp3.errMessage}` })
        }
      } else {
        return Promise.resolve({ status: false, errMessage: `Only exercie with 'pendingExercise' state can be skipped!` })
      }
    } else {
      return Promise.resolve({ status: false, errMessage: `Failed to get exercise state: ${resp2.errMessage}` })
    }
  }

  // For CompetencyExercise, formatting is done per topic, the first that hasn't been submitted
  // We're not rendering everything one-shot like TopicExercise or Exercise
  private formatExercise (generatedCompetencyExercise: GeneratedCompetencyExercise): Promise<NCResponse<FormattedTopicExercise>> {
    const generatedTopicExercises = JSON.parse(generatedCompetencyExercise.exerciseDetail) as Partial<GeneratedTopicExercise>[]
    const resp = this.getTopicExerciseByState('exercising', generatedTopicExercises)
    if (resp.status && resp.data) {
      const generatedTopicExercise = resp.data
      return TopicExerciseService.formatExercise(generatedTopicExercise).then(resp => {
        if (resp.status && resp.data) {
          return resp
        } else {
          return { status: false, errMessage: `Failed to format generatedTopicExercise: ${resp.errMessage}` }
        }
      })
    } else {
      return Promise.resolve({ status: false, errMessage: `Unable to find topic exercise with 'exercising' state!` })
    }
  }

  /*
    1. Check that it's not abandoned or already submitted
    2. Find the first unsubmitted topic
    3. Answers are assumed to be for (2)
   */
  submitTopicAnswer (generatedCompetencyExercise: GeneratedCompetencyExercise, answers: CompetencyExerciseAnswer[]) {
    throw new Error('Not implemented yet!')
  }

  // Get all exercises, hash each of them independently,
  // combined them altogether, and hash the final result
  // TODO: Modify quantity of question generated per exercise to use new variable
  private getExerciseHash (): Promise<NCResponse<string>> {
    return CourseService.getOrderedTopics().then(resp => {
      if (resp.status && resp.data) {
        const topics = resp.data
        return Promise.map(topics, topic => {
          return TopicExerciseService.getExercisesHash(topic.id).then(resp => {
            if (resp.status && resp.data) {
              return resp.data
            } else {
              throw new Error(`Failed to get hash for topic with id=${topic.id}: ${resp.errMessage}`)
            }
          })
        }).then(hashes => {
          return {
            status: true,
            data: this.getHashFromTopicHashes(hashes)
          } as NCResponse<string>
        })
      } else {
        return { status: false, errMessage: `Failed to retrieved topics: ${resp.errMessage}` }
      }
    })
  }

  private getHashFromTopicHashes (topicExerciseHashes: string[]) {
    // Each of the topic exercise hash appended
    const allHashes = topicExerciseHashes.reduce((acc, hash) => acc + hash, '')
    return ExerciseGenerator.getHash(allHashes)
  }

  generateAndSaveExercise (userId?: number): Promise<NCResponse<GeneratedCompetencyExercise>> {
    return this.generateExercise().then(resp => {
      if (resp.status && resp.data) {
        const generatedExercise = resp.data
        return this.create<GeneratedCompetencyExercise>({
          modelName: 'GeneratedCompetencyExercise',
          data: {
            submitted: false,
            abandoned: false,
            hash: generatedExercise.hash,
            onCloud: AppConfig.CLOUD_SERVER,
            exerciseDetail: generatedExercise.exerciseDetail,
            userId
          }
        })
      } else {
        return { status: false, errMessage: `Failed to generate exercise: ${resp.errMessage}` }
      }
    })
  }

  generateExercise (): Promise<NCResponse<Partial<GeneratedCompetencyExercise>>> {
    return CourseService.getOrderedTopics().then(resp => {
      if (resp.status && resp.data) {
        const topics = resp.data
        return Promise.map(topics, topic => {
          return TopicExerciseService.generateExercise(topic.id, 'competencyQuantity').then(resp => {
            if (resp.data && resp.status) {
              const generatedTopicExercise = resp.data
              return {
                topicId: topic.id,
                topicExerciseHash: generatedTopicExercise.topicExerciseHash,
                idealTime: generatedTopicExercise.idealTime,
                exerciseDetail: generatedTopicExercise.exerciseDetail
              } as Partial<GeneratedTopicExercise>
            } else {
              throw new Error(`Failed to generate exercise for topic: ${topic.id}: ${resp.errMessage}`)
            }
          })
        }).then(results => {
          // We want to skip over topics that don't have exercise
          const filteredResults = results.filter(result => {
            const topicExerciseDetail = JSON.parse(result.exerciseDetail || '')
            return topicExerciseDetail.length > 0
          })
          return {
            status: true,
            data: {
              hash: this.getHashFromTopicHashes(results.map(result => result.topicExerciseHash || '')),
              topics: results,
              exerciseDetail: JSON.stringify(filteredResults)
            }
          } as NCResponse<Partial<GeneratedCompetencyExercise>>
        })
      } else {
        return { status: false, errMessage: `Failed to retrieve topics: ${resp.errMessage}` }
      }
    })
  }

  submitTopicExercise (competencyExerciseId: number, answers: TopicExerciseAnswer) {
    return this.getGeneratedExercise(competencyExerciseId).then(resp => {
      if (resp.status && resp.data) {
        const generatedExercise = resp.data
        const resp2 = this.getExerciseState(generatedExercise)
        if (resp2.status && resp2.data) {
          const state = resp2.data
          console.log('Exercise state=' + state)
          if (state === 'exercising') {
            const topics = JSON.parse(generatedExercise.exerciseDetail)
            const resp3 = this.getTopicExerciseByState('exercising', topics)
            if (resp3.status && resp3.data) {
              const topic = resp3.data
              const generatedTopicExerciseDetail = JSON.parse(topic.exerciseDetail) as Partial<GeneratedExercise>[]
              return TopicExerciseService.gradeExercise(generatedTopicExerciseDetail, answers).then(resp2 => {
                if (resp2.status && resp2.data) {
                  topic.submitted = true
                  topic.submittedAt = moment().local().format('YYYY-MM-DD HH:mm:ss')
                  topic.score = resp2.data.score
                  topic.timeFinish = ExerciseHelper.countTimeFinish(topic.createdAt)
                  topic.exerciseDetail = JSON.stringify(TopicExerciseService.insertAnswers(generatedTopicExerciseDetail, answers))
                  return super.update<GeneratedCompetencyExercise>({
                    modelName: 'GeneratedCompetencyExercise',
                    data: {
                      id: generatedExercise.id,
                      exerciseDetail: JSON.stringify(topics)
                    }
                  })
                } else {
                  return { status: false, errMessage: `Failed to grade exercise: ${resp2.errMessage}` }
                }
              })
            } else {
              return { status: false, errMessage: `Failed to get 'exercising' exercise: ${resp3.errMessage}` }
            }
          } else {
            return { status: false, errMessage: `Expecting 'exercising' state, but get '${state}' instead!` }
          }
        } else {
          return { status: false, errMessage: `Failed to getExerciseState: ${resp2.errMessage}` }
        }
      } else {
        return { status: false, errMessage: `Failed to getGeneratedExercise: ${resp.errMessage}` }
      }
    })
  }
}

export default new CompetencyExerciseService()
