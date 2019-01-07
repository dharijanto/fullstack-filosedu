import * as Promise from 'bluebird'
import * as path from 'path'

import CRUDService from './crud-service-neo'

const Formatter = require(path.join(__dirname, '../lib/utils/formatter'))
let log = require('npmlog')
let Sequelize = require('sequelize')

/* let CRUDService = require(path.join(__dirname, 'crud-service')) */

const TAG = 'CourseService'

export interface TopicDetails {
  topics: {
    topicId: number
    topicNo: number
    topic: Partial<Topic>
    starBadge: number
    timeBadge: number
    subtopics: {
      subtopicId: number
      subtopicNo: number
      subtopic: Partial<Subtopic>
      starBadge: number
      timeBadge: number
      watchBadge: boolean
    }[]
  }[]
}

class CourseService extends CRUDService {
  // Detailed information about Topics -> Subtopics
  // Including badges acquired for each of them
  // TODO: Perhaps we should push some of the query into separate views?
  getTopicDetails (userId = -1): Promise<NCResponse<TopicDetails>> {
    return super.rawReadQuery(
`
SELECT
  topics.id AS \`topics.id\`, topics.topicNo AS \`topics.topicNo\`, topics.topic AS \`topics.topic\`,
  IFNULL(starBadge.\`count\`, 0) AS \`topics.starBadge\`,
  IFNULL(timeBadge.\`count\`, 0) AS \`topics.timeBadge\`,
  subtopicsView.id AS \`topics.subtopics.id\`, subtopicsView.subtopicNo AS \`topics.subtopics.subtopicNo\`,
  subtopicsView.subtopic AS \`topics.subtopics.subtopic\`,
  IFNULL(subtopicsView.starBadge, 0) AS \`topics.subtopics.starBadge\`,
  IFNULL(subtopicsView.timeBadge, 0) AS \`topics.subtopics.timeBadge\`,
  IFNULL(subtopicsView.watchBadge, 0) AS \`topics.subtopics.watchBadge\`
FROM topics
LEFT OUTER JOIN (
  SELECT COUNT(*) AS count, topicId
  FROM generatedTopicExercises
  WHERE userId = ${userId} AND submitted = 1 AND score >= 80
  GROUP BY topicId
) AS starBadge ON starBadge.topicId = topics.id
LEFT OUTER JOIN (
  SELECT COUNT(*) AS count, topicId
  FROM generatedTopicExercises
  WHERE submitted = 1 AND userId = ${userId} AND timeFinish < idealTime AND score = 100
  GROUP BY topicId
) AS timeBadge ON timeBadge.topicId = topics.id
INNER JOIN (
  SELECT
    subtopics.id AS id, subtopics.topicId AS topicId, subtopics.subtopic AS subtopic, subtopics.subtopicNo AS subtopicNo,
    (starBadge.\`count\` / exercisesView.count) AS starBadge,
    (timeBadge.\`count\` / exercisesView.count) AS timeBadge,
    watchBadge.\`count\` AS watchBadge
  FROM subtopics
  LEFT OUTER JOIN (
    SELECT
      exercises.subtopicId AS subtopicId,
      COUNT(*) AS count,
      COUNT(distinct exercises.id) AS test
    FROM generatedExercises
    INNER JOIN exercises ON exercises.id = generatedExercises.exerciseId
        AND generatedExercises.submitted = 1 AND generatedExercises.score >= 80
        AND generatedExercises.userId = ${userId}
    GROUP BY exercises.subtopicId, generatedExercises.userId
  ) AS starBadge ON starBadge.subtopicId = subtopics.id
  LEFT OUTER JOIN (
    SELECT
      exercises.subtopicId AS subtopicId,
      COUNT(*) AS count
    FROM generatedExercises
    INNER JOIN exercises ON exercises.id = generatedExercises.exerciseId
        AND generatedExercises.submitted = 1 AND generatedExercises.score = 100 AND timeFinish < idealTime
        AND generatedExercises.userId = ${userId}
    GROUP BY exercises.subtopicId, generatedExercises.userId
  ) AS timeBadge ON timeBadge.subtopicId = subtopics.id
  LEFT OUTER JOIN (
    SELECT videos.subtopicId AS subtopicId, 1 AS count
    FROM videos
    INNER JOIN watchedVideos on watchedVideos.videoId = videos.id AND watchedVideos.userId = ${userId}
    LIMIT 1
  ) AS watchBadge ON watchBadge.subtopicId = subtopics.id
  LEFT OUTER JOIN (
    SELECT subtopicId, COUNT(id) AS count
    FROM exercises
    GROUP BY subtopicId
  ) AS exercisesView ON exercisesView.subtopicId = subtopics.id
) AS subtopicsView ON subtopicsView.topicId = topics.id
ORDER BY topicNo, subtopicNo ASC
`
    ).then(resp => {
      if (resp.status) {
        return { status: true, data: Formatter.objectify(resp.data)[0] }
      } else {
        return { status: false, errMessage: resp.errMessage }
      }
    })
  }

  getAllTopics () {
    return this.getModels('Topic').findAll({ order: [['topicNo', 'ASC']] }).then(resp => {
      return { status: true, data: resp }
    })
  }

  getAllSubtopics () {
    return this.getModels('Subtopic').findAll({ order: [['subtopicNo', 'ASC']] }).then(resp => {
      return { status: true, data: resp }
    })
  }

  getTopicDependencies (topicId) {
    return this.getSequelize().query(
      `SELECT topicDependencies.id, topicDependencies.description, topicDependencies.updatedAt, topics.topic as dependencyName FROM topicDependencies INNER JOIN topics ON topics.id = topicDependencies.dependencyId WHERE topicDependencies.topicId=${topicId}`,
      { type: Sequelize.QueryTypes.SELECT })
      .then(data => {
        return { status: true, data }
      })
  }

  addTopicDependency (topicId, dependencyName, description) {
    return this.read<Topic>({ modelName: 'Topic', searchClause: { topic: dependencyName } }).then(resp => {
      if (resp.status && resp.data) {
        const dependencyTopic = resp.data[0]
        if (dependencyTopic.id === parseInt(topicId, 10)) {
          return { status: false, errMessage: 'A topic could not depend on itself!' }
        } else {
          return this.create<TopicDependency>({ modelName: 'TopicDependency', data: { topicId, dependencyId: dependencyTopic.id, description } })
        }
      } else {
        return { status: false, errMessage: `Could not find topic with name "${dependencyName}"` }
      }
    })
  }

  getSubtopicByTopicId (topicId) {
    return this.getModels('Subtopic').findAll({ where: { topicId }, order: [['subtopicNo', 'ASC']] }).then(data => {
      return { status: true, data }
    })
  }

  getExerciseBySubtopicId (subtopicId) {
    return this.getModels('Exercise').findAll({ where: { subtopicId }, order: [['id', 'ASC']] }).then(data => {
      return { status: true, data }
    })
  }

  getSubtopic (subtopicId): Promise<NCResponse<Subtopic>> {
    return this.readOne<Subtopic>({
      modelName: 'Subtopic',
      searchClause: { id: subtopicId },
      include: [{ model: this.getModels('Topic') }]
    })
  }

  getTopic (topicId) {
    return this.readOne<Topic>({ modelName: 'Topic', searchClause: { id: topicId } })
  }

  getExercises (subtopicId) {
    return this.read<Exercise>({ modelName: 'Exercise', searchClause: { subtopicId }, order: [['id', 'ASC']] })
  }

  getPreviousAndNextExercise (subtopicId, exerciseId): Promise<NCResponse<{ next?: Exercise, prev?: Exercise}>> {
    return Promise.join(
      this.readOne({
        modelName: 'Exercise',
        searchClause: {
          [Sequelize.Op.and]: {
            id: {
              [Sequelize.Op.lt]: exerciseId
            },
            subtopicId
          }
        },
        order: [['id', 'DESC']],
        include: [{
          model: this.getModels('Subtopic'),
          include: [
            {
              model: this.getModels('Topic')
            }
          ]
        }]
      }),
      this.readOne({
        modelName: 'Exercise',
        searchClause: {
          [Sequelize.Op.and]: {
            id: {
              [Sequelize.Op.gt]: exerciseId
            },
            subtopicId
          }
        },
        order: [['id', 'ASC']],
        include: [{
          model: this.getModels('Subtopic'),
          include: [{ model: this.getModels('Topic') }]
        }]
      })).spread((resp1: NCResponse<Exercise>, resp2: NCResponse<Exercise>) => {
        return {
          status: true,
          data: {
            prev: resp1.data,
            next: resp2.data
          }
        }
      })
  }

  getPreviousAndNextSubtopic (subtopicId): Promise<NCResponse<{ next?: Subtopic, prev?: Subtopic}>> {
    return this.getSubtopic(subtopicId).then(resp => {
      if (resp.status && resp.data) {
        const subtopicNo = resp.data.subtopicNo
        return Promise.join(
          this.readOne<Subtopic>({
            modelName: 'Subtopic',
            searchClause: { subtopicNo: { [Sequelize.Op.lt]: subtopicNo } },
            include: [{ model: this.getModels('Topic') }],
            order: [['subtopicNo', 'DESC']],
            limit: 1}),
          this.readOne<Subtopic>({
            modelName: 'Subtopic',
            searchClause: { subtopicNo: { [Sequelize.Op.gt]: subtopicNo } },
            include: [{ model: this.getModels('Topic') }],
            order: [['subtopicNo', 'ASC']],
            limit: 1})
        ).spread((resp2: NCResponse<Subtopic>, resp3: NCResponse<Subtopic>) => {
          return { status: true, data: { prev: resp2.data, next: resp3.data } } as NCResponse<any>
        })
      } else {
        return { status: false, errMessage: resp.errMessage }
      }
    })
  }

  // Although there one subtopic can have multiple videos (record of past uploads),
  // we care only if at least one had been watched
  // return: { status: true, data: { watched: true }}
  isSubtopicVideoWatched (subtopicId, userId) {
    return this.getSequelize().query(
`
  SELECT subtopics.id AS subtopicId, true AS watched
   FROM subtopics
   INNER JOIN videos ON videos.subtopicId = subtopics.id
   INNER JOIN watchedVideos on watchedVideos.videoId = videos.id
   WHERE subtopics.id = ${subtopicId} AND watchedVideos.userId = ${userId}
   LIMIT 1;
`, { type: this.getSequelize().QueryTypes.SELECT }).then(data => {
  let watched = false
  if (data.length > 0) {
    watched = true
  }
  return { status: true, data: { watched } }
})
  }
}

export default new CourseService()
