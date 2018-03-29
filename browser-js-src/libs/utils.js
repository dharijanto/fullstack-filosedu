var Promise = require('bluebird')

class Utils {
  // Usage: await sleep(500)
  // i.e. used to simulate network delay
  static sleep (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

module.exports = Utils
