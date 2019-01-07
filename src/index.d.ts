interface NCResponse<T> {
  status: boolean,
  data?: T,
  errMessage?: string
  errCode?: number
}



/*
-------------------------------------------------------------------------------
Sequelize Model. Should not add anything else other than what could come from:
1. Single table query
2. Join query

For anything else, please define a new interface!
-------------------------------------------------------------------------------
*/
interface BaseModel {
  id: number,
  createdAt: string,
  updatedAt: string,
}

interface Topic extends BaseModel {
  topic: string
  description: string
  topicNo: number
  subjectId: number
}

interface TopicDependency extends BaseModel {
  topicId: number
  dependencyId: number
  description: string
}

interface Subtopic extends BaseModel {
  subtopic: string
  description: string
  data: string
  subtopicNo: number
  topicId: number
  topic?: Topic
}

interface Exercise extends BaseModel {
  data: string
  subtopicId: number
  subtopic?: Subtopic
}

interface GeneratedExercise extends BaseModel {
  exerciseHash: string
  knowns: string // Stringified JSON
  unknowns: string // Stringified JSON
  userAnswer: string // Stringified JSON
  submitted: boolean
  submittedAt: string
  score: number
  timeFinish: number
  idealTime: number
  onCloud: boolean
  exerciseId: number
  userId: number
  exercise?: Exercise
}

interface GeneratedTopicExercise extends BaseModel {
  submitted: boolean
  submittedAt: string
  score: number
  timeFinish: string
  topicExerciseHash: string
  exerciseDetail: string
  idealTime: number
  onCloud: boolean
  topicId: number
  userId: number
  topic?: Topic
}

// END OF RAW Sequelize Model

interface FormattedExercise {
  renderedQuestions: Array<String> // ["\n2 + 3 = ?\n", "\n1 + 2 = ?\n"] -- HTML-rendered question array
  unknowns: Array<Array<string>> // [["x"], ["x"]] -- Variable for inputs
}

interface FormattedSubtopicExercise {
  exerciseId: number
  idealTime: number
  elapsedTime: number
  formattedExercise: FormattedExercise
}

interface FormattedTopicExercise {
  topicName: string
  formattedExercises: Array<FormattedExercise>
  idealTime: number
  elapsedTime: number
}