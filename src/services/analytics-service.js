const path = require('path')

const Promise = require('bluebird')
const log = require('npmlog')

const AppConfig = require(path.join(__dirname, '../app-config'))
const CRUDService = require(path.join(__dirname, 'crud-service'))

const TAG = 'AnalyticsService'

/*
  Important Note:
    analytics has 'onCloud' column
    which indicate that the data is already on the cloud and we don't need to
    send them again when syncing.

    Remember to set the value properly!
*/
class AnalyticsService extends CRUDService {
  /*
    type: 'feedback':
      Smiley face at the end of video
      Value: -1 -> Dislike, 1 -> Like
      Aggregate the review by summing them

    type: 'view':
      video.one('play')
      When page is loaded, first press to play button is considered 'view'
      Value: 1

    type: 'viewDuration':
      start: video.on('play')
      stop: video.on('pause') or browser closed
      Value: [seconds]

    type: 'skip':
      New view is a new entry in the table so we can see a student's trend
      Student doesn't play the video, but immediately goes to exercise page
      video.one('play') doesn't trigger, exercise button is pressed
      Value: 1
  */
  addVideoData (key, value, videoId, userId = null) {
    return new Promise((resolve, reject) => {
      if (key !== 'feedback' && key !== 'view' && key !== 'skip' && key !== 'viewDuration') {
        resolve({status: false, errMessage: 'Invalid analytics key!'})
      } else {
        this.create({
          modelName: 'Analytics',
          data: {
            key,
            value,
            type: 'video',
            userId,
            videoId,
            onCloud: AppConfig.CLOUD_SERVER
          }
        }).then(resp => {
          resolve(resp)
        }).catch(err => {
          reject(err)
        })
      }
    })
  }

  addExerciseSubmissionStats (scorePercentage, attemptsPercentage, exerciseId, userId) {
    // test
    log.verbose(TAG, `addExerciseSubmissionStats(): scorePercentage=${scorePercentage} attemptsPercentage=${attemptsPercentage} exerciseId=${exerciseId} userId=${userId}`)
    return Promise.join(
      this.addExerciseData('correctAnswers', scorePercentage, exerciseId, userId),
      this.addExerciseData('attemptedAnswers', attemptsPercentage, exerciseId, userId)
    ).spread((resp, resp2) => {
      if (resp.status && resp2.status) {
        return { status: true }
      } else {
        return { stauts: false, errMessage: resp.errMessage || resp2.errMessage}
      }
    })
  }

  /*
    type: 'backToVideo':
      User goes back to Timevideo from exercise, by clicking 'Back to Video'
      Value: 1

    type: 'questionTime':
      Time spend between questions
      Value: time in second

    type: 'setTime':
      Time spend between a set
      Value: time in second

    type: 'correctAnswers':
      Correct answer in a set submission
      Value: percentage over all questions

    type: 'attemptedAnswers':
      Non-empty answers in a set submission
      Value: percentage over all questions

  */
  addExerciseData (key, value, exerciseId, userId = null) {
    return new Promise((resolve, reject) => {
      if (key !== 'backToVideo' && key !== 'questionTime' &&
          key !== 'setTime' && key !== 'correctAnswers' && key !== 'attemptedAnswers') {
        resolve({status: false, errMessage: 'Invalid analytics key!'})
      } else {
        this.create({
          modelName: 'Analytics',
          data: {
            key,
            value,
            type: 'exercise',
            userId,
            exerciseId,
            onCloud: AppConfig.CLOUD_SERVER
          }
        }).then(resp => {
          resolve(resp)
        }).catch(err => {
          reject(err)
        })
      }
    })
  }
}

module.exports = AnalyticsService
