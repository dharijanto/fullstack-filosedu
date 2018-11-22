const getSlug = require('speakingurl')

class Formatter {
  static getYoutubeEmbedURL (url) {
    var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
    var match = url.match(regExp)
    if (match && match[2].length === 11) {
      return match[2]
    } else {
      return 'error'
    }
  }

  /*
	exercise: {
    data: [stringified json]
    subtopic: {
      id: [number]
      subtopic: [string]
      ...
      topic: {
        id: [number]
        topic: [string]
        ...
      }
    }
	}
  */
  // TODO: Refactor subtopic.pug to use this
  static getExerciseURL (exercise) {
    return `/${exercise.subtopic.topic.id}/${getSlug(exercise.subtopic.topic.topic)}/${exercise.subtopic.id}/${getSlug(exercise.subtopic.subtopic)}/${exercise.id}/latihan`
  }

  // TODO: Refactor topics.pug to use this
  static getSubtopicURL (subtopic) {
    return `/${subtopic.topic.id}/${getSlug(subtopic.topic.topic)}/${subtopic.id}/${getSlug(subtopic.subtopic)}`
  }
}

module.exports = Formatter
