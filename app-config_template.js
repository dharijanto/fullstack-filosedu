var path = require('path')
var ip = require('ip')

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
  AWS_720P_PRESET_ID: '',
  AWS_PREFIX_FOLDER_VIDEO_NAME: 'videos_v1/',
  AWS_360P_FOLDER: '360p/',
  AWS_720P_FOLDER: '720p/'
}

const AWS_IMAGE_CONF = {
  AWS_LINK: 'https://s3-ap-southeast-1.amazonaws.com',
  AWS_BUCKET_NAME: 'ncloud-testing',
  AWS_PREFIX_FOLDER_IMAGE_NAME: 'images_v1/'
}

// School information here is used if CLOUD_SERVER is set false
const LOCAL_SCHOOL_INFORMATION = {
  identifier: 'smpk_1'
}

const CLOUD_INFORMATION = {
  HOST: 'http://www.filosedu.com/synchronization'
}

module.exports = {
  SQL_DB: `mysql://${MYSQL_CONF.username}:${MYSQL_CONF.password}@localhost:3306/${MYSQL_CONF.dbName}`, // Only used by sync script
  BASE_URL: ip.address(), //'http://app-filosedu.nusantara-local.com',
  CLOUD_SERVER: true,
  IMAGE_PATH: path.join(__dirname, 'images'),
  VIDEO_PATH: path.join(__dirname, 'videos'),
  IMAGE_MOUNT_PATH: '/images/',
  VIDEO_MOUNT_PATH: '/videos/', // Video is mounted on www.domain.com/[VIDEO_MOUNT_PATH]
  AWS_REGION: 'ap-southeast-1',
  AWS_VIDEO_CONF,
  AWS_IMAGE_CONF,
  VIEWS_APP_PATH: path.join(__dirname, 'app/views'),
  VIEWS_CMS_PATH: path.join(__dirname, 'cms/views'),
  LOCAL_SCHOOL_INFORMATION,
  CLOUD_INFORMATION
}
