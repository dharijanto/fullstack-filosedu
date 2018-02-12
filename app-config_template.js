var path = require('path')

const MYSQL_CONF = {
  username: 'root',
  password: 'password',
  dbName: 'app_filosedu'
}

module.exports = {
  testDbPath: `mysql://${MYSQL_CONF.username}:${MYSQL_CONF.password}@127.0.0.1:3306/${MYSQL_CONF.dbName}`,
  BASE_URL: 'http://app-filosedu.nusantara-local.com',
  CLOUD_SERVER: true,
  IMAGE_PATH: path.join(__dirname, 'images'),
  VIDEO_PATH: path.join(__dirname, 'videos'),
  VIDEO_MOUNT_PATH: '/videos/',
  IMAGE_MOUNT_PATH: '/images/',
  PREFIX_360P: '360p_',
  PREFIX_720P: '720P_',
  AWS_REGION: 'ap-southeast-1',
  AWS_LINK: 'URL OF AWS (BASE URL)',
  AWS_BUCKET_NAME: '(AWS BUCKET NAME)',
  AWS_PREFIX_FOLDER_VIDEO_NAME: '(AWS FOLDER NAME LIKE videos_v1/)',
  AWS_PREFIX_FOLDER_IMAGE_NAME: 'images_v1/',
  AWS_PIPELINE_ID: '(AWS PIPELINE ID)',
  AWS_360P_PRESET_ID: '(AWS PRESET ID)',
  AWS_720P_PRESET_ID: '(AWS PRESET ID)'
}
