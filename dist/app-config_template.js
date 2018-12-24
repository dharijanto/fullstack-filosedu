var path=require("path"),ip=require("ip");const MYSQL_CONF={username:"root",password:"",dbName:"app_filosedu"},AWS_VIDEO_CONF={AWS_REGION:"ap-southeast-1",AWS_LINK:"https://s3-ap-southeast-1.amazonaws.com",AWS_BUCKET_NAME:"ncloud-testing",AWS_PIPELINE_ID:"",AWS_360P_PRESET_ID:"",AWS_720P_PRESET_ID:"",AWS_PREFIX_FOLDER_VIDEO_NAME:"videos_v1/",AWS_360P_FOLDER:"360p/",AWS_720P_FOLDER:"720p/"},AWS_IMAGE_CONF={AWS_LINK:"https://s3-ap-southeast-1.amazonaws.com",AWS_BUCKET_NAME:"ncloud-testing",AWS_PREFIX_FOLDER_IMAGE_NAME:"images_v1/"},LOCAL_SCHOOL_INFORMATION={identifier:"smpk_1"},CLOUD_INFORMATION={HOST:"https://www.filosedu.com"};module.exports={SQL_DB:`mysql://${MYSQL_CONF.username}:${MYSQL_CONF.password}@localhost:3306/${MYSQL_CONF.dbName}`,BASE_URL:ip.address(),CLOUD_SERVER:!0,IMAGE_PATH:path.join(__dirname,"images"),VIDEO_PATH:path.join(__dirname,"videos"),IMAGE_MOUNT_PATH:"/images/",VIDEO_MOUNT_PATH:"/videos/",AWS_REGION:"ap-southeast-1",AWS_VIDEO_CONF:AWS_VIDEO_CONF,AWS_IMAGE_CONF:AWS_IMAGE_CONF,VIEWS_APP_PATH:path.join(__dirname,"app/views"),VIEWS_CMS_PATH:path.join(__dirname,"cms/views"),LOCAL_SCHOOL_INFORMATION:LOCAL_SCHOOL_INFORMATION,CLOUD_INFORMATION:CLOUD_INFORMATION};
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9hcHAtY29uZmlnX3RlbXBsYXRlLmpzIl0sIm5hbWVzIjpbInBhdGgiLCJyZXF1aXJlIiwiaXAiLCJNWVNRTF9DT05GIiwidXNlcm5hbWUiLCJwYXNzd29yZCIsImRiTmFtZSIsIkFXU19WSURFT19DT05GIiwiQVdTX1JFR0lPTiIsIkFXU19MSU5LIiwiQVdTX0JVQ0tFVF9OQU1FIiwiQVdTX1BJUEVMSU5FX0lEIiwiQVdTXzM2MFBfUFJFU0VUX0lEIiwiQVdTXzcyMFBfUFJFU0VUX0lEIiwiQVdTX1BSRUZJWF9GT0xERVJfVklERU9fTkFNRSIsIkFXU18zNjBQX0ZPTERFUiIsIkFXU183MjBQX0ZPTERFUiIsIkFXU19JTUFHRV9DT05GIiwiQVdTX1BSRUZJWF9GT0xERVJfSU1BR0VfTkFNRSIsIkxPQ0FMX1NDSE9PTF9JTkZPUk1BVElPTiIsImlkZW50aWZpZXIiLCJDTE9VRF9JTkZPUk1BVElPTiIsIkhPU1QiLCJtb2R1bGUiLCJleHBvcnRzIiwiU1FMX0RCIiwiQkFTRV9VUkwiLCJhZGRyZXNzIiwiQ0xPVURfU0VSVkVSIiwiSU1BR0VfUEFUSCIsImpvaW4iLCJfX2Rpcm5hbWUiLCJWSURFT19QQVRIIiwiSU1BR0VfTU9VTlRfUEFUSCIsIlZJREVPX01PVU5UX1BBVEgiLCJWSUVXU19BUFBfUEFUSCIsIlZJRVdTX0NNU19QQVRIIl0sIm1hcHBpbmdzIjoiQUFBQSxJQUFJQSxLQUFPQyxRQUFRLFFBQ2ZDLEdBQUtELFFBQVEsTUFHakIsTUFBTUUsWUFDSkMsU0FBVSxPQUNWQyxTQUFVLEdBQ1ZDLE9BQVEsZ0JBR0pDLGdCQUNKQyxXQUFZLGlCQUNaQyxTQUFVLDBDQUNWQyxnQkFBaUIsaUJBQ2pCQyxnQkFBaUIsR0FDakJDLG1CQUFvQixHQUNwQkMsbUJBQW9CLEdBQ3BCQyw2QkFBOEIsYUFDOUJDLGdCQUFpQixRQUNqQkMsZ0JBQWlCLFNBR2JDLGdCQUNKUixTQUFVLDBDQUNWQyxnQkFBaUIsaUJBQ2pCUSw2QkFBOEIsY0FJMUJDLDBCQUNKQyxXQUFZLFVBR1JDLG1CQUNKQyxLQUFNLDRCQUdSQyxPQUFPQyxTQUNMQyxrQkFBbUJ0QixXQUFXQyxZQUFZRCxXQUFXRSwyQkFBMkJGLFdBQVdHLFNBQzNGb0IsU0FBVXhCLEdBQUd5QixVQUNiQyxjQUFjLEVBQ2RDLFdBQVk3QixLQUFLOEIsS0FBS0MsVUFBVyxVQUNqQ0MsV0FBWWhDLEtBQUs4QixLQUFLQyxVQUFXLFVBQ2pDRSxpQkFBa0IsV0FDbEJDLGlCQUFrQixXQUNsQjFCLFdBQVksaUJBQ1pELGVBQUFBLGVBQ0FVLGVBQUFBLGVBQ0FrQixlQUFnQm5DLEtBQUs4QixLQUFLQyxVQUFXLGFBQ3JDSyxlQUFnQnBDLEtBQUs4QixLQUFLQyxVQUFXLGFBQ3JDWix5QkFBQUEseUJBQ0FFLGtCQUFBQSIsImZpbGUiOiJhcHAtY29uZmlnX3RlbXBsYXRlLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIHBhdGggPSByZXF1aXJlKCdwYXRoJylcbnZhciBpcCA9IHJlcXVpcmUoJ2lwJylcblxuLy8gVXNlZCBieSBzY3JpcHQvdmlkZW8tYW5kLWltYWdlcy1zeW5jLmpzXG5jb25zdCBNWVNRTF9DT05GID0ge1xuICB1c2VybmFtZTogJ3Jvb3QnLFxuICBwYXNzd29yZDogJycsXG4gIGRiTmFtZTogJ2FwcF9maWxvc2VkdSdcbn1cblxuY29uc3QgQVdTX1ZJREVPX0NPTkYgPSB7XG4gIEFXU19SRUdJT046ICdhcC1zb3V0aGVhc3QtMScsXG4gIEFXU19MSU5LOiAnaHR0cHM6Ly9zMy1hcC1zb3V0aGVhc3QtMS5hbWF6b25hd3MuY29tJyxcbiAgQVdTX0JVQ0tFVF9OQU1FOiAnbmNsb3VkLXRlc3RpbmcnLFxuICBBV1NfUElQRUxJTkVfSUQ6ICcnLFxuICBBV1NfMzYwUF9QUkVTRVRfSUQ6ICcnLFxuICBBV1NfNzIwUF9QUkVTRVRfSUQ6ICcnLFxuICBBV1NfUFJFRklYX0ZPTERFUl9WSURFT19OQU1FOiAndmlkZW9zX3YxLycsXG4gIEFXU18zNjBQX0ZPTERFUjogJzM2MHAvJyxcbiAgQVdTXzcyMFBfRk9MREVSOiAnNzIwcC8nXG59XG5cbmNvbnN0IEFXU19JTUFHRV9DT05GID0ge1xuICBBV1NfTElOSzogJ2h0dHBzOi8vczMtYXAtc291dGhlYXN0LTEuYW1hem9uYXdzLmNvbScsXG4gIEFXU19CVUNLRVRfTkFNRTogJ25jbG91ZC10ZXN0aW5nJyxcbiAgQVdTX1BSRUZJWF9GT0xERVJfSU1BR0VfTkFNRTogJ2ltYWdlc192MS8nXG59XG5cbi8vIFNjaG9vbCBpbmZvcm1hdGlvbiBoZXJlIGlzIHVzZWQgaWYgQ0xPVURfU0VSVkVSIGlzIHNldCBmYWxzZVxuY29uc3QgTE9DQUxfU0NIT09MX0lORk9STUFUSU9OID0ge1xuICBpZGVudGlmaWVyOiAnc21wa18xJ1xufVxuXG5jb25zdCBDTE9VRF9JTkZPUk1BVElPTiA9IHtcbiAgSE9TVDogJ2h0dHBzOi8vd3d3LmZpbG9zZWR1LmNvbSdcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIFNRTF9EQjogYG15c3FsOi8vJHtNWVNRTF9DT05GLnVzZXJuYW1lfToke01ZU1FMX0NPTkYucGFzc3dvcmR9QGxvY2FsaG9zdDozMzA2LyR7TVlTUUxfQ09ORi5kYk5hbWV9YCwgLy8gT25seSB1c2VkIGJ5IHN5bmMgc2NyaXB0XG4gIEJBU0VfVVJMOiBpcC5hZGRyZXNzKCksIC8vJ2h0dHA6Ly9hcHAtZmlsb3NlZHUubnVzYW50YXJhLWxvY2FsLmNvbScsXG4gIENMT1VEX1NFUlZFUjogdHJ1ZSxcbiAgSU1BR0VfUEFUSDogcGF0aC5qb2luKF9fZGlybmFtZSwgJ2ltYWdlcycpLFxuICBWSURFT19QQVRIOiBwYXRoLmpvaW4oX19kaXJuYW1lLCAndmlkZW9zJyksXG4gIElNQUdFX01PVU5UX1BBVEg6ICcvaW1hZ2VzLycsXG4gIFZJREVPX01PVU5UX1BBVEg6ICcvdmlkZW9zLycsIC8vIFZpZGVvIGlzIG1vdW50ZWQgb24gd3d3LmRvbWFpbi5jb20vW1ZJREVPX01PVU5UX1BBVEhdXG4gIEFXU19SRUdJT046ICdhcC1zb3V0aGVhc3QtMScsXG4gIEFXU19WSURFT19DT05GLFxuICBBV1NfSU1BR0VfQ09ORixcbiAgVklFV1NfQVBQX1BBVEg6IHBhdGguam9pbihfX2Rpcm5hbWUsICdhcHAvdmlld3MnKSxcbiAgVklFV1NfQ01TX1BBVEg6IHBhdGguam9pbihfX2Rpcm5hbWUsICdjbXMvdmlld3MnKSxcbiAgTE9DQUxfU0NIT09MX0lORk9STUFUSU9OLFxuICBDTE9VRF9JTkZPUk1BVElPTlxufVxuIl19