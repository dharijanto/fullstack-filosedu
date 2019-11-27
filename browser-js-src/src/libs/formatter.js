class Formatter {
  // Convert Youtube URL into id that can be embedded in an iframe
  static getYoutubeEmbedURL (url) {
    var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
    var match = url.match(regExp)
    if (match && match[2].length === 11) {
      return match[2]
    } else {
      return null
    }
  }

  // Convert seconds to "timer" format
  // 120 -> 2:00
  static secsToTimerFormat (seconds) {
    seconds = parseInt(seconds)
    const secs = parseInt(seconds % 60, 10) + ''
    const mins = parseInt(seconds / 60, 10) + ''

    return `${mins}:${secs.length > 1 ? secs : '0' + secs}`
  }
}

module.exports = Formatter
