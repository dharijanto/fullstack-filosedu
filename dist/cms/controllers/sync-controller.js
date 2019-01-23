const path=require("path"),log=require("npmlog"),Promise=require("bluebird"),moment=require("moment-timezone"),BaseController=require(path.join(__dirname,"base-controller")),AppConfig=require(path.join(__dirname,"../../app-config"));var SyncService=require(path.join(__dirname,"../../services/sync-client-service"));const TAG="SyncController";class SyncController extends BaseController{constructor(e){super(e);const t=new SyncService(this.getDb().sequelize,this.getDb().models);this.addInterceptor((e,t,s)=>{log.verbose(TAG,"SyncController: req.path="+e.path),s()}),this.routeGet("/synchronization",(e,t,s)=>{AppConfig.CLOUD_SERVER?t.status(403).send("This page can only be accessed by local server!"):t.render("sync-management")}),this.routeGet("/synchronization/histories",(e,s,r)=>{t.getSyncHistories().then(e=>{s.json(e)}).catch(r)}),this.routePost("/synchronization/start",(e,s,r)=>{log.verbose(TAG,"syncController:GET(): HOMEPAGE"),t.isServerReadyToSync().then(e=>{if(e.status){const r=moment.tz(e.data.lastSync,"Asia/Jakarta").utc().format("YYYY-MM-DD HH:mm:ss"),n=moment.utc().format("YYYY-MM-DD HH:mm:ss");return log.verbose(TAG,"synchronization/start.POST: startTime="+r),log.verbose(TAG,"synchronization/start.POST: endTime="+n),t.findAllUser().then(e=>{if(e.status){const o=e.data;return Promise.map(o,e=>Promise.join(t.findAnalytics(e.id,r,n),t.findSubmittedGeneratedExercises(e.id,r,n),t.findSubmittedGeneratedTopicExercises(e.id,r,n),t.findWatchedVideos(e.id,r,n)).spread((t,s,r,n)=>({user:e,analytics:t.status?t.data:[],submittedGeneratedExercises:s.status?s.data:[],submittedGeneratedTopicExercises:r.status?r.data:[],watchedVideos:n.status?n.data:[]}))).then(e=>(log.verbose(TAG,"syncController.GET(): processedData="+JSON.stringify(e)),t.sendData(e,n).then(e=>{s.json(e)})))}s.json(e)})}s.json(e)}).catch(e=>{r(e)})})}getRouter(){return this._router}}module.exports=SyncController;
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jbXMvY29udHJvbGxlcnMvc3luYy1jb250cm9sbGVyLmpzIl0sIm5hbWVzIjpbInBhdGgiLCJyZXF1aXJlIiwibG9nIiwiUHJvbWlzZSIsIm1vbWVudCIsIkJhc2VDb250cm9sbGVyIiwiam9pbiIsIl9fZGlybmFtZSIsIkFwcENvbmZpZyIsIlN5bmNTZXJ2aWNlIiwiVEFHIiwiU3luY0NvbnRyb2xsZXIiLCJbb2JqZWN0IE9iamVjdF0iLCJpbml0RGF0YSIsInN1cGVyIiwic3luY1NlcnZpY2UiLCJ0aGlzIiwiZ2V0RGIiLCJzZXF1ZWxpemUiLCJtb2RlbHMiLCJhZGRJbnRlcmNlcHRvciIsInJlcSIsInJlcyIsIm5leHQiLCJ2ZXJib3NlIiwicm91dGVHZXQiLCJDTE9VRF9TRVJWRVIiLCJzdGF0dXMiLCJzZW5kIiwicmVuZGVyIiwiZ2V0U3luY0hpc3RvcmllcyIsInRoZW4iLCJyZXNwIiwianNvbiIsImNhdGNoIiwicm91dGVQb3N0IiwiaXNTZXJ2ZXJSZWFkeVRvU3luYyIsInN0YXJ0VGltZSIsInR6IiwiZGF0YSIsImxhc3RTeW5jIiwidXRjIiwiZm9ybWF0IiwiZW5kVGltZSIsImZpbmRBbGxVc2VyIiwidXNlcnMiLCJtYXAiLCJ1c2VyIiwiZmluZEFuYWx5dGljcyIsImlkIiwiZmluZFN1Ym1pdHRlZEdlbmVyYXRlZEV4ZXJjaXNlcyIsImZpbmRTdWJtaXR0ZWRHZW5lcmF0ZWRUb3BpY0V4ZXJjaXNlcyIsImZpbmRXYXRjaGVkVmlkZW9zIiwic3ByZWFkIiwicmVzcEFuYWx5dGljcyIsInJlc3BTdWJtaXR0ZWRHZW5lcmF0ZWRFeGVyY2lzZXMiLCJyZXNwU3VibWl0dGVkR2VuZXJhdGVkVG9waWNFeGVyY2lzZXMiLCJyZXNwV2F0Y2hlZFZpZGVvcyIsImFuYWx5dGljcyIsInN1Ym1pdHRlZEdlbmVyYXRlZEV4ZXJjaXNlcyIsInN1Ym1pdHRlZEdlbmVyYXRlZFRvcGljRXhlcmNpc2VzIiwid2F0Y2hlZFZpZGVvcyIsInVzZXJzRGF0YSIsIkpTT04iLCJzdHJpbmdpZnkiLCJzZW5kRGF0YSIsImVyciIsIl9yb3V0ZXIiLCJtb2R1bGUiLCJleHBvcnRzIl0sIm1hcHBpbmdzIjoiQUFBQSxNQUFNQSxLQUFPQyxRQUFRLFFBRWZDLElBQU1ELFFBQVEsVUFDZEUsUUFBVUYsUUFBUSxZQUNsQkcsT0FBU0gsUUFBUSxtQkFFakJJLGVBQWlCSixRQUFRRCxLQUFLTSxLQUFLQyxVQUFXLG9CQUU5Q0MsVUFBWVAsUUFBUUQsS0FBS00sS0FBS0MsVUFBVyxxQkFDL0MsSUFBSUUsWUFBY1IsUUFBUUQsS0FBS00sS0FBS0MsVUFBVyx1Q0FFL0MsTUFBTUcsSUFBTSx1QkFPWkMsdUJBQTZCTixlQUMzQk8sWUFBYUMsR0FDWEMsTUFBTUQsR0FDTixNQUFNRSxFQUFjLElBQUlOLFlBQVlPLEtBQUtDLFFBQVFDLFVBQVdGLEtBQUtDLFFBQVFFLFFBRXpFSCxLQUFLSSxlQUFlLENBQUNDLEVBQUtDLEVBQUtDLEtBQzdCckIsSUFBSXNCLFFBQVFkLElBQUssNEJBQThCVyxFQUFJckIsTUFDbkR1QixNQUdGUCxLQUFLUyxTQUFTLG1CQUFvQixDQUFDSixFQUFLQyxFQUFLQyxLQUN2Q2YsVUFBVWtCLGFBQ1pKLEVBQUlLLE9BQU8sS0FBS0MsS0FBSyxtREFFckJOLEVBQUlPLE9BQU8scUJBSWZiLEtBQUtTLFNBQVMsNkJBQStCLENBQUNKLEVBQUtDLEVBQUtDLEtBQ3REUixFQUFZZSxtQkFBbUJDLEtBQUtDLElBQ2xDVixFQUFJVyxLQUFLRCxLQUNSRSxNQUFNWCxLQXlCWFAsS0FBS21CLFVBQVUseUJBQTBCLENBQUNkLEVBQUtDLEVBQUtDLEtBQ2xEckIsSUFBSXNCLFFBQVFkLElBQUssa0NBQ2pCSyxFQUFZcUIsc0JBQXNCTCxLQUFLQyxJQUNyQyxHQUFJQSxFQUFLTCxPQUFRLENBTWYsTUFBTVUsRUFBWWpDLE9BQU9rQyxHQUFHTixFQUFLTyxLQUFLQyxTQUFVLGdCQUFnQkMsTUFBTUMsT0FBTyx1QkFDdkVDLEVBQVV2QyxPQUFPcUMsTUFBTUMsT0FBTyx1QkFHcEMsT0FGQXhDLElBQUlzQixRQUFRZCxJQUFLLHlDQUEyQzJCLEdBQzVEbkMsSUFBSXNCLFFBQVFkLElBQUssdUNBQXlDaUMsR0FDbkQ1QixFQUFZNkIsY0FBY2IsS0FBS0MsSUFDcEMsR0FBSUEsRUFBS0wsT0FBUSxDQUNmLE1BQU1rQixFQUFRYixFQUFLTyxLQUNuQixPQUFPcEMsUUFBUTJDLElBQUlELEVBQU9FLEdBQ2pCNUMsUUFBUUcsS0FDYlMsRUFBWWlDLGNBQWNELEVBQUtFLEdBQUlaLEVBQVdNLEdBQzlDNUIsRUFBWW1DLGdDQUFnQ0gsRUFBS0UsR0FBSVosRUFBV00sR0FDaEU1QixFQUFZb0MscUNBQXFDSixFQUFLRSxHQUFJWixFQUFXTSxHQUNyRTVCLEVBQVlxQyxrQkFBa0JMLEVBQUtFLEdBQUlaLEVBQVdNLElBQ2xEVSxPQUFPLENBQUNDLEVBQWVDLEVBQWlDQyxFQUFzQ0MsTUFFNUZWLEtBQUFBLEVBQ0FXLFVBQVdKLEVBQWMzQixPQUFTMkIsRUFBY2YsUUFDaERvQiw0QkFBNkJKLEVBQWdDNUIsT0FBUzRCLEVBQWdDaEIsUUFDdEdxQixpQ0FBbUNKLEVBQXFDN0IsT0FBUzZCLEVBQXFDakIsUUFDdEhzQixjQUFlSixFQUFrQjlCLE9BQVM4QixFQUFrQmxCLFlBRy9EUixLQUFLK0IsSUFDTjVELElBQUlzQixRQUFRZCxJQUFLLHVDQUF5Q3FELEtBQUtDLFVBQVVGLElBQ2xFL0MsRUFBWWtELFNBQVNILEVBQVduQixHQUFTWixLQUFLQyxJQUNuRFYsRUFBSVcsS0FBS0QsT0FJYlYsRUFBSVcsS0FBS0QsS0FJYlYsRUFBSVcsS0FBS0QsS0FFVkUsTUFBTWdDLElBQ1AzQyxFQUFLMkMsT0FLWHRELFlBQ0UsT0FBT0ksS0FBS21ELFNBSWhCQyxPQUFPQyxRQUFVMUQiLCJmaWxlIjoiY21zL2NvbnRyb2xsZXJzL3N5bmMtY29udHJvbGxlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJylcblxuY29uc3QgbG9nID0gcmVxdWlyZSgnbnBtbG9nJylcbmNvbnN0IFByb21pc2UgPSByZXF1aXJlKCdibHVlYmlyZCcpXG5jb25zdCBtb21lbnQgPSByZXF1aXJlKCdtb21lbnQtdGltZXpvbmUnKVxuXG5jb25zdCBCYXNlQ29udHJvbGxlciA9IHJlcXVpcmUocGF0aC5qb2luKF9fZGlybmFtZSwgJ2Jhc2UtY29udHJvbGxlcicpKVxuXG5jb25zdCBBcHBDb25maWcgPSByZXF1aXJlKHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi9hcHAtY29uZmlnJykpXG52YXIgU3luY1NlcnZpY2UgPSByZXF1aXJlKHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi9zZXJ2aWNlcy9zeW5jLWNsaWVudC1zZXJ2aWNlJykpXG5cbmNvbnN0IFRBRyA9ICdTeW5jQ29udHJvbGxlcidcblxuLyogXG5UT0RPOlxuMS4gU2luY2Ugc2VxdWVsaXplIGRhdGUgY29udmVyc2lvbiBzdWNrcywgd2Ugc2hvdWxkIHJlYWxseSB1c2UgcmF3IHF1ZXJ5IHRvIHJldHJpZXZlXG4yLiBcbiAqL1xuY2xhc3MgU3luY0NvbnRyb2xsZXIgZXh0ZW5kcyBCYXNlQ29udHJvbGxlciB7XG4gIGNvbnN0cnVjdG9yIChpbml0RGF0YSkge1xuICAgIHN1cGVyKGluaXREYXRhKVxuICAgIGNvbnN0IHN5bmNTZXJ2aWNlID0gbmV3IFN5bmNTZXJ2aWNlKHRoaXMuZ2V0RGIoKS5zZXF1ZWxpemUsIHRoaXMuZ2V0RGIoKS5tb2RlbHMpXG5cbiAgICB0aGlzLmFkZEludGVyY2VwdG9yKChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgICAgbG9nLnZlcmJvc2UoVEFHLCAnU3luY0NvbnRyb2xsZXI6IHJlcS5wYXRoPScgKyByZXEucGF0aClcbiAgICAgIG5leHQoKVxuICAgIH0pXG5cbiAgICB0aGlzLnJvdXRlR2V0KCcvc3luY2hyb25pemF0aW9uJywgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgICBpZiAoQXBwQ29uZmlnLkNMT1VEX1NFUlZFUikge1xuICAgICAgICByZXMuc3RhdHVzKDQwMykuc2VuZCgnVGhpcyBwYWdlIGNhbiBvbmx5IGJlIGFjY2Vzc2VkIGJ5IGxvY2FsIHNlcnZlciEnKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzLnJlbmRlcignc3luYy1tYW5hZ2VtZW50JylcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgdGhpcy5yb3V0ZUdldCgnL3N5bmNocm9uaXphdGlvbi9oaXN0b3JpZXMnICwgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgICBzeW5jU2VydmljZS5nZXRTeW5jSGlzdG9yaWVzKCkudGhlbihyZXNwID0+IHtcbiAgICAgICAgcmVzLmpzb24ocmVzcClcbiAgICAgIH0pLmNhdGNoKG5leHQpXG4gICAgfSlcblxuICAgIC8qXG4gICAgICBUaGlzIGlzIGNsaWVudCBzaWRlIG9mIHRoZSBzeW5jaHJvbml6YXRpb24gbWVjaGFuaXNtLiBUaGlzIHBhdGggaXMgY2FsbGVkIG9uIHRoZSBjbGllbnQgc2lkZVxuXG4gICAgICAxLiBHZXQgc2Nob29sIGluZm9ybWF0aW9uIGZyb20gQXBwQ29uZmlnLkxPQ0FMX1NDSE9PTF9JTkZPUk1BVElPTi5pZGVudGlmaWVyXG4gICAgICAyLiBHZXQgYWxsIHVzZXJzIGZyb20gdGhhdCBzY2hvb2xcbiAgICAgIDMuIEdldCBzeW5jIGhpc3RvcnkgZnJvbSBzeW5jaHJvbml6YXRpb25IaXN0b3JpZXMgdGFibGUuXG4gICAgICAzLiBHZXQgYW5hbHl0aWNzLCBzdWJtaXR0ZWRHZW5lcmF0ZWRFeGVyY2lzZXMsIGFuZCBzdWJtaXR0ZWRHZW5lcmF0ZWRUb3BpY0V4ZXJjaXNlcyBmb3IgYWxsIG9mIHRob3NlIHVzZXJzLFxuICAgICAgICAgb25seSB0aG9zZSB3aG9zZSB1cGRhdGVkQXQgaXMgbGFyZ2VyIHRoYW4gbGFzdCBzeW5jaHJvbml6YXRpb24gdGltZVxuICAgICAgNC4gU2VuZCB0aGVtIHRvIHRoZSBzZXJ2ZXJcbiAgICAgIDUuIElmIHNlcnZlciBzdWNlZWRzLCB1cGRhdGUgc3luY2hyb25pemF0aW9uSGlzdG9yaWVzIHRhYmxlIHNvIHRoYXQgd2UgZG9uJ3QgaGF2ZSB0byByZS1zeW5jIHdoYXQncyBhbHJlYWR5IHNlbnQuXG5cbiAgICAgIEZvcm1hdCBvZiBkYXRhIHNlbmQgdG8gc2VydmVyO1xuICAgICAgZGF0YTogW1xuICAgICAgICB7XG4gICAgICAgICAgdXNlcjogLi4uXG4gICAgICAgICAgYW5hbHl0aWNzOiBbLi4uXSxcbiAgICAgICAgICBzdWJtaXR0ZWRHZW5lcmF0ZWRFeGVyY2lzZXM6IFsuLi5dLFxuICAgICAgICAgIHN1Ym1pdHRlZEdlbmVyYXRlZFRvcGljRXhlcmNpc2VzOiBbLi4uXSxcbiAgICAgICAgICB3YXRjaGVkVmlkZW9zOiBbLi4uXVxuICAgICAgICB9XG4gICAgICBdXG4gICAgKi9cbiAgICB0aGlzLnJvdXRlUG9zdCgnL3N5bmNocm9uaXphdGlvbi9zdGFydCcsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgICAgbG9nLnZlcmJvc2UoVEFHLCBgc3luY0NvbnRyb2xsZXI6R0VUKCk6IEhPTUVQQUdFYClcbiAgICAgIHN5bmNTZXJ2aWNlLmlzU2VydmVyUmVhZHlUb1N5bmMoKS50aGVuKHJlc3AgPT4ge1xuICAgICAgICBpZiAocmVzcC5zdGF0dXMpIHtcbiAgICAgICAgICAvLyBTeW5jIG9ubHkgZGF0YSBuZXdlciB0aGFuIGxhc3Qgc3luY2VkXG5cbiAgICAgICAgICAvLyBUaGlzIGlzIHRoZSBxdWlya3Mgb2YgU2VxdWVsaXplIGFuZCBOQ2xvdWQtU2VydmVyLlxuICAgICAgICAgIC8vIFdoZW4gd2UgcmVhZCBmcm9tIHRoZSBkYXRhYmFzZSwgdGhlIGRhdGUgaXMgZXhwZWN0ZWQgdG8gYmUgVVRDIGFzIGl0J3MgZ29pbmcgdG8gYmUgY29udmVydGVkIGJ5IFNlcXVlbGl6ZVxuICAgICAgICAgIC8vIHRvIGRlZmluZWQgdGltZXpvbmUsIHdoaWNoIGlzIEdNVCArIDdcbiAgICAgICAgICBjb25zdCBzdGFydFRpbWUgPSBtb21lbnQudHoocmVzcC5kYXRhLmxhc3RTeW5jLCBcIkFzaWEvSmFrYXJ0YVwiKS51dGMoKS5mb3JtYXQoJ1lZWVktTU0tREQgSEg6bW06c3MnKVxuICAgICAgICAgIGNvbnN0IGVuZFRpbWUgPSBtb21lbnQudXRjKCkuZm9ybWF0KCdZWVlZLU1NLUREIEhIOm1tOnNzJylcbiAgICAgICAgICBsb2cudmVyYm9zZShUQUcsICdzeW5jaHJvbml6YXRpb24vc3RhcnQuUE9TVDogc3RhcnRUaW1lPScgKyBzdGFydFRpbWUpXG4gICAgICAgICAgbG9nLnZlcmJvc2UoVEFHLCAnc3luY2hyb25pemF0aW9uL3N0YXJ0LlBPU1Q6IGVuZFRpbWU9JyArIGVuZFRpbWUpXG4gICAgICAgICAgcmV0dXJuIHN5bmNTZXJ2aWNlLmZpbmRBbGxVc2VyKCkudGhlbihyZXNwID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwLnN0YXR1cykge1xuICAgICAgICAgICAgICBjb25zdCB1c2VycyA9IHJlc3AuZGF0YVxuICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5tYXAodXNlcnMsIHVzZXIgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLmpvaW4oXG4gICAgICAgICAgICAgICAgICBzeW5jU2VydmljZS5maW5kQW5hbHl0aWNzKHVzZXIuaWQsIHN0YXJ0VGltZSwgZW5kVGltZSksXG4gICAgICAgICAgICAgICAgICBzeW5jU2VydmljZS5maW5kU3VibWl0dGVkR2VuZXJhdGVkRXhlcmNpc2VzKHVzZXIuaWQsIHN0YXJ0VGltZSwgZW5kVGltZSksXG4gICAgICAgICAgICAgICAgICBzeW5jU2VydmljZS5maW5kU3VibWl0dGVkR2VuZXJhdGVkVG9waWNFeGVyY2lzZXModXNlci5pZCwgc3RhcnRUaW1lLCBlbmRUaW1lKSxcbiAgICAgICAgICAgICAgICAgIHN5bmNTZXJ2aWNlLmZpbmRXYXRjaGVkVmlkZW9zKHVzZXIuaWQsIHN0YXJ0VGltZSwgZW5kVGltZSlcbiAgICAgICAgICAgICAgICApLnNwcmVhZCgocmVzcEFuYWx5dGljcywgcmVzcFN1Ym1pdHRlZEdlbmVyYXRlZEV4ZXJjaXNlcywgcmVzcFN1Ym1pdHRlZEdlbmVyYXRlZFRvcGljRXhlcmNpc2VzLCByZXNwV2F0Y2hlZFZpZGVvcykgPT4ge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdXNlcixcbiAgICAgICAgICAgICAgICAgICAgYW5hbHl0aWNzOiByZXNwQW5hbHl0aWNzLnN0YXR1cyA/IHJlc3BBbmFseXRpY3MuZGF0YSA6IFtdLFxuICAgICAgICAgICAgICAgICAgICBzdWJtaXR0ZWRHZW5lcmF0ZWRFeGVyY2lzZXM6IHJlc3BTdWJtaXR0ZWRHZW5lcmF0ZWRFeGVyY2lzZXMuc3RhdHVzID8gcmVzcFN1Ym1pdHRlZEdlbmVyYXRlZEV4ZXJjaXNlcy5kYXRhIDogW10sXG4gICAgICAgICAgICAgICAgICAgIHN1Ym1pdHRlZEdlbmVyYXRlZFRvcGljRXhlcmNpc2VzOiAgcmVzcFN1Ym1pdHRlZEdlbmVyYXRlZFRvcGljRXhlcmNpc2VzLnN0YXR1cyA/IHJlc3BTdWJtaXR0ZWRHZW5lcmF0ZWRUb3BpY0V4ZXJjaXNlcy5kYXRhIDogW10sXG4gICAgICAgICAgICAgICAgICAgIHdhdGNoZWRWaWRlb3M6IHJlc3BXYXRjaGVkVmlkZW9zLnN0YXR1cyA/IHJlc3BXYXRjaGVkVmlkZW9zLmRhdGEgOiBbXVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgIH0pLnRoZW4odXNlcnNEYXRhID0+IHtcbiAgICAgICAgICAgICAgICBsb2cudmVyYm9zZShUQUcsICdzeW5jQ29udHJvbGxlci5HRVQoKTogcHJvY2Vzc2VkRGF0YT0nICsgSlNPTi5zdHJpbmdpZnkodXNlcnNEYXRhKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gc3luY1NlcnZpY2Uuc2VuZERhdGEodXNlcnNEYXRhLCBlbmRUaW1lKS50aGVuKHJlc3AgPT4ge1xuICAgICAgICAgICAgICAgICAgcmVzLmpzb24ocmVzcClcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzLmpzb24ocmVzcClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlcy5qc29uKHJlc3ApXG4gICAgICAgIH1cbiAgICAgIH0pLmNhdGNoKGVyciA9PiB7XG4gICAgICAgIG5leHQoZXJyKVxuICAgICAgfSlcbiAgICB9KVxuICB9XG5cbiAgZ2V0Um91dGVyICgpIHtcbiAgICByZXR1cm4gdGhpcy5fcm91dGVyXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTeW5jQ29udHJvbGxlclxuIl19
