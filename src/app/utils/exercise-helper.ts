export default class ExerciseHelper {
  static countTimeFinish (dateCreatedAt) {
    const timeStart = new Date(dateCreatedAt).getTime()
    const timeSubmit = Date.now()
    const timeFinish = ((timeSubmit - timeStart) / 1000).toFixed(2)
    return timeFinish
  }
}
