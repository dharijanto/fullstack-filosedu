const path=require("path");var Sequelize=require("sequelize");const Promise=require("bluebird"),moment=require("moment-timezone"),AppConfig=require(path.join(__dirname,"../app-config")),CRUDService=require(path.join(__dirname,"crud-service")),TAG="StudentMonitorService";class StudentMonitorService extends CRUDService{getStats(e,s,i){const t=`\nSELECT\n  users.id AS userId, users.fullName AS name, users.username as username,\n  IFNULL(summarizedGeneratedExercises.submissions, '-') as submissions,\n  IFNULL(summarizedGeneratedExercises.avgScore, '-') as avgScore,\n  IFNULL(summarizedGeneratedExercises.avgTimeliness, '-') as avgTimeliness,\n  lastSubtopic.subtopic as lastSubtopic,\n  lastSubtopic.topic as lastTopic\nFROM\n  (SELECT users.id as id, users.username as username, users.fullName as fullName\n    FROM users\n    INNER JOIN schools ON users.schoolId = schools.id\n    WHERE schools.id = "${e}"\n  ) AS users\nLEFT OUTER JOIN\n  (SELECT\n      userId,\n      COUNT(*) AS submissions,\n      ROUND(AVG(generatedExercises.score), 2) AS avgScore,\n      ROUND(AVG(generatedExercises.timeFinish/generatedExercises.idealTime*100.0), 2) AS avgTimeliness\n    FROM generatedExercises\n    WHERE idealTime > 0 AND submitted = TRUE AND timeFinish < 3600 ${s}\n    GROUP BY userId\n  ) AS summarizedGeneratedExercises ON summarizedGeneratedExercises.userId = users.id\n# lastGeneratedExercises\nLEFT OUTER JOIN\n  (SELECT generatedExercises.userId as userId, MAX(generatedExercises.id) as id\n    FROM generatedExercises\n    WHERE submitted = true\n    GROUP BY generatedExercises.userId\n  ) AS lastGeneratedExercises ON lastGeneratedExercises.userId = users.id\n# Map generatedExercise to subtopic\nLEFT OUTER JOIN\n  (SELECT generatedExercises.id as exerciseId, subtopics.subtopic as subtopic, topics.topic as topic\n    FROM exercises\n    INNER JOIN generatedExercises on generatedExercises.exerciseId = exercises.id\n    INNER JOIN subtopics ON exercises.subtopicId = subtopics.id\n    INNER JOIN topics ON subtopics.topicId = topics.id) AS lastSubtopic ON lastGeneratedExercises.id = lastSubtopic.exerciseId\n${i?"":"WHERE submissions > 0"}\nORDER BY summarizedGeneratedExercises.avgTimeliness DESC\n;\n`;return this._sequelize.query(t,{type:Sequelize.QueryTypes.SELECT}).then(e=>({status:!0,data:e}))}getLastHourStats(e,s){console.log("showAllStudents="+s);const i=moment.utc().subtract(1,"hour").format("YYYY-MM-DD HH:mm:ss");return this.getStats(e,`AND updatedAt >= "${i}"`,s)}getLastNSubmissions(e,s=10){const i=`\nSELECT users.id AS userId, users.fullName AS fullName,\n  ROUND(lastGeneratedExercises.timeFinish / lastGeneratedExercises.idealTime * 100.0, 2) AS timeliness,\n  lastGeneratedExercises.idealTime as idealTime,\n  lastGeneratedExercises.timeFinish as timeFinish,\n  lastGeneratedExercises.score AS score,\n  lastGeneratedExercises.updatedAt AS updatedAt,\n  topics.topic AS topic,\n  subtopics.subtopic AS subtopic\nFROM\n  (SELECT * FROM generatedExercises WHERE userId = ${e} AND submitted = TRUE ORDER BY updatedAt DESC LIMIT ${s}) AS lastGeneratedExercises\n  INNER JOIN users ON lastGeneratedExercises.userId = users.id\n  INNER JOIN exercises ON lastGeneratedExercises.exerciseId = exercises.id\n  INNER JOIN subtopics ON exercises.subtopicId = subtopics.id\n  INNER JOIN topics ON subtopics.topicId = topics.id\n`;return this._sequelize.query(i,{type:Sequelize.QueryTypes.SELECT}).then(e=>({status:!0,data:e}))}}module.exports=StudentMonitorService;
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9zZXJ2aWNlcy9zdHVkZW50LW1vbml0b3Itc2VydmljZS5qcyJdLCJuYW1lcyI6WyJwYXRoIiwicmVxdWlyZSIsIlNlcXVlbGl6ZSIsIlByb21pc2UiLCJtb21lbnQiLCJBcHBDb25maWciLCJqb2luIiwiX19kaXJuYW1lIiwiQ1JVRFNlcnZpY2UiLCJUQUciLCJTdHVkZW50TW9uaXRvclNlcnZpY2UiLCJbb2JqZWN0IE9iamVjdF0iLCJzY2hvb2xJZCIsImdlbmVyYXRlZEV4ZXJjaXNlc1doZXJlQ2xhdXNlIiwic2hvd0FsbFN0dWRlbnRzIiwicXVlcnkiLCJ0aGlzIiwiX3NlcXVlbGl6ZSIsInR5cGUiLCJRdWVyeVR5cGVzIiwiU0VMRUNUIiwidGhlbiIsInJlc3AiLCJzdGF0dXMiLCJkYXRhIiwiY29uc29sZSIsImxvZyIsInBhc3QiLCJ1dGMiLCJzdWJ0cmFjdCIsImZvcm1hdCIsImdldFN0YXRzIiwidXNlcklkIiwiTiIsIm1vZHVsZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiJBQUFBLE1BQU1BLEtBQU9DLFFBQVEsUUFFckIsSUFBSUMsVUFBWUQsUUFBUSxhQUN4QixNQUFNRSxRQUFVRixRQUFRLFlBQ2xCRyxPQUFTSCxRQUFRLG1CQUVqQkksVUFBWUosUUFBUUQsS0FBS00sS0FBS0MsVUFBVyxrQkFDekNDLFlBQWNQLFFBQVFELEtBQUtNLEtBQUtDLFVBQVcsaUJBRTNDRSxJQUFNLDhCQUVaQyw4QkFBb0NGLFlBQ2xDRyxTQUFVQyxFQUFVQyxFQUErQkMsR0FDckQsTUFBTUMsdWpCQVlvQkgsb1dBUzJDQyw4MUJBaUJuRUMsRUFBa0IsR0FBSyx5RkFJckIsT0FBT0UsS0FBS0MsV0FBV0YsTUFBTUEsR0FBU0csS0FBTWhCLFVBQVVpQixXQUFXQyxTQUFVQyxLQUFLQyxLQUN0RUMsUUFBUSxFQUFNQyxLQUFNRixLQUtoQ1gsaUJBQWtCQyxFQUFVRSxHQUMxQlcsUUFBUUMsSUFBSSxtQkFBcUJaLEdBQ2pDLE1BQU1hLEVBQU92QixPQUFPd0IsTUFBTUMsU0FBUyxFQUFHLFFBQVFDLE9BQU8sdUJBQ3JELE9BQU9kLEtBQUtlLFNBQVNuQix1QkFBK0JlLEtBQVNiLEdBRy9ESCxvQkFBb0JxQixFQUFRQyxFQUFJLElBQzlCLE1BQU1sQiwrZEFVMkNpQix3REFBNkRDLGtTQU85RyxPQUFPakIsS0FBS0MsV0FBV0YsTUFBTUEsR0FBU0csS0FBTWhCLFVBQVVpQixXQUFXQyxTQUFVQyxLQUFLQyxLQUNwRUMsUUFBUSxFQUFNQyxLQUFNRixNQU1wQ1ksT0FBT0MsUUFBVXpCIiwiZmlsZSI6InNlcnZpY2VzL3N0dWRlbnQtbW9uaXRvci1zZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKVxuXG52YXIgU2VxdWVsaXplID0gcmVxdWlyZSgnc2VxdWVsaXplJylcbmNvbnN0IFByb21pc2UgPSByZXF1aXJlKCdibHVlYmlyZCcpXG5jb25zdCBtb21lbnQgPSByZXF1aXJlKCdtb21lbnQtdGltZXpvbmUnKVxuXG5jb25zdCBBcHBDb25maWcgPSByZXF1aXJlKHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9hcHAtY29uZmlnJykpXG5jb25zdCBDUlVEU2VydmljZSA9IHJlcXVpcmUocGF0aC5qb2luKF9fZGlybmFtZSwgJ2NydWQtc2VydmljZScpKVxuXG5jb25zdCBUQUcgPSAnU3R1ZGVudE1vbml0b3JTZXJ2aWNlJ1xuXG5jbGFzcyBTdHVkZW50TW9uaXRvclNlcnZpY2UgZXh0ZW5kcyBDUlVEU2VydmljZSB7XG4gIGdldFN0YXRzIChzY2hvb2xJZCwgZ2VuZXJhdGVkRXhlcmNpc2VzV2hlcmVDbGF1c2UsIHNob3dBbGxTdHVkZW50cykge1xuY29uc3QgcXVlcnkgPSBgXG5TRUxFQ1RcbiAgdXNlcnMuaWQgQVMgdXNlcklkLCB1c2Vycy5mdWxsTmFtZSBBUyBuYW1lLCB1c2Vycy51c2VybmFtZSBhcyB1c2VybmFtZSxcbiAgSUZOVUxMKHN1bW1hcml6ZWRHZW5lcmF0ZWRFeGVyY2lzZXMuc3VibWlzc2lvbnMsICctJykgYXMgc3VibWlzc2lvbnMsXG4gIElGTlVMTChzdW1tYXJpemVkR2VuZXJhdGVkRXhlcmNpc2VzLmF2Z1Njb3JlLCAnLScpIGFzIGF2Z1Njb3JlLFxuICBJRk5VTEwoc3VtbWFyaXplZEdlbmVyYXRlZEV4ZXJjaXNlcy5hdmdUaW1lbGluZXNzLCAnLScpIGFzIGF2Z1RpbWVsaW5lc3MsXG4gIGxhc3RTdWJ0b3BpYy5zdWJ0b3BpYyBhcyBsYXN0U3VidG9waWMsXG4gIGxhc3RTdWJ0b3BpYy50b3BpYyBhcyBsYXN0VG9waWNcbkZST01cbiAgKFNFTEVDVCB1c2Vycy5pZCBhcyBpZCwgdXNlcnMudXNlcm5hbWUgYXMgdXNlcm5hbWUsIHVzZXJzLmZ1bGxOYW1lIGFzIGZ1bGxOYW1lXG4gICAgRlJPTSB1c2Vyc1xuICAgIElOTkVSIEpPSU4gc2Nob29scyBPTiB1c2Vycy5zY2hvb2xJZCA9IHNjaG9vbHMuaWRcbiAgICBXSEVSRSBzY2hvb2xzLmlkID0gXCIke3NjaG9vbElkfVwiXG4gICkgQVMgdXNlcnNcbkxFRlQgT1VURVIgSk9JTlxuICAoU0VMRUNUXG4gICAgICB1c2VySWQsXG4gICAgICBDT1VOVCgqKSBBUyBzdWJtaXNzaW9ucyxcbiAgICAgIFJPVU5EKEFWRyhnZW5lcmF0ZWRFeGVyY2lzZXMuc2NvcmUpLCAyKSBBUyBhdmdTY29yZSxcbiAgICAgIFJPVU5EKEFWRyhnZW5lcmF0ZWRFeGVyY2lzZXMudGltZUZpbmlzaC9nZW5lcmF0ZWRFeGVyY2lzZXMuaWRlYWxUaW1lKjEwMC4wKSwgMikgQVMgYXZnVGltZWxpbmVzc1xuICAgIEZST00gZ2VuZXJhdGVkRXhlcmNpc2VzXG4gICAgV0hFUkUgaWRlYWxUaW1lID4gMCBBTkQgc3VibWl0dGVkID0gVFJVRSBBTkQgdGltZUZpbmlzaCA8IDM2MDAgJHtnZW5lcmF0ZWRFeGVyY2lzZXNXaGVyZUNsYXVzZX1cbiAgICBHUk9VUCBCWSB1c2VySWRcbiAgKSBBUyBzdW1tYXJpemVkR2VuZXJhdGVkRXhlcmNpc2VzIE9OIHN1bW1hcml6ZWRHZW5lcmF0ZWRFeGVyY2lzZXMudXNlcklkID0gdXNlcnMuaWRcbiMgbGFzdEdlbmVyYXRlZEV4ZXJjaXNlc1xuTEVGVCBPVVRFUiBKT0lOXG4gIChTRUxFQ1QgZ2VuZXJhdGVkRXhlcmNpc2VzLnVzZXJJZCBhcyB1c2VySWQsIE1BWChnZW5lcmF0ZWRFeGVyY2lzZXMuaWQpIGFzIGlkXG4gICAgRlJPTSBnZW5lcmF0ZWRFeGVyY2lzZXNcbiAgICBXSEVSRSBzdWJtaXR0ZWQgPSB0cnVlXG4gICAgR1JPVVAgQlkgZ2VuZXJhdGVkRXhlcmNpc2VzLnVzZXJJZFxuICApIEFTIGxhc3RHZW5lcmF0ZWRFeGVyY2lzZXMgT04gbGFzdEdlbmVyYXRlZEV4ZXJjaXNlcy51c2VySWQgPSB1c2Vycy5pZFxuIyBNYXAgZ2VuZXJhdGVkRXhlcmNpc2UgdG8gc3VidG9waWNcbkxFRlQgT1VURVIgSk9JTlxuICAoU0VMRUNUIGdlbmVyYXRlZEV4ZXJjaXNlcy5pZCBhcyBleGVyY2lzZUlkLCBzdWJ0b3BpY3Muc3VidG9waWMgYXMgc3VidG9waWMsIHRvcGljcy50b3BpYyBhcyB0b3BpY1xuICAgIEZST00gZXhlcmNpc2VzXG4gICAgSU5ORVIgSk9JTiBnZW5lcmF0ZWRFeGVyY2lzZXMgb24gZ2VuZXJhdGVkRXhlcmNpc2VzLmV4ZXJjaXNlSWQgPSBleGVyY2lzZXMuaWRcbiAgICBJTk5FUiBKT0lOIHN1YnRvcGljcyBPTiBleGVyY2lzZXMuc3VidG9waWNJZCA9IHN1YnRvcGljcy5pZFxuICAgIElOTkVSIEpPSU4gdG9waWNzIE9OIHN1YnRvcGljcy50b3BpY0lkID0gdG9waWNzLmlkKSBBUyBsYXN0U3VidG9waWMgT04gbGFzdEdlbmVyYXRlZEV4ZXJjaXNlcy5pZCA9IGxhc3RTdWJ0b3BpYy5leGVyY2lzZUlkXG4ke3Nob3dBbGxTdHVkZW50cyA/ICcnIDogJ1dIRVJFIHN1Ym1pc3Npb25zID4gMCd9XG5PUkRFUiBCWSBzdW1tYXJpemVkR2VuZXJhdGVkRXhlcmNpc2VzLmF2Z1RpbWVsaW5lc3MgREVTQ1xuO1xuYFxuICAgIHJldHVybiB0aGlzLl9zZXF1ZWxpemUucXVlcnkocXVlcnksIHsgdHlwZTogU2VxdWVsaXplLlF1ZXJ5VHlwZXMuU0VMRUNUIH0pLnRoZW4ocmVzcCA9PiB7XG4gICAgICByZXR1cm4ge3N0YXR1czogdHJ1ZSwgZGF0YTogcmVzcH1cbiAgICB9KVxuICB9XG5cbiAgLy8gc2hvd0FsbFN0dWRlbnRzOiBpZiB0cnVlLCBzdHVkZW50cyB3aXRob3V0IHN1Ym1pc3Npb25zIHdpbGwgYWxzbyBiZSBkaXNwbGF5ZWRcbiAgZ2V0TGFzdEhvdXJTdGF0cyAoc2Nob29sSWQsIHNob3dBbGxTdHVkZW50cykge1xuICAgIGNvbnNvbGUubG9nKCdzaG93QWxsU3R1ZGVudHM9JyArIHNob3dBbGxTdHVkZW50cylcbiAgICBjb25zdCBwYXN0ID0gbW9tZW50LnV0YygpLnN1YnRyYWN0KDEsICdob3VyJykuZm9ybWF0KCdZWVlZLU1NLUREIEhIOm1tOnNzJylcbiAgICByZXR1cm4gdGhpcy5nZXRTdGF0cyhzY2hvb2xJZCwgYEFORCB1cGRhdGVkQXQgPj0gXCIke3Bhc3R9XCJgLCBzaG93QWxsU3R1ZGVudHMpXG4gIH1cblxuICBnZXRMYXN0TlN1Ym1pc3Npb25zKHVzZXJJZCwgTiA9IDEwKSB7XG4gICAgY29uc3QgcXVlcnkgPSBgXG5TRUxFQ1QgdXNlcnMuaWQgQVMgdXNlcklkLCB1c2Vycy5mdWxsTmFtZSBBUyBmdWxsTmFtZSxcbiAgUk9VTkQobGFzdEdlbmVyYXRlZEV4ZXJjaXNlcy50aW1lRmluaXNoIC8gbGFzdEdlbmVyYXRlZEV4ZXJjaXNlcy5pZGVhbFRpbWUgKiAxMDAuMCwgMikgQVMgdGltZWxpbmVzcyxcbiAgbGFzdEdlbmVyYXRlZEV4ZXJjaXNlcy5pZGVhbFRpbWUgYXMgaWRlYWxUaW1lLFxuICBsYXN0R2VuZXJhdGVkRXhlcmNpc2VzLnRpbWVGaW5pc2ggYXMgdGltZUZpbmlzaCxcbiAgbGFzdEdlbmVyYXRlZEV4ZXJjaXNlcy5zY29yZSBBUyBzY29yZSxcbiAgbGFzdEdlbmVyYXRlZEV4ZXJjaXNlcy51cGRhdGVkQXQgQVMgdXBkYXRlZEF0LFxuICB0b3BpY3MudG9waWMgQVMgdG9waWMsXG4gIHN1YnRvcGljcy5zdWJ0b3BpYyBBUyBzdWJ0b3BpY1xuRlJPTVxuICAoU0VMRUNUICogRlJPTSBnZW5lcmF0ZWRFeGVyY2lzZXMgV0hFUkUgdXNlcklkID0gJHt1c2VySWR9IEFORCBzdWJtaXR0ZWQgPSBUUlVFIE9SREVSIEJZIHVwZGF0ZWRBdCBERVNDIExJTUlUICR7Tn0pIEFTIGxhc3RHZW5lcmF0ZWRFeGVyY2lzZXNcbiAgSU5ORVIgSk9JTiB1c2VycyBPTiBsYXN0R2VuZXJhdGVkRXhlcmNpc2VzLnVzZXJJZCA9IHVzZXJzLmlkXG4gIElOTkVSIEpPSU4gZXhlcmNpc2VzIE9OIGxhc3RHZW5lcmF0ZWRFeGVyY2lzZXMuZXhlcmNpc2VJZCA9IGV4ZXJjaXNlcy5pZFxuICBJTk5FUiBKT0lOIHN1YnRvcGljcyBPTiBleGVyY2lzZXMuc3VidG9waWNJZCA9IHN1YnRvcGljcy5pZFxuICBJTk5FUiBKT0lOIHRvcGljcyBPTiBzdWJ0b3BpY3MudG9waWNJZCA9IHRvcGljcy5pZFxuYFxuXG4gICAgcmV0dXJuIHRoaXMuX3NlcXVlbGl6ZS5xdWVyeShxdWVyeSwgeyB0eXBlOiBTZXF1ZWxpemUuUXVlcnlUeXBlcy5TRUxFQ1QgfSkudGhlbihyZXNwID0+IHtcbiAgICAgICAgcmV0dXJuIHtzdGF0dXM6IHRydWUsIGRhdGE6IHJlc3B9XG4gICAgICB9KVxuICB9XG5cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTdHVkZW50TW9uaXRvclNlcnZpY2UiXX0=
