import CRUDService from './crud-service-neo'
import { Model, Instance } from 'sequelize'
import * as Promise from 'bluebird'

import * as AppConfig from '../app-config'

let log = require('npmlog')

const TAG = 'SQLViewService'
/*
  This is used by ShopManagement in the CMS.
  We have LocalShopService, this is specifically for shop-specific code.
*/
class SQLViewService extends CRUDService {
  // Gives user-personalized information regarding a subtopic, which
  // includes stars, badges, etc.
  createSubtopicsView () {
    return super.getSequelize().query(`
      CREATE VIEW subtopicsView AS
      (SELECT
          users.id AS userId,
          subtopics.topicId AS topicId,
          subtopics.id AS subtopicId,
          subtopics.subtopic AS subtopicName,
          subtopics.subtopicNo AS subtopicNo,
          # Need to cap to 4, so that when displayed on topic page, all subtopics have the same weight
          IFNULL(LEAST(4, (timeBadges.count / exercisesCount.count)), 0) AS timeBadges,
          IFNULL(LEAST(4, (starBadges.count / exercisesCount.count)), 0) AS starBadges,
          IF (IFNULL(LEAST(4, (timeBadges.count / exercisesCount.count)), 0) = 4, 1, 0) AS complete,
          exercisesCount.count AS exerciseCount
       FROM subtopics
       CROSS JOIN users
       # Number of star badges in the subtopic
       LEFT OUTER JOIN (
         SELECT
            exercises.subtopicId AS subtopicId,
            generatedExercises.userId AS userId,
            COUNT(*) AS count
         FROM exercises
         INNER JOIN generatedExercises ON
           generatedExercises.exerciseId = exercises.id AND
           generatedExercises.submitted = 1 AND generatedExercises.score >= 80
         GROUP BY exercises.subtopicId, generatedExercises.userId
       ) AS starBadges ON starBadges.subtopicId = subtopics.id AND starBadges.userId = users.id
       # Number of time badges in the subtopics
       LEFT OUTER JOIN (
         SELECT
            exercises.subtopicId AS subtopicId,
            generatedExercises.userId AS userId,
            COUNT(*) AS count
         FROM exercises
         INNER JOIN generatedExercises ON
           generatedExercises.exerciseId = exercises.id AND
           generatedExercises.submitted = 1 AND generatedExercises.score = 100 AND
           generatedExercises.timeFinish < generatedExercises.idealTime
         GROUP BY exercises.subtopicId, generatedExercises.userId
       ) AS timeBadges ON timeBadges.subtopicId = subtopics.id AND timeBadges.userId = users.id
       # Number of exercises in the subtopic, this is then used to calculate the average
       LEFT OUTER JOIN (
        SELECT
            exercises.subtopicId AS subtopicId,
            users.id AS userId,
            COUNT(*) AS count
        FROM exercises
        CROSS JOIN users
        GROUP BY exercises.subtopicId, users.id
       ) AS exercisesCount ON exercisesCount.subtopicId = subtopics.id AND exercisesCount.userId = users.id
       ORDER BY subtopicNo ASC
      )
    `)
  }

  createTopicsView () {
    return super.getSequelize().query(`
      CREATE VIEW topicsView AS
      (SELECT users.id AS userId, topics.id AS id,
              topics.topic AS topicName,
              topics.topicNo AS topicNo,
              subtopicsView.count AS subtopicCount,
              IFNULL(SUM(checkmarkBadges.count), 0) AS checkmarkBadges,
              IFNULL(SUM(starBadges.count), 0) AS starBadges,
              subtopicsView.starBadges AS subtopicsStarBadges,
              subtopicsView.timeBadges AS subtopicsTimeBadges
        FROM topics
        CROSS JOIN users
        # Subtopics information
        LEFT OUTER JOIN (
          SELECT topicId, userId,
                 AVG(starBadges) AS starBadges,
                 AVG(timeBadges) AS timeBadges,
                 COUNT(*) AS count
          FROM subtopicsView
          GROUP BY topicId, userId
        ) AS subtopicsView ON subtopicsView.topicId = topics.id AND subtopicsView.userId = users.id
        # Topic exercise checkmark
        LEFT OUTER JOIN (
          SELECT COUNT(*) AS count, topicId, userId
          FROM generatedTopicExercises
          WHERE submitted = 1 AND timeFinish < idealTime AND score >= 90
          GROUP BY topicId, userId
        ) AS checkmarkBadges ON checkmarkBadges.topicId = topics.id AND checkmarkBadges.userId = users.id
        # Topic exercise star badge
        LEFT OUTER JOIN (
          SELECT COUNT(*) AS count, topicId, userId
          FROM generatedTopicExercises
          WHERE submitted = 1 AND score >= 80
          GROUP BY topicId, userId
        ) AS starBadges ON starBadges.topicId = topics.id AND starBadges.userId = users.id
        GROUP BY topics.id, users.id
        ORDER BY topicNo ASC
      )
    `)
  }

  // TODO: Order of deletion shouldn't need to be hard-coded like this.
  //       they should be inferred from populateViews
  destroyViews () {
    log.info(TAG, 'destroyViews()')
    const views = ['subtopicsView', 'topicsView']

    return views.reduce((acc, view) => {
      return acc.then(() => {
        return
      }).catch(err => {
        log.info(TAG, err)
      }).finally(() => {
        // Even if there's an error (i.e. the view to be dropped doesn't exist, we want
        // to continue
        return super.getSequelize().query(`DROP VIEW ${view};`).catch(() => {
          return
        })
      })
    }, Promise.resolve())
  }

  populateViews () {
    // The views are populated sequentially in the following order
    const promises: Array<() => Promise<any>> = [
      this.createSubtopicsView,
      this.createTopicsView
    ]
    return this.destroyViews().then(result => {
      return promises.reduce((acc, promise) => {
        return acc.then(() => {
          return promise()
        })
      }, Promise.resolve())
    })
  }
}

export default new SQLViewService()
