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
}

module.exports = Utils
