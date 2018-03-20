var axios = require('axios')
var Config = require('../config.js')
module.exports = axios.create({
  timeout: Config.NETWORK_TIMEOUT
})
