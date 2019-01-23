"use strict";Object.defineProperty(exports,"__esModule",{value:!0});const Promise=require("bluebird"),sequelize_service_1=require("../services/sequelize-service"),path=require("path");let express=require("express"),getSlug=require("speakingurl"),log=require("npmlog"),marked=require("marked"),moment=require("moment-timezone"),AppConfig=require(path.join(__dirname,"../app-config")),BaseController=require(path.join(__dirname,"controllers/base-controller")),CourseController=require(path.join(__dirname,"controllers/course-controller")),CredentialController=require(path.join(__dirname,"controllers/credential-controller")),ExerciseController=require(path.join(__dirname,"controllers/exercise-controller"));const competency_exercise_controller_1=require("./controllers/competency-exercise-controller");let SubtopicController=require(path.join(__dirname,"controllers/subtopic-controller")),SyncController=require(path.join(__dirname,"controllers/sync-controller")),PassportManager=require(path.join(__dirname,"../lib/passport-manager")),PassportHelper=require(path.join(__dirname,"utils/passport-helper"));const TAG="FiloseduAppController";class Controller extends BaseController{constructor(e){super(e),PassportManager.initialize(),moment.tz.setDefault("UTC"),this.addInterceptor((e,r,o)=>{log.verbose(TAG,"req.path="+e.path),log.verbose(TAG,"loggedIn="+e.isAuthenticated()),log.verbose(TAG,"req.on="+JSON.stringify(e.session)),log.verbose(TAG,"req.headers.cookie="+JSON.stringify(e.headers.cookie)),r.locals.marked=marked,r.locals.getSlug=getSlug,r.locals.site=e.site,r.locals.user=e.user,r.locals.loggedIn=e.isAuthenticated(),r.locals.cloudServer=AppConfig.CLOUD_SERVER,o()}),sequelize_service_1.default.initialize(this.getDb().sequelize,this.getDb().models),this.credentialController=new CredentialController(e),this.exerciseController=new ExerciseController(e),this.competencyExerciseController=new competency_exercise_controller_1.default(e),this.courseController=new CourseController(e),this.subtopicController=new SubtopicController(e),this.syncController=new SyncController(e),this.routeUse(AppConfig.VIDEO_MOUNT_PATH,express.static(AppConfig.VIDEO_PATH,{maxAge:"1h"})),this.routeUse(AppConfig.IMAGE_MOUNT_PATH,express.static(AppConfig.IMAGE_PATH,{maxAge:"1h"})),this.routeUse(this.credentialController.getRouter()),this.routeUse(this.exerciseController.getRouter()),this.routeUse(this.courseController.getRouter()),this.routeUse(this.subtopicController.getRouter()),this.routeUse(this.syncController.getRouter()),this.routeUse("/competency-exercise",this.competencyExerciseController.getRouter())}initialize(){return Promise.join(this.credentialController.initialize(),this.courseController.initialize(),this.subtopicController.initialize(),this.exerciseController.initialize(),this.competencyExerciseController.initialize(),this.syncController.initialize())}}module.exports=Controller;
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9hcHAvbWFpbi1jb250cm9sbGVyLnRzIl0sIm5hbWVzIjpbIlByb21pc2UiLCJyZXF1aXJlIiwic2VxdWVsaXplX3NlcnZpY2VfMSIsInBhdGgiLCJleHByZXNzIiwiZ2V0U2x1ZyIsImxvZyIsIm1hcmtlZCIsIm1vbWVudCIsIkFwcENvbmZpZyIsImpvaW4iLCJfX2Rpcm5hbWUiLCJCYXNlQ29udHJvbGxlciIsIkNvdXJzZUNvbnRyb2xsZXIiLCJDcmVkZW50aWFsQ29udHJvbGxlciIsIkV4ZXJjaXNlQ29udHJvbGxlciIsImNvbXBldGVuY3lfZXhlcmNpc2VfY29udHJvbGxlcl8xIiwiU3VidG9waWNDb250cm9sbGVyIiwiU3luY0NvbnRyb2xsZXIiLCJQYXNzcG9ydE1hbmFnZXIiLCJQYXNzcG9ydEhlbHBlciIsIlRBRyIsIkNvbnRyb2xsZXIiLCJbb2JqZWN0IE9iamVjdF0iLCJpbml0RGF0YSIsInN1cGVyIiwiaW5pdGlhbGl6ZSIsInR6Iiwic2V0RGVmYXVsdCIsInRoaXMiLCJhZGRJbnRlcmNlcHRvciIsInJlcSIsInJlcyIsIm5leHQiLCJ2ZXJib3NlIiwiaXNBdXRoZW50aWNhdGVkIiwiSlNPTiIsInN0cmluZ2lmeSIsInNlc3Npb24iLCJoZWFkZXJzIiwiY29va2llIiwibG9jYWxzIiwic2l0ZSIsInVzZXIiLCJsb2dnZWRJbiIsImNsb3VkU2VydmVyIiwiQ0xPVURfU0VSVkVSIiwiZGVmYXVsdCIsImdldERiIiwic2VxdWVsaXplIiwibW9kZWxzIiwiY3JlZGVudGlhbENvbnRyb2xsZXIiLCJleGVyY2lzZUNvbnRyb2xsZXIiLCJjb21wZXRlbmN5RXhlcmNpc2VDb250cm9sbGVyIiwiY291cnNlQ29udHJvbGxlciIsInN1YnRvcGljQ29udHJvbGxlciIsInN5bmNDb250cm9sbGVyIiwicm91dGVVc2UiLCJWSURFT19NT1VOVF9QQVRIIiwic3RhdGljIiwiVklERU9fUEFUSCIsIm1heEFnZSIsIklNQUdFX01PVU5UX1BBVEgiLCJJ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LEtBQUt5QixpQkFBaUI1QixhQUN0QkcsS0FBSzBCLG1CQUFtQjdCLGFBQ3hCRyxLQUFLdUIsbUJBQW1CMUIsYUFDeEJHLEtBQUt3Qiw2QkFBNkIzQixhQUNsQ0csS0FBSzJCLGVBQWU5QixlQUsxQnVDLE9BQU9DLFFBQVU1QyIsImZpbGUiOiJhcHAvbWFpbi1jb250cm9sbGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgUHJvbWlzZSBmcm9tICdibHVlYmlyZCdcbmltcG9ydCBTZXF1ZWxpemVTZXJ2aWNlIGZyb20gJy4uL3NlcnZpY2VzL3NlcXVlbGl6ZS1zZXJ2aWNlJ1xuXG5jb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpXG5cbmxldCBleHByZXNzID0gcmVxdWlyZSgnZXhwcmVzcycpXG5sZXQgZ2V0U2x1ZyA9IHJlcXVpcmUoJ3NwZWFraW5ndXJsJylcbmxldCBsb2cgPSByZXF1aXJlKCducG1sb2cnKVxubGV0IG1hcmtlZCA9IHJlcXVpcmUoJ21hcmtlZCcpXG5sZXQgbW9tZW50ID0gcmVxdWlyZSgnbW9tZW50LXRpbWV6b25lJylcblxubGV0IEFwcENvbmZpZyA9IHJlcXVpcmUocGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2FwcC1jb25maWcnKSlcbmxldCBCYXNlQ29udHJvbGxlciA9IHJlcXVpcmUocGF0aC5qb2luKF9fZGlybmFtZSwgJ2NvbnRyb2xsZXJzL2Jhc2UtY29udHJvbGxlcicpKVxubGV0IENvdXJzZUNvbnRyb2xsZXIgPSByZXF1aXJlKHBhdGguam9pbihfX2Rpcm5hbWUsICdjb250cm9sbGVycy9jb3Vyc2UtY29udHJvbGxlcicpKVxubGV0IENyZWRlbnRpYWxDb250cm9sbGVyID0gcmVxdWlyZShwYXRoLmpvaW4oX19kaXJuYW1lLCAnY29udHJvbGxlcnMvY3JlZGVudGlhbC1jb250cm9sbGVyJykpXG5sZXQgRXhlcmNpc2VDb250cm9sbGVyID0gcmVxdWlyZShwYXRoLmpvaW4oX19kaXJuYW1lLCAnY29udHJvbGxlcnMvZXhlcmNpc2UtY29udHJvbGxlcicpKVxuaW1wb3J0IENvbXBldGVuY3lFeGVyY2lzZUNvbnRyb2xsZXIgZnJvbSAnLi9jb250cm9sbGVycy9jb21wZXRlbmN5LWV4ZXJjaXNlLWNvbnRyb2xsZXInXG5sZXQgU3VidG9waWNDb250cm9sbGVyID0gcmVxdWlyZShwYXRoLmpvaW4oX19kaXJuYW1lLCAnY29udHJvbGxlcnMvc3VidG9waWMtY29udHJvbGxlcicpKVxubGV0IFN5bmNDb250cm9sbGVyID0gcmVxdWlyZShwYXRoLmpvaW4oX19kaXJuYW1lLCAnY29udHJvbGxlcnMvc3luYy1jb250cm9sbGVyJykpXG5sZXQgUGFzc3BvcnRNYW5hZ2VyID0gcmVxdWlyZShwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vbGliL3Bhc3Nwb3J0LW1hbmFnZXInKSlcblxubGV0IFBhc3Nwb3J0SGVscGVyID0gcmVxdWlyZShwYXRoLmpvaW4oX19kaXJuYW1lLCAndXRpbHMvcGFzc3BvcnQtaGVscGVyJykpXG5cbmNvbnN0IFRBRyA9ICdGaWxvc2VkdUFwcENvbnRyb2xsZXInXG5cbmNsYXNzIENvbnRyb2xsZXIgZXh0ZW5kcyBCYXNlQ29udHJvbGxlciB7XG4gIGNvbnN0cnVjdG9yIChpbml0RGF0YSkge1xuICAgIHN1cGVyKGluaXREYXRhKVxuICAgIFBhc3Nwb3J0TWFuYWdlci5pbml0aWFsaXplKClcbiAgICAvLyBTaW5jZSB0aGUgU1FMIHNlcnZlciBpcyBjb25maWd1cmVkIHRvIHN0b3JlIHRoZSBkYXRlIGluIFVUQyBmb3JtYXQsIHdlXG4gICAgLy8gZG8gZXZlcnl0aGluZyBpbiBVVEMgYXMgd2VsbFxuICAgIG1vbWVudC50ei5zZXREZWZhdWx0KCdVVEMnKVxuXG4gICAgdGhpcy5hZGRJbnRlcmNlcHRvcigocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICAgIGxvZy52ZXJib3NlKFRBRywgJ3JlcS5wYXRoPScgKyByZXEucGF0aClcbiAgICAgIGxvZy52ZXJib3NlKFRBRywgJ2xvZ2dlZEluPScgKyByZXEuaXNBdXRoZW50aWNhdGVkKCkpXG4gICAgICBsb2cudmVyYm9zZShUQUcsICdyZXEub249JyArIEpTT04uc3RyaW5naWZ5KHJlcS5zZXNzaW9uKSlcbiAgICAgIGxvZy52ZXJib3NlKFRBRywgJ3JlcS5oZWFkZXJzLmNvb2tpZT0nICsgSlNPTi5zdHJpbmdpZnkocmVxLmhlYWRlcnMuY29va2llKSlcbiAgICAgIHJlcy5sb2NhbHMubWFya2VkID0gbWFya2VkXG4gICAgICByZXMubG9jYWxzLmdldFNsdWcgPSBnZXRTbHVnXG4gICAgICByZXMubG9jYWxzLnNpdGUgPSByZXEuc2l0ZVxuICAgICAgcmVzLmxvY2Fscy51c2VyID0gcmVxLnVzZXJcbiAgICAgIHJlcy5sb2NhbHMubG9nZ2VkSW4gPSByZXEuaXNBdXRoZW50aWNhdGVkKClcbiAgICAgIHJlcy5sb2NhbHMuY2xvdWRTZXJ2ZXIgPSBBcHBDb25maWcuQ0xPVURfU0VSVkVSXG4gICAgICBuZXh0KClcbiAgICB9KVxuICAgIFNlcXVlbGl6ZVNlcnZpY2UuaW5pdGlhbGl6ZSh0aGlzLmdldERiKCkuc2VxdWVsaXplLCB0aGlzLmdldERiKCkubW9kZWxzKVxuXG4gICAgdGhpcy5jcmVkZW50aWFsQ29udHJvbGxlciA9IG5ldyBDcmVkZW50aWFsQ29udHJvbGxlcihpbml0RGF0YSlcbiAgICB0aGlzLmV4ZXJjaXNlQ29udHJvbGxlciA9IG5ldyBFeGVyY2lzZUNvbnRyb2xsZXIoaW5pdERhdGEpXG4gICAgdGhpcy5jb21wZXRlbmN5RXhlcmNpc2VDb250cm9sbGVyID0gbmV3IENvbXBldGVuY3lFeGVyY2lzZUNvbnRyb2xsZXIoaW5pdERhdGEpXG4gICAgdGhpcy5jb3Vyc2VDb250cm9sbGVyID0gbmV3IENvdXJzZUNvbnRyb2xsZXIoaW5pdERhdGEpXG4gICAgdGhpcy5zdWJ0b3BpY0NvbnRyb2xsZXIgPSBuZXcgU3VidG9waWNDb250cm9sbGVyKGluaXREYXRhKVxuICAgIHRoaXMuc3luY0NvbnRyb2xsZXIgPSBuZXcgU3luY0NvbnRyb2xsZXIoaW5pdERhdGEpXG5cbiAgICB0aGlzLnJvdXRlVXNlKEFwcENvbmZpZy5WSURFT19NT1VOVF9QQVRILCBleHByZXNzLnN0YXRpYyhBcHBDb25maWcuVklERU9fUEFUSCwgeyBtYXhBZ2U6ICcxaCcgfSkpXG4gICAgdGhpcy5yb3V0ZVVzZShBcHBDb25maWcuSU1BR0VfTU9VTlRfUEFUSCwgZXhwcmVzcy5zdGF0aWMoQXBwQ29uZmlnLklNQUdFX1BBVEgsIHsgbWF4QWdlOiAnMWgnIH0pKVxuICAgIHRoaXMucm91dGVVc2UodGhpcy5jcmVkZW50aWFsQ29udHJvbGxlci5nZXRSb3V0ZXIoKSlcbiAgICB0aGlzLnJvdXRlVXNlKHRoaXMuZXhlcmNpc2VDb250cm9sbGVyLmdldFJvdXRlcigpKVxuICAgIHRoaXMucm91dGVVc2UodGhpcy5jb3Vyc2VDb250cm9sbGVyLmdldFJvdXRlcigpKVxuICAgIHRoaXMucm91dGVVc2UodGhpcy5zdWJ0b3BpY0NvbnRyb2xsZXIuZ2V0Um91dGVyKCkpXG4gICAgdGhpcy5yb3V0ZVVzZSh0aGlzLnN5bmNDb250cm9sbGVyLmdldFJvdXRlcigpKVxuICAgIHRoaXMucm91dGVVc2UoJy9jb21wZXRlbmN5LWV4ZXJjaXNlJywgdGhpcy5jb21wZXRlbmN5RXhlcmNpc2VDb250cm9sbGVyLmdldFJvdXRlcigpKVxuICB9XG5cbiAgaW5pdGlhbGl6ZSAoKSB7XG4gICAgcmV0dXJuIFByb21pc2Uuam9pbihcbiAgICAgIHRoaXMuY3JlZGVudGlhbENvbnRyb2xsZXIuaW5pdGlhbGl6ZSgpLFxuICAgICAgdGhpcy5jb3Vyc2VDb250cm9sbGVyLmluaXRpYWxpemUoKSxcbiAgICAgIHRoaXMuc3VidG9waWNDb250cm9sbGVyLmluaXRpYWxpemUoKSxcbiAgICAgIHRoaXMuZXhlcmNpc2VDb250cm9sbGVyLmluaXRpYWxpemUoKSxcbiAgICAgIHRoaXMuY29tcGV0ZW5jeUV4ZXJjaXNlQ29udHJvbGxlci5pbml0aWFsaXplKCksXG4gICAgICB0aGlzLnN5bmNDb250cm9sbGVyLmluaXRpYWxpemUoKVxuICAgIClcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRyb2xsZXJcbiJdfQ==
