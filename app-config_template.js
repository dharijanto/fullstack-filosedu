const MYSQL_CONF = {
  username: 'root',
  password: '',
  dbName: 'filosedu_test'
}

module.exports = {
  testDbPath: `mysql://${MYSQL_CONF.username}:${MYSQL_CONF.password}@localhost:3306/${MYSQL_CONF.dbName}`
}
