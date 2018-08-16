const moment = require('moment-timezone')

module.exports = {
  // since: SQL date or Javascript Date
  getElapsedTime: since => {
    return parseInt(moment().diff(since) / 1000)
  }
}