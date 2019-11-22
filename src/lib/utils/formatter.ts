const getSlug = require('speakingurl')
const flatToTrees = require('flatToTrees')

class Formatter {
  static getYoutubeEmbedURL (url) {
    let regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
    let match = url.match(regExp)
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
    return `/${exercise.subtopic.topic.id}/${getSlug(exercise.subtopic.topic.topic)}/${exercise.subtopic.id}/${getSlug(exercise.subtopic.subtopic)}/${exercise.id}/`
  }

  // TODO: Refactor topics.pug to use this
  static getSubtopicURL (subtopic) {
    return `/${subtopic.topic.id}/${getSlug(subtopic.topic.topic)}/${subtopic.id}/${getSlug(subtopic.subtopic)}`
  }

  // Convert flat SQL array into Object. Delimiter is "."
  // NOTE: flatToTrees always convert sub-child into array, i.e. a.b: 3' into a.b = [3]
  // Due to this, we need to manually parse the array into object
  static objectify (flatArray) {
    const result = flatToTrees(flatArray, {
      removeDuplicateLeaves: true
    })
    return result
  }
}

export = Formatter
