import * as Promise from 'bluebird'
let marked = require('marked')

export interface GeneratedQuestionData {
  knowns: { [key: string]: any},
  unknowns: { [key: string]: any}
}

export interface BaseQuestionData {
  quantity: number
  idealTimePerQuestion: number
  isAnswerFn: (knowns, unknowns) => boolean
  printFn: (knowns) => string | Promise<string>
}

export type QuantityVariableName = 'quantity' | 'reviewQuantity' | 'competencyQuantity'

export default abstract class ExerciseSolver {
  public static readonly solverName: string
  protected question: BaseQuestionData

  constructor (questionData) {
    this.structuralCheck(questionData)
    this.question = questionData
  }

  // Ensure given question has all the required structure
  abstract structuralCheck (question)

  formatQuestion (knowns): Promise<string> {
    return new Promise((resolve, reject) => {
      const result = this.question.printFn(knowns)
      if (result instanceof Promise) {
        result.then(data => {
          resolve(data)
        }).catch(err => {
          reject(err)
        })
      } else {
        resolve(result)
      }
    }).then(data => {
      return marked(data)
    })
  }

  getIdealTimePerQuestion () {
    return this.question.idealTimePerQuestion || 0
  }

  getExerciseIdealTime () {
    return (this.question.idealTimePerQuestion * this.question.quantity) || 0
  }

  // quantityVariableName: string indicating variable where quantity is stored (i.e. 'quantity', 'reviewQuantity', or 'competencyQuantity')
  abstract generateQuestions (quantityVariableName: QuantityVariableName): GeneratedQuestionData[]

  isAnswer (known, unknown): boolean {
    return this.question.isAnswerFn(known, unknown)
  }
}
