const logLevelOrders = ['debug', 'verbose', 'info', 'error']

var logLevel = 'debug'
var log = {}

function doLog (level, tag, message) {
  const settingLevel = logLevelOrders.indexOf(logLevel)
  const currentLevel = logLevelOrders.indexOf(level)
  // console.log('doLog(): currentLevel=' + currentLevel + ' settingLevel=' + settingLevel)
  if (currentLevel >= settingLevel) {
    // In some older browsers, console.log has to be called within the context of console.
    // Without binding to console, it's called with global context
    const logger = (level === 'error' ? console.error.bind(console) : console.log.bind(console))
    logger(`[${tag}] ${message}`)
  }
}

log.debug = (tag, message) => {
  doLog('debug', tag, message)
}

log.verbose = (tag, message) => {
  doLog('verbose', tag, message)
}

log.info = (tag, message) => {
  doLog('info', tag, message)
}

log.error = (tag, message) => {
  doLog('error', tag, message)
}

log.setLogLevel = level => {
  logLevel = level
}

module.exports = log
