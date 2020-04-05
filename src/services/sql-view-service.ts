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
  public views: string[] = []

  // Gives user-personalized information regarding a subtopic, which
  // includes stars, badges, etc.
  subtopicsView () {
    return super.getSequelize().query(`
      CREATE VIEW subtopicsView AS
      (SELECT
          subtopics.id AS id,
          users.id AS userId,
          subtopics.topicId AS topicId,
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

  topicsView () {
    return super.getSequelize().query(`
      CREATE VIEW topicsView AS
      (SELECT users.id AS userId, topics.id AS id,
              topics.topic AS topicName,
              topics.topicNo AS topicNo,
              subtopicsView.count AS subtopicCount,
              IFNULL(checkmarkBadges.count, 0) AS checkmarkBadges,
              IFNULL(starBadges.count, 0) AS starBadges,
              subtopicsView.starBadges AS subtopicsStarBadges,
              subtopicsView.timeBadges AS subtopicsTimeBadges,
              assignedTasksView.assignmentColor AS assignmentColor
              #(SELECT starsCompleted FROM assignedTasks WHERE topicId = topics.id AND userId = users.id) AS starsCompleted
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
        LEFT OUTER JOIN (
          SELECT IF(starsCompleted != 'no', 'yes', 'no') AS starsCompleted,
                 IF(timersCompleted != 'no', 'yes', 'no') AS timersCompleted,
                 IF(timersCompleted != 'no', 'green', IF(starsCompleted != 'no', 'orange', 'red')) AS assignmentColor,
                 topicId,
                 userId
          FROM assignedTasks
        ) AS assignedTasksView ON assignedTasksView.userId = users.id AND assignedTasksView.topicId = topics.id
        # GROUP BY topics.id, users.id
        ORDER BY topicNo ASC
      )
    `)
  }

  subtopicVideosView () {
    return super.getSequelize().query(`
      CREATE VIEW subtopicVideosView AS
      (SELECT
          videos.id AS id, videos.filename AS filename,
          videos.sourceLink AS sourceLink, videos.createdAt AS createdAt,
          videos.updatedAt AS updatedAt, videos.subtopicId AS subtopicId
        FROM videos
        INNER JOIN (SELECT MAX(id) AS id FROM videos GROUP BY subtopicId) AS latestVideos ON latestVideos.id = videos.id
        INNER JOIN subtopics ON subtopics.id = videos.subtopicId
        GROUP BY videos.subtopicId
      )
    `)
  }

  assignmentSummaryView () {
    return super.getSequelize().query(`
      CREATE VIEW assignmentSummaryView AS
      (SELECT users.id AS id, users.fullName AS name,
              users.grade AS grade, SUM(IFNULL(assignedTasks.points, 0)) AS points,
              schools.id AS schoolId,
              SUM(IF(assignedTasks.starsCompleted = "no", 1, 0)) AS numOutstandingAssignments,
              SUM(IF(assignedTasks.starsCompleted != "no", 1, 0)) AS numFinishedAssignments
      FROM users
      INNER JOIN schools ON schools.id = users.schoolId
      LEFT OUTER JOIN assignedTasks ON assignedTasks.userId = users.id
      GROUP BY id, name, grade
      )
    `)
  }

  assignmentsView () {
    return super.getSequelize().query(`
      CREATE VIEW assignmentsView AS
      (SELECT assignedTasks.id AS id,
        assignedTasks.due AS due,
        assignedTasks.starsCompleted AS starsCompleted,
        assignedTasks.timersCompleted AS timersCompleted,
        assignedTasks.points AS points,
        assignedTasks.onCloud AS onCloud,
        assignedTasks.createdAt AS createdAt,
        assignedTasks.updatedAt AS updatedAt,
        assignedTasks.userId AS userId,
        schools.id AS schoolId,
        topics.\`id\` AS \`topic.id\`,
        topics.\`topic\` AS \`topic.name\`,
        subtopics.\`id\` AS \`subtopic.id\`,
        subtopics.\`subtopic\` AS \`subtopic.name\`,
        IFNULL(subtopics.\`subtopic\`, topics.\`topic\`) AS assignment,
        IF(subtopics.\`subtopic\` IS NOT NULL, 'Subtopic', IF(topics.\`topic\` IS NOT NULL, 'Topic', 'Error')) AS type
      FROM assignedTasks
      INNER JOIN users ON users.id = assignedTasks.userId
      INNER JOIN schools ON schools.id = users.schoolId
      LEFT OUTER JOIN topics ON topics.id = assignedTasks.topicId
      LEFT OUTER JOIN subtopics ON subtopics.id = assignedTasks.subtopicId
      )
    `)
  }

  constructor () {
    super()
    this.views = ['subtopicsView', 'topicsView', 'subtopicVideosView', 'assignmentSummaryView', 'assignmentsView']
  }

  // TODO: Order of deletion shouldn't need to be hard-coded like this.
  //       they should be inferred from populateViews
  destroyViews () {
    log.info(TAG, 'destroyViews()')
    // Since a view might depend on the other view, we have to destroy in the reversed order
    // to honor dependencies
    return this.views.reverse().reduce((acc, view) => {
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
    const promises: Array<() => Promise<any>> = this.views.map(view => {
      return this[view]
    })

    return this.destroyViews().then(() => {
      return promises.reduce((acc, promise) => {
        return acc.then(() => {
          return promise()
        })
      }, Promise.resolve())
    }).catch(err => {
      return { status: false, errMessage: err.message }
    })
  }
}

export default new SQLViewService()
