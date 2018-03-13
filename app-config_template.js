var path = require('path')
const MYSQL_CONF = {
  username: 'admin',
  password: 'password',
  dbName: 'app_filosedu'
}

const LOGGING_SERVICE = {
  HOST: 'www.didikbangsa.org',
  PORT: 12201,
  LOG_LEVEL: process.env.SERVER_PORT || 'verbose' // Minimum log level to be sent to the service
}

module.exports = {
  testDbPath: `mysql://${MYSQL_CONF.username}:${MYSQL_CONF.password}@127.0.0.1:3306/${MYSQL_CONF.dbName}`,
  BASE_URL: 'http://app-filosedu.nusantara-local.com:8080',
  CLOUD_SERVER: false,
  IMAGE_PATH: path.join(__dirname, 'images'),
  VIDEO_PATH: path.join(__dirname, 'videos'),
  VIDEO_MOUNT_PATH: '/videos/',
  IMAGE_MOUNT_PATH: '/images/',
  PREFIX_360P: '360p_',
  PREFIX_720P: '720P_',
  AWS_REGION: 'ap-southeast-1',
  AWS_LINK: 'http://s3-ap-southeast-1.amazonaws.com',
  AWS_BUCKET_NAME: 'ncloud-testing',
  AWS_PREFIX_FOLDER_VIDEO_NAME: 'videos_v1/',
  AWS_PREFIX_FOLDER_IMAGE_NAME: 'images_v1/',
  AWS_PIPELINE_ID: '1517283530132-1wj56s',
  AWS_360P_PRESET_ID: '1517305976374-exb5fa',
  AWS_720P_PRESET_ID: '1351620000001-000010',
  LOGGING_SERVICE,
  SQL_DB: `mysql://${MYSQL_CONF.username}:${MYSQL_CONF.password}@localhost:3306/${MYSQL_CONF.dbName}`, // Only used by sync script
  VIEWS_APP_PATH: path.join(__dirname, 'app/views'),
  VIEWS_CMS_PATH: path.join(__dirname, 'cms/views')
}
