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
}

module.exports = Formatter
