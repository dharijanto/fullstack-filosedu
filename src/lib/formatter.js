class Formatter {
  static validateEmail (email) {
    var re = /(\S+@\S+\.\S+)|(^$)/
    return re.test(email)
  }

  static validateUsername (username) {
    var re = /^[a-zA-Z]+[0-9a-zA-Z]{4,15}$/
    return re.test(username)
  }
}

module.exports = Formatter
