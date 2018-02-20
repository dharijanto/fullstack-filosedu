var path = require('path')

const MYSQL_CONF = {
  username: 'root',
  password: '',
  dbName: 'filosedu_test'
}

const AWS_VIDEO_CONF = {
  AWS_REGION: 'ap-southeast-1',
  AWS_LINK: 'https://s3-ap-southeast-1.amazonaws.com',
  AWS_BUCKET_NAME: 'ncloud-testing',
  AWS_PIPELINE_ID: '',
  AWS_360P_PRESET_ID: '',
  AWS_720P_PRESET_ID: ''
}

const AWS_IMAGE_CONF = {
  AWS_LINK: 'https://s3-ap-southeast-1.amazonaws.com',
  AWS_BUCKET_NAME: 'ncloud-testing',
  AWS_PREFIX_FOLDER_IMAGE_NAME: 'images_v1/'
}

module.exports = {
  testDbPath: `mysql://${MYSQL_CONF.username}:${MYSQL_CONF.password}@localhost:3306/${MYSQL_CONF.dbName}`,
  BASE_URL: 'http://app-filosedu.nusantara-local.com',
  CLOUD_SERVER: true,
  IMAGE_PATH: path.join(__dirname, 'images'),
  VIDEO_PATH: path.join(__dirname, 'videos'),
  IMAGE_MOUNT_PATH: '/images/',
  VIDEO_MOUNT_PATH: '/videos/', // Video is mounted on www.domain.com/[VIDEO_MOUNT_PATH]
  AWS_REGION: 'ap-southeast-1',
  AWS_VIDEO_CONF,
  AWS_IMAGE_CONF
}
