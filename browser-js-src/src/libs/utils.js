var Promise = require('bluebird')

class Utils {
  // Usage: await sleep(500)
  // i.e. used to simulate network delay
  static sleep (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Take the result of form.serializeArray() and convert it to JSON object
  static objectifyForm (formArray) {
    var returnArray = {}
    for (var i = 0; i < formArray.length; i++) {
      returnArray[formArray[i]['name']] = formArray[i]['value']
    }
    return returnArray
  }

  static validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  }
}

module.exports = Utils
