const path=require("path");var AWS=require("aws-sdk");const express=require("express"),log=require("npmlog"),AppConfig=require(path.join(__dirname,"../app-config")),BaseController=require(path.join(__dirname,"controllers/base-controller")),CourseManagementController=require(path.join(__dirname,"controllers/course-management-controller")),AccountManagementController=require(path.join(__dirname,"controllers/account-management-controller")),SchoolManagementController=require(path.join(__dirname,"controllers/school-management-controller")),StudentMonitorController=require(path.join(__dirname,"controllers/student-monitor-controller")),SubtopicController=require(path.join(__dirname,"controllers/subtopic-controller")),SyncController=require(path.join(__dirname,"controllers/sync-controller"));class MainController extends BaseController{constructor(e){e.logTag="FiloseduCMSController",super(e),this.addInterceptor((e,r,t)=>{log.verbose(this.getTag(),"req.path="+e.path),t()}),AWS.config.update({region:AppConfig.AWS_REGION}),this.routeUse("/videos",express.static(AppConfig.VIDEO_PATH)),this.routeUse("/images",express.static(AppConfig.IMAGE_PATH)),this.routeHashlessUse(new AccountManagementController(e).getRouter()),this.routeHashlessUse(new CourseManagementController(e).getRouter()),this.routeHashlessUse(new SchoolManagementController(e).getRouter()),this.routeHashlessUse(new StudentMonitorController(e).getRouter()),this.routeHashlessUse(new SubtopicController(e).getRouter()),this.routeHashlessUse(new SyncController(e).getRouter())}getViewPath(){return this._viewPath}getDebug(){return this._debug}getSidebar(){return[{title:"Course Management",url:"/course-management",faicon:"fa-dashboard"},{title:"Dependency Visualizer",url:"/dependency-visualizer",faicon:"fa-bar-chart-o",children:[{title:"A",url:"/dependency-visualizer/a"},{title:"B",url:"/dependency-visualizer/b"}]}]}setDebug(e){this._debug=e}}module.exports=MainController;
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jbXMvbWFpbi1jb250cm9sbGVyLmpzIl0sIm5hbWVzIjpbInBhdGgiLCJyZXF1aXJlIiwiQVdTIiwiZXhwcmVzcyIsImxvZyIsIkFwcENvbmZpZyIsImpvaW4iLCJfX2Rpcm5hbWUiLCJCYXNlQ29udHJvbGxlciIsIkNvdXJzZU1hbmFnZW1lbnRDb250cm9sbGVyIiwiQWNjb3VudE1hbmFnZW1lbnRDb250cm9sbGVyIiwiU2Nob29sTWFuYWdlbWVudENvbnRyb2xsZXIiLCJTdHVkZW50TW9uaXRvckNvbnRyb2xsZXIiLCJTdWJ0b3BpY0NvbnRyb2xsZXIiLCJTeW5jQ29udHJvbGxlciIsIk1haW5Db250cm9sbGVyIiwiW29iamVjdCBPYmplY3RdIiwiaW5pdERhdGEiLCJsb2dUYWciLCJzdXBlciIsInRoaXMiLCJhZGRJbnRlcmNlcHRvciIsInJlcSIsInJlcyIsIm5leHQiLCJ2ZXJib3NlIiwiZ2V0VGFnIiwiY29uZmlnIiwidXBkYXRlIiwicmVnaW9uIiwiQVdTX1JFR0lPTiIsInJvdXRlVXNlIiwic3RhdGljIiwiVklERU9fUEFUSCIsIklNQUdFX1BBVEgiLCJyb3V0ZUhhc2hsZXNzVXNlIiwiZ2V0Um91dGVyIiwiX3ZpZXdQYXRoIiwiX2RlYnVnIiwidGl0bGUiLCJ1cmwiLCJmYWljb24iLCJjaGlsZHJlbiIsImRlYnVnIiwibW9kdWxlIiwiZXhwb3J0cyJdLCJtYXBwaW5ncyI6IkFBQUEsTUFBTUEsS0FBT0MsUUFBUSxRQUVyQixJQUFJQyxJQUFNRCxRQUFRLFdBQ2xCLE1BQU1FLFFBQVVGLFFBQVEsV0FDbEJHLElBQU1ILFFBQVEsVUFFZEksVUFBWUosUUFBUUQsS0FBS00sS0FBS0MsVUFBVyxrQkFDekNDLGVBQWlCUCxRQUFRRCxLQUFLTSxLQUFLQyxVQUFXLGdDQUM5Q0UsMkJBQTZCUixRQUFRRCxLQUFLTSxLQUFLQyxVQUFXLDZDQUMxREcsNEJBQThCVCxRQUFRRCxLQUFLTSxLQUFLQyxVQUFXLDhDQUMzREksMkJBQTZCVixRQUFRRCxLQUFLTSxLQUFLQyxVQUFXLDZDQUMxREsseUJBQTJCWCxRQUFRRCxLQUFLTSxLQUFLQyxVQUFXLDJDQUN4RE0sbUJBQXFCWixRQUFRRCxLQUFLTSxLQUFLQyxVQUFXLG9DQUNsRE8sZUFBaUJiLFFBQVFELEtBQUtNLEtBQUtDLFVBQVcsc0NBRXBEUSx1QkFBNkJQLGVBQzNCUSxZQUFhQyxHQUNYQSxFQUFTQyxPQUFTLHdCQUNsQkMsTUFBTUYsR0FFTkcsS0FBS0MsZUFBZSxDQUFDQyxFQUFLQyxFQUFLQyxLQUM3QnBCLElBQUlxQixRQUFRTCxLQUFLTSxTQUFVLFlBQWNKLEVBQUl0QixNQUM3Q3dCLE1BR0Z0QixJQUFJeUIsT0FBT0MsUUFBUUMsT0FBUXhCLFVBQVV5QixhQUNyQ1YsS0FBS1csU0FBUyxVQUFXNUIsUUFBUTZCLE9BQU8zQixVQUFVNEIsYUFDbERiLEtBQUtXLFNBQVMsVUFBVzVCLFFBQVE2QixPQUFPM0IsVUFBVTZCLGFBQ2xEZCxLQUFLZSxpQkFBaUIsSUFBS3pCLDRCQUE0Qk8sR0FBV21CLGFBQ2xFaEIsS0FBS2UsaUJBQWlCLElBQUsxQiwyQkFBMkJRLEdBQVdtQixhQUNqRWhCLEtBQUtlLGlCQUFrQixJQUFJeEIsMkJBQTJCTSxHQUFVbUIsYUFDaEVoQixLQUFLZSxpQkFBa0IsSUFBSXZCLHlCQUF5QkssR0FBVW1CLGFBQzlEaEIsS0FBS2UsaUJBQWlCLElBQUt0QixtQkFBbUJJLEdBQVdtQixhQUN6RGhCLEtBQUtlLGlCQUFpQixJQUFLckIsZUFBZUcsR0FBV21CLGFBSXZEcEIsY0FDRSxPQUFPSSxLQUFLaUIsVUFHZHJCLFdBQ0UsT0FBT0ksS0FBS2tCLE9BR2R0QixhQUNFLFFBRUl1QixNQUFPLG9CQUNQQyxJQUFLLHFCQUNMQyxPQUFRLGlCQUdSRixNQUFPLHdCQUNQQyxJQUFLLHlCQUNMQyxPQUFRLGlCQUNSQyxXQUNHSCxNQUFPLElBQUtDLElBQUssNkJBQ2pCRCxNQUFPLElBQUtDLElBQUssK0JBSzFCeEIsU0FBVTJCLEdBQ1J2QixLQUFLa0IsT0FBU0ssR0FJbEJDLE9BQU9DLFFBQVU5QiIsImZpbGUiOiJjbXMvbWFpbi1jb250cm9sbGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKVxuXG52YXIgQVdTID0gcmVxdWlyZSgnYXdzLXNkaycpXG5jb25zdCBleHByZXNzID0gcmVxdWlyZSgnZXhwcmVzcycpXG5jb25zdCBsb2cgPSByZXF1aXJlKCducG1sb2cnKVxuXG5jb25zdCBBcHBDb25maWcgPSByZXF1aXJlKHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9hcHAtY29uZmlnJykpXG5jb25zdCBCYXNlQ29udHJvbGxlciA9IHJlcXVpcmUocGF0aC5qb2luKF9fZGlybmFtZSwgJ2NvbnRyb2xsZXJzL2Jhc2UtY29udHJvbGxlcicpKVxuY29uc3QgQ291cnNlTWFuYWdlbWVudENvbnRyb2xsZXIgPSByZXF1aXJlKHBhdGguam9pbihfX2Rpcm5hbWUsICdjb250cm9sbGVycy9jb3Vyc2UtbWFuYWdlbWVudC1jb250cm9sbGVyJykpXG5jb25zdCBBY2NvdW50TWFuYWdlbWVudENvbnRyb2xsZXIgPSByZXF1aXJlKHBhdGguam9pbihfX2Rpcm5hbWUsICdjb250cm9sbGVycy9hY2NvdW50LW1hbmFnZW1lbnQtY29udHJvbGxlcicpKVxuY29uc3QgU2Nob29sTWFuYWdlbWVudENvbnRyb2xsZXIgPSByZXF1aXJlKHBhdGguam9pbihfX2Rpcm5hbWUsICdjb250cm9sbGVycy9zY2hvb2wtbWFuYWdlbWVudC1jb250cm9sbGVyJykpXG5jb25zdCBTdHVkZW50TW9uaXRvckNvbnRyb2xsZXIgPSByZXF1aXJlKHBhdGguam9pbihfX2Rpcm5hbWUsICdjb250cm9sbGVycy9zdHVkZW50LW1vbml0b3ItY29udHJvbGxlcicpKVxuY29uc3QgU3VidG9waWNDb250cm9sbGVyID0gcmVxdWlyZShwYXRoLmpvaW4oX19kaXJuYW1lLCAnY29udHJvbGxlcnMvc3VidG9waWMtY29udHJvbGxlcicpKVxuY29uc3QgU3luY0NvbnRyb2xsZXIgPSByZXF1aXJlKHBhdGguam9pbihfX2Rpcm5hbWUsICdjb250cm9sbGVycy9zeW5jLWNvbnRyb2xsZXInKSlcblxuY2xhc3MgTWFpbkNvbnRyb2xsZXIgZXh0ZW5kcyBCYXNlQ29udHJvbGxlciB7XG4gIGNvbnN0cnVjdG9yIChpbml0RGF0YSkge1xuICAgIGluaXREYXRhLmxvZ1RhZyA9ICdGaWxvc2VkdUNNU0NvbnRyb2xsZXInXG4gICAgc3VwZXIoaW5pdERhdGEpXG5cbiAgICB0aGlzLmFkZEludGVyY2VwdG9yKChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgICAgbG9nLnZlcmJvc2UodGhpcy5nZXRUYWcoKSwgJ3JlcS5wYXRoPScgKyByZXEucGF0aClcbiAgICAgIG5leHQoKVxuICAgIH0pXG5cbiAgICBBV1MuY29uZmlnLnVwZGF0ZSh7cmVnaW9uOiBBcHBDb25maWcuQVdTX1JFR0lPTn0pXG4gICAgdGhpcy5yb3V0ZVVzZSgnL3ZpZGVvcycsIGV4cHJlc3Muc3RhdGljKEFwcENvbmZpZy5WSURFT19QQVRIKSlcbiAgICB0aGlzLnJvdXRlVXNlKCcvaW1hZ2VzJywgZXhwcmVzcy5zdGF0aWMoQXBwQ29uZmlnLklNQUdFX1BBVEgpKVxuICAgIHRoaXMucm91dGVIYXNobGVzc1VzZSgobmV3IEFjY291bnRNYW5hZ2VtZW50Q29udHJvbGxlcihpbml0RGF0YSkpLmdldFJvdXRlcigpKVxuICAgIHRoaXMucm91dGVIYXNobGVzc1VzZSgobmV3IENvdXJzZU1hbmFnZW1lbnRDb250cm9sbGVyKGluaXREYXRhKSkuZ2V0Um91dGVyKCkpXG4gICAgdGhpcy5yb3V0ZUhhc2hsZXNzVXNlKChuZXcgU2Nob29sTWFuYWdlbWVudENvbnRyb2xsZXIoaW5pdERhdGEpLmdldFJvdXRlcigpKSlcbiAgICB0aGlzLnJvdXRlSGFzaGxlc3NVc2UoKG5ldyBTdHVkZW50TW9uaXRvckNvbnRyb2xsZXIoaW5pdERhdGEpLmdldFJvdXRlcigpKSlcbiAgICB0aGlzLnJvdXRlSGFzaGxlc3NVc2UoKG5ldyBTdWJ0b3BpY0NvbnRyb2xsZXIoaW5pdERhdGEpKS5nZXRSb3V0ZXIoKSlcbiAgICB0aGlzLnJvdXRlSGFzaGxlc3NVc2UoKG5ldyBTeW5jQ29udHJvbGxlcihpbml0RGF0YSkpLmdldFJvdXRlcigpKVxuICB9XG5cbiAgLy8gVmlldyBwYXRoIGlzIHVuZGVyIFt0ZW1wbGF0ZU5hbWVdL2FwcC92aWV3XG4gIGdldFZpZXdQYXRoICgpIHtcbiAgICByZXR1cm4gdGhpcy5fdmlld1BhdGhcbiAgfVxuXG4gIGdldERlYnVnICgpIHtcbiAgICByZXR1cm4gdGhpcy5fZGVidWdcbiAgfVxuXG4gIGdldFNpZGViYXIgKCkge1xuICAgIHJldHVybiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnQ291cnNlIE1hbmFnZW1lbnQnLFxuICAgICAgICB1cmw6ICcvY291cnNlLW1hbmFnZW1lbnQnLFxuICAgICAgICBmYWljb246ICdmYS1kYXNoYm9hcmQnXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0aXRsZTogJ0RlcGVuZGVuY3kgVmlzdWFsaXplcicsXG4gICAgICAgIHVybDogJy9kZXBlbmRlbmN5LXZpc3VhbGl6ZXInLFxuICAgICAgICBmYWljb246ICdmYS1iYXItY2hhcnQtbycsXG4gICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAge3RpdGxlOiAnQScsIHVybDogJy9kZXBlbmRlbmN5LXZpc3VhbGl6ZXIvYSd9LFxuICAgICAgICAgIHt0aXRsZTogJ0InLCB1cmw6ICcvZGVwZW5kZW5jeS12aXN1YWxpemVyL2InfV1cbiAgICAgIH1cbiAgICBdXG4gIH1cblxuICBzZXREZWJ1ZyAoZGVidWcpIHtcbiAgICB0aGlzLl9kZWJ1ZyA9IGRlYnVnXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBNYWluQ29udHJvbGxlclxuIl19