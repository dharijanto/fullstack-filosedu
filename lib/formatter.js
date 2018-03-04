class Formatter {
  static validateEmail (email) {
    var re = /\S+@\S+\.\S+/
    return re.test(email)
  }
}

module.exports = Formatter
