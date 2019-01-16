import * as Promise from 'bluebird'
import BruteforceSolver, { GeneratedQuestionData } from '../lib/exercise_generator/exercise_solvers/bruteforce-solver'
import CRUDService from './crud-service-neo'
import CourseService from './course-service'
import ExerciseGenerator from '../lib/exercise_generator/exercise-generator'
import ExerciseService from './exercise-service'
import TopicExerciseService from './topic-exercise-service'
import * as Utils from '../lib/utils'

let path = require('path')

let log = require('npmlog')
let pug = require('pug')
let moment = require('moment')
let Sequelize = require('sequelize')

const AppConfig = require(path.join(__dirname, '../app-config'))

const TAG = 'TopicExerciseService'

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

interface TopicWithExercises {
  id: number
  topic: string
  subtopics: {
    id: number
    subtopic: string
    exercises: Exercise[]
  }[]
}

interface TopicInformation {
  topicName: string
  topicNo: number
  topicQuantity: number
  questionQuantity: number
  idealTime: number
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

The most unintuitive things are probably exercising and pendingExercise state.
*/
export type ExerciseState = 'submitted' | 'abandoned' | 'finished' | 'exercising' | 'pendingExercise'

class CompetencyExerciseService extends CRUDService {

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

  /*
    NCResponse convention:
    true: the generated exercise is found
    false: the generated exercise is not found or found but with invalid state
   */
  getExerciseState (generatedExercise: GeneratedCompetencyExercise): NCResponse<ExerciseState> {
    let state: ExerciseState
    const topics = JSON.parse(generatedExercise.exerciseDetail || '') as GeneratedTopicExercise[]
    console.log('getExerciseState: topics=')
    console.dir(topics)
    if (generatedExercise.submitted) {
      state = 'submitted'
    } else if (generatedExercise.abandoned) {
      state = 'abandoned'
    } else if (topics.find(topic => !topic.submitted && 'createdAt' in topic)) {
      state = 'exercising'
    } else if (topics.find(topic => !topic.submitted && !('createdAt' in topic))) {
      state = 'pendingExercise'
    } else if (topics.find(topic => !topic.submitted) === undefined) {
      state = 'finished'
    } else {
      return { status: false, errMessage: 'generatedCompetencyExercise has an invalid state!' }
    }
    return { status: true, data: state }
  }

  getGenExerciseWithExercisingState (generatedExercise: GeneratedCompetencyExercise): NCResponse<GeneratedTopicExercise> {
    const topics = JSON.parse(generatedExercise.exerciseDetail || '') as GeneratedTopicExercise[]
    const generatedTopicExercise = topics.find(topic => !topic.submitted && 'createdAt' in topic)
    if (generatedTopicExercise) {
      return { status: true, data: generatedTopicExercise }
    } else {
      return { status: false, errMessage: `Couldn't find generatedTopicExercise!` }
    }
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

  // Given an exercise with state 'pendingExercise', return "break page" associated with it
  getPendingTopicInformation (generatedExercise: GeneratedCompetencyExercise): Promise<NCResponse<TopicInformation>> {
    const resp2 = this.getExerciseState(generatedExercise)
    if (resp2.status && resp2.data) {
      if (resp2.data === 'pendingExercise') {
        const topics = JSON.parse(generatedExercise.exerciseDetail || '') as GeneratedTopicExercise[]
        let generatedTopicExercise: Partial<GeneratedTopicExercise> | null = null
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
          generatedTopicExercises[exerciseIndex].createdAt = moment.utc().format('YYYY-MM-DD HH:mm:ss')
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
  submitExercise (generatedExercise: GeneratedCompetencyExercise, userId?: number): Promise<NCResponse<number>> {
    const resp2 = this.getExerciseState(generatedExercise)
    if (resp2.status && resp2.data) {
      if (resp2.data === 'finished') {
        const generatedTopicExercises: Partial<GeneratedTopicExercise>[] = JSON.parse(generatedExercise.exerciseDetail)
        const score = generatedTopicExercises.reduce((score, generatedTopicExercise) => {
          return score + generatedExercise.score
        }, 0)
        return super.update<GeneratedCompetencyExercise>({
          modelName: 'GeneratedCompetencyExercise',
          data: {
            id: generatedExercise.id,
            submitted: true,
            score,
            userId
          }
        })
      } else {
        return Promise.resolve({ status: false, errMessage: `Only 'finished' exercise can be submitted!` })
      }
    } else {
      return Promise.resolve({ status: false, errMessage: `Failed to get exercise state: ${resp2.errMessage}` })
    }
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

  // For CompetencyExercise, formatting is done per topic, the first that hasn't been submitted
  // We're not rendering everything one-shot like TopicExercise or Exercise
  private formatExercise (generatedCompetencyExercise: GeneratedCompetencyExercise): Promise<NCResponse<FormattedTopicExercise>> {
    const generatedTopicExercises = JSON.parse(generatedCompetencyExercise.exerciseDetail) as Partial<GeneratedTopicExercise>[]
    const generatedTopicExercise = generatedTopicExercises.find(topic => !topic.submitted)
    if (!generatedTopicExercise) {
      return Promise.resolve({ status: false, errMessage: 'Unable to find unsubmitted topic exercise!' })
    } else {
      const topicId = generatedTopicExercise.topicId
      return TopicExerciseService.formatExercise(generatedTopicExercise).then(resp => {
        if (resp.status && resp.data) {
          return resp
        } else {
          return { status: false, errMessage: `Failed to format generatedTopicExercise: ${resp.errMessage}` }
        }
      })
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
          return {
            status: true,
            data: {
              hash: this.getHashFromTopicHashes(results.map(result => result.topicExerciseHash || '')),
              topics: results,
              exerciseDetail: JSON.stringify(results)
            }
          } as NCResponse<Partial<GeneratedCompetencyExercise>>
        })
      } else {
        return { status: false, errMessage: `Failed to retrieve topics: ${resp.errMessage}` }
      }
    })
  }
}

export default new CompetencyExerciseService()
