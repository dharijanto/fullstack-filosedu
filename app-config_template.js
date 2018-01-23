var path = require('path')

const MYSQL_CONF = {
  username: 'root',
  password: '',
  dbName: 'filosedu_test'
}

module.exports = {
  testDbPath: `mysql://${MYSQL_CONF.username}:${MYSQL_CONF.password}@localhost:3306/${MYSQL_CONF.dbName}`,
  VIDEO_PATH: path.join(__dirname, './videos/'),
  VIDEO_MOUNT_PATH: '/videos/'
}
