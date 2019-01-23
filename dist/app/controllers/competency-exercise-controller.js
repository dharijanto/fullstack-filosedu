"use strict";Object.defineProperty(exports,"__esModule",{value:!0});const Promise=require("bluebird"),competency_exercise_service_1=require("../../services/competency-exercise-service");let path=require("path"),moment=require("moment-timezone"),log=require("npmlog"),AnalyticsService=require(path.join(__dirname,"../../services/analytics-service")),BaseController=require(path.join(__dirname,"base-controller")),PassportHelper=require(path.join(__dirname,"../utils/passport-helper")),PathFormatter=require(path.join(__dirname,"../../lib/path-formatter")),Formatter=require(path.join(__dirname,"../../lib/utils/formatter")),Utils=require(path.join(__dirname,"../utils/utils"));const TAG="ExerciseController";class CompetencyExerciseController extends BaseController{initialize(){return Promise.join(PathFormatter.hashAsset("app","/assets/js/competency-exercise-logistic-app-bundle.js"),PathFormatter.hashAsset("app","/assets/js/competency-exercise-app-bundle.js")).spread((e,s)=>{this.competencyExerciseLogiscticJS=e,this.competencyExerciseJS=s})}constructor(e){super(e);new AnalyticsService(this.getDb().sequelize,this.getDb().models);this.addInterceptor((e,s,t)=>{t()}),this.routePost("/exercise-code",(e,s,t)=>{const r=e.body.code;competency_exercise_service_1.default.submitExerciseCode(r).then(e=>{s.json(e),e.status}).catch(e=>{log.error(TAG,e),s.json({status:!1,errMessage:e.message})})}),this.routePost("/start-topic",(e,s,t)=>{const r=e.session.competencyExerciseId||0;r?competency_exercise_service_1.default.getGeneratedExercise(r).then(e=>e.status&&e.data?competency_exercise_service_1.default.startExercise(e.data).then(e=>{e.status&&e.data?s.json({status:!0}):s.json({status:!1,errMessage:`Failed to startExercise: ${e.errMessage}`})}):s.json({status:!1,errMessage:`Failed to getGeneratedExercise: ${e.errMessage}`})).catch(t):s.json({status:!1,errMessage:"competencyExerciseId is not found! Session expired?",errCode:1})}),this.routePost("/abandon-exercise",(e,s,t)=>{const r=e.session.competencyExerciseId||0;r?competency_exercise_service_1.default.getGeneratedExercise(r).then(t=>t.status&&t.data?competency_exercise_service_1.default.abandonExercise(t.data,e.user?e.user.id:null).then(t=>{t.status?(delete e.session.competencyExerciseId,e.session.save(e=>{e?s.json({status:!1,errMessage:e.message}):s.json({status:!0})})):s.json({status:!1,errMessage:`Failed to abandonExercise: ${t.errMessage}`})}):s.json({status:!1,errMessage:`Failed to getGeneratedExercise: ${t.errMessage}`})).catch(e=>{log.error(TAG,e),s.json({status:!1,errMessage:"Failed: "+e.message})}):s.json({status:!1,errMessage:"competencyExerciseId is not found! Session expired?",errCode:1})}),this.routePost("/skip-topic",(e,s,t)=>{const r=e.session.competencyExerciseId||0;r?competency_exercise_service_1.default.getGeneratedExercise(r).then(e=>e.status&&e.data?competency_exercise_service_1.default.skipTopic(e.data).then(e=>{e.status?s.json({status:!0}):s.json({status:!1,errMessage:`Failed to abandonExercise: ${e.errMessage}`})}):s.json({status:!1,errMessage:`Failed to getGeneratedExercise: ${e.errMessage}`})):s.json({status:!1,errMessage:"competencyExerciseId is not found! Session expired?",errCode:1})}),this.routePost("/submit",(e,s,t)=>{const r=e.session.competencyExerciseId||0,{name:i,phone:c,email:o}=e.body;log.info(TAG,"/.GET: competencyExerciseId="+r),competency_exercise_service_1.default.submitExercise(r,{name:i,phone:c,email:o}).then(e=>{s.json(e)}).catch(e=>{log.error(TAG,e),s.json({status:!1,errMessage:e.message})})}),this.routeGet("/debug/finished",(e,s,t)=>{s.render("competency-exercise/finished")}),this.routeGet("/debug/submitted",(e,s,t)=>{s.render("competency-exercise/submitted")}),this.routePost("/retake-exercise",(e,s,t)=>{delete e.session.competencyExerciseId,e.session.save(e=>{e?s.json({status:!1,errMessage:`Failed to save session: ${e.message}`}):s.json({status:!0})})}),this.routeGet("/",(e,s,t)=>{const r=e.session.competencyExerciseId||0;log.info(TAG,"/.GET: competencyExerciseId="+r),competency_exercise_service_1.default.getGeneratedExercise(r).then(s=>s.status&&s.data?s.data:competency_exercise_service_1.default.generateAndSaveExercise(e.user?e.user.id:null).then(s=>{if(s.status&&s.data)return e.session.competencyExerciseId=s.data.id,s.data;throw new Error(`Failed to create generatedCompetencyExercise: ${s.errMessage}`)})).then(e=>{const t=competency_exercise_service_1.default.getExerciseState(e);if(t.status&&t.data){const r=t.data;if(console.log("Exercise state="+r),"exercising"===r)competency_exercise_service_1.default.continueExercise(e).then(e=>{if(!e.status||!e.data)throw new Error(`Failed to continue exercise: ${e.errMessage}`);{const t=e.data;s.locals.topicName=t.topicName,s.locals.formattedExercises=t.formattedExercises,s.locals.idealTime=t.idealTime,s.locals.elapsedTime=t.elapsedTime,s.locals.bundle=this.competencyExerciseJS,s.render("competency-exercise/exercising")}});else if("pendingExercise"===r)competency_exercise_service_1.default.getPendingTopicInformation(e).then(e=>{if(!e.status||!e.data)throw new Error(`Failed to getPendingTopicInformation: ${e.errMessage}`);{const t=e.data;s.locals.topicName=t.topicName,s.locals.topicNo=t.topicNo,s.locals.topicQuantity=t.topicQuantity,s.locals.questionQuantity=t.questionQuantity,s.locals.idealTime=t.idealTime,s.locals.bundle=this.competencyExerciseLogiscticJS,s.render("competency-exercise/pending")}});else if("finished"===r)s.locals.bundle=this.competencyExerciseLogiscticJS,s.render("competency-exercise/finished");else if("submitted"===r)competency_exercise_service_1.default.getSubmittedExerciseInformation(e).then(e=>{if(!e.status||!e.data)throw new Error(`Failed to get submitted exercise information: ${e.errMessage}`);console.dir(e),s.locals.topicResults=e.data,s.locals.bundle=this.competencyExerciseLogiscticJS,s.render("competency-exercise/submitted")});else{if("abandoned"!==r)throw new Error(`Unexpected state: ${r}!`);s.render("competency-exercise/abandoned")}}}).catch(e=>{t(e)})}),this.routePost("/",(e,s,t)=>{const r=e.session.competencyExerciseId;competency_exercise_service_1.default.submitTopicExercise(r,e.body.userAnswers).then(s.json.bind(s)).catch(t)})}}exports.default=CompetencyExerciseController;
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9hcHAvY29udHJvbGxlcnMvY29tcGV0ZW5jeS1leGVyY2lzZS1jb250cm9sbGVyLnRzIl0sIm5hbWVzIjpbIlByb21pc2UiLCJyZXF1aXJlIiwiY29tcGV0ZW5jeV9leGVyY2lzZV9zZXJ2aWNlXzEiLCJwYXRoIiwibW9tZW50IiwibG9nIiwiQW5hbHl0aWNzU2VydmljZSIsImpvaW4iLCJfX2Rpcm5hbWUiLCJCYXNlQ29udHJvbGxlciIsIlBhc3Nwb3J0SGVscGVyIiwiUGF0aEZvcm1hdHRlciIsIkZvcm1hdHRlciIsIlV0aWxzIiwiVEFHIiwiQ29tcGV0ZW5jeUV4ZXJjaXNlQ29udHJvbGxlciIsIltvYmplY3QgT2JqZWN0XSIsImhhc2hBc3NldCIsInNwcmVhZCIsInJlc3VsdCIsInJlc3VsdDIiLCJ0aGlzIiwiY29tcGV0ZW5jeUV4ZXJjaXNlTG9naXNjdGljSlMiLCJjb21wZXRlbmN5RXhlcmNpc2VKUyIsImluaXREYXRhIiwic3VwZXIiLCJnZXREYiIsInNlcXVlbGl6ZSIsIm1vZGVscyIsImFkZEludGVyY2VwdG9yIiwicmVxIiwicmVzIiwibmV4dCIsInJvdXRlUG9zdCIsImNvZGUiLCJib2R5IiwiZGVmYXVsdCIsInN1Ym1pdEV4ZXJjaXNlQ29kZSIsInRoZW4iLCJyZXNwIiwianNvbiIsInN0YXR1cyIsImNhdGNoIiwiZXJyIiwiZXJyb3IiLCJlcnJNZXNzYWdlIiwibWVzc2FnZSIsImNvbXBldGVuY3lFeGVyY2lzZUlkIiwic2Vzc2lvbiIsImdldEdlbmVyYXRlZEV4ZXJjaXNlIiwiZGF0YSIsInN0YXJ0RXhlcmNpc2UiLCJlcnJDb2RlIiwiYWJhbmRvbkV4ZXJjaXNlIiwidXNlciIsImlkIiwic2F2ZSIsInNraXBUb3BpYyIsIm5hbWUiLCJwaG9uZSIsImVtYWlsIiwiaW5mbyIsInN1Ym1pdEV4ZXJjaXNlIiwicm91dGVHZXQiLCJyZW5kZXIiLCJnZW5lcmF0ZUFuZFNhdmVFeGVyY2lzZSIsIkVycm9yIiwiZ2VuZXJhdGVkRXhlcmNpc2UiLCJyZXNwMiIsImdldEV4ZXJjaXNlU3RhdGUiLCJzdGF0ZSIsImNvbnNvbGUiLCJjb250aW51ZUV4ZXJjaXNlIiwiZm9ybWF0dGVkRXhlcmNpc2UiLCJsb2NhbHMiLCJ0b3BpY05hbWUiLCJmb3JtYXR0ZWRFeGVyY2lzZXMiLCJpZGVhbFRpbWUiLCJlbGFwc2VkVGltZSIsImJ1bmRsZSIsImdldFBlbmRpbmdUb3BpY0luZm9ybWF0aW9uIiwidG9waWNJbmZvcm1hdGlvbiIsInRvcGljTm8iLCJ0b3BpY1F1YW50aXR5IiwicXVlc3Rpb25RdWFudGl0eSIsImdldFN1Ym1pdHRlZEV4ZXJjaXNlSW5mb3JtYXRpb24iLCJkaXIiLCJ0b3BpY1Jlc3VsdHMiLCJzdWJtaXRUb3BpY0V4ZXJjaXNlIiwidXNlckFuc3dlcnMiLCJiaW5kIiwiZXhwb3J0cyJdLCJtYXBwaW5ncyI6Im9FQUFBLE1BQUFBLFFBQUFDLFFBQUEsWUFHQUMsOEJBQUFELFFBQUEsOENBTUEsSUFBSUUsS0FBT0YsUUFBUSxRQUVmRyxPQUFTSCxRQUFRLG1CQUVqQkksSUFBTUosUUFBUSxVQUVkSyxpQkFBbUJMLFFBQVFFLEtBQUtJLEtBQUtDLFVBQVcscUNBQ2hEQyxlQUFpQlIsUUFBUUUsS0FBS0ksS0FBS0MsVUFBVyxvQkFDOUNFLGVBQWlCVCxRQUFRRSxLQUFLSSxLQUFLQyxVQUFXLDZCQUM5Q0csY0FBZ0JWLFFBQVFFLEtBQUtJLEtBQUtDLFVBQVcsNkJBRTdDSSxVQUFZWCxRQUFRRSxLQUFLSSxLQUFLQyxVQUFXLDhCQUN6Q0ssTUFBUVosUUFBUUUsS0FBS0ksS0FBS0MsVUFBVyxtQkFFekMsTUFBTU0sSUFBTSwyQkFFWkMscUNBQTBETixlQUl4RE8sYUFDRSxPQUFPaEIsUUFBUU8sS0FDYkksY0FBY00sVUFBVSxNQUFPLHlEQUMvQk4sY0FBY00sVUFBVSxNQUFPLGlEQUMvQkMsT0FBTyxDQUFDQyxFQUFnQkMsS0FDeEJDLEtBQUtDLDhCQUFnQ0gsRUFDckNFLEtBQUtFLHFCQUF1QkgsSUFJaENKLFlBQWFRLEdBQ1hDLE1BQU1ELEdBQ21CLElBQUlsQixpQkFBaUJlLEtBQUtLLFFBQVFDLFVBQVdOLEtBQUtLLFFBQVFFLFFBQ25GUCxLQUFLUSxlQUFlLENBQUNDLEVBQUtDLEVBQUtDLEtBQzdCQSxNQUdGWCxLQUFLWSxVQUFVLGlCQUFrQixDQUFDSCxFQUFLQyxFQUFLQyxLQUMxQyxNQUFNRSxFQUFPSixFQUFJSyxLQUFLRCxLQUN0QmhDLDhCQUFBa0MsUUFBMEJDLG1CQUFtQkgsR0FBTUksS0FBS0MsSUFDdERSLEVBQUlTLEtBQUtELEdBQ0pBLEVBQUtFLFNBR1RDLE1BQU1DLElBQ1B0QyxJQUFJdUMsTUFBTTlCLElBQUs2QixHQUNmWixFQUFJUyxNQUFPQyxRQUFRLEVBQU9JLFdBQVlGLEVBQUlHLGNBSTlDekIsS0FBS1ksVUFBVSxlQUFnQixDQUFDSCxFQUFLQyxFQUFLQyxLQUN4QyxNQUFNZSxFQUF1QmpCLEVBQUlrQixRQUFRRCxzQkFBd0IsRUFDN0RBLEVBQ0Y3Qyw4QkFBQWtDLFFBQTBCYSxxQkFBcUJGLEdBQXNCVCxLQUFLQyxHQUNwRUEsRUFBS0UsUUFBVUYsRUFBS1csS0FDZmhELDhCQUFBa0MsUUFBMEJlLGNBQWNaLEVBQUtXLE1BQU1aLEtBQUtDLElBQ3pEQSxFQUFLRSxRQUFVRixFQUFLVyxLQUN0Qm5CLEVBQUlTLE1BQU9DLFFBQVEsSUFFbkJWLEVBQUlTLE1BQU9DLFFBQVEsRUFBT0ksdUNBQXdDTixFQUFLTSxpQkFJcEVkLEVBQUlTLE1BQU9DLFFBQVEsRUFBT0ksOENBQStDTixFQUFLTSxnQkFFdEZILE1BQU1WLEdBRVRELEVBQUlTLE1BQU9DLFFBQVEsRUFBT0ksV0FBWSxzREFBdURPLFFBQVMsTUFJMUcvQixLQUFLWSxVQUFVLG9CQUFxQixDQUFDSCxFQUFLQyxFQUFLQyxLQUM3QyxNQUFNZSxFQUF1QmpCLEVBQUlrQixRQUFRRCxzQkFBd0IsRUFDN0RBLEVBQ0Y3Qyw4QkFBQWtDLFFBQTBCYSxxQkFBcUJGLEdBQXNCVCxLQUFLQyxHQUNwRUEsRUFBS0UsUUFBVUYsRUFBS1csS0FDZmhELDhCQUFBa0MsUUFBMEJpQixnQkFBZ0JkLEVBQUtXLEtBQU1wQixFQUFJd0IsS0FBT3hCLEVBQUl3QixLQUFLQyxHQUFLLE1BQU1qQixLQUFLQyxJQUMxRkEsRUFBS0UsZUFFQVgsRUFBSWtCLFFBQThCLHFCQUN6Q2xCLEVBQUlrQixRQUFRUSxLQUFLYixJQUNYQSxFQUNGWixFQUFJUyxNQUFPQyxRQUFRLEVBQU9JLFdBQVlGLEVBQUlHLFVBRTFDZixFQUFJUyxNQUFPQyxRQUFRLE9BSXZCVixFQUFJUyxNQUFPQyxRQUFRLEVBQU9JLHlDQUEwQ04sRUFBS00saUJBSXRFZCxFQUFJUyxNQUFPQyxRQUFRLEVBQU9JLDhDQUErQ04sRUFBS00sZ0JBRXRGSCxNQUFNQyxJQUNQdEMsSUFBSXVDLE1BQU05QixJQUFLNkIsR0FDZlosRUFBSVMsTUFBT0MsUUFBUSxFQUFPSSxXQUFZLFdBQWFGLEVBQUlHLFlBR3pEZixFQUFJUyxNQUFPQyxRQUFRLEVBQU9JLFdBQVksc0RBQXVETyxRQUFTLE1BSTFHL0IsS0FBS1ksVUFBVSxjQUFlLENBQUNILEVBQUtDLEVBQUtDLEtBQ3ZDLE1BQU1lLEVBQXVCakIsRUFBSWtCLFFBQVFELHNCQUF3QixFQUM3REEsRUFDRjdDLDhCQUFBa0MsUUFBMEJhLHFCQUFxQkYsR0FBc0JULEtBQUtDLEdBQ3BFQSxFQUFLRSxRQUFVRixFQUFLVyxLQUNmaEQsOEJBQUFrQyxRQUEwQnFCLFVBQVVsQixFQUFLVyxNQUFNWixLQUFLQyxJQUNyREEsRUFBS0UsT0FDUFYsRUFBSVMsTUFBT0MsUUFBUSxJQUVuQlYsRUFBSVMsTUFBT0MsUUFBUSxFQUFPSSx5Q0FBMENOLEVBQUtNLGlCQUl0RWQsRUFBSVMsTUFBT0MsUUFBUSxFQUFPSSw4Q0FBK0NOLEVBQUtNLGdCQUl6RmQsRUFBSVMsTUFBT0MsUUFBUSxFQUFPSSxXQUFZLHNEQUF1RE8sUUFBUyxNQUkxRy9CLEtBQUtZLFVBQVUsVUFBVyxDQUFDSCxFQUFLQyxFQUFLQyxLQUNuQyxNQUFNZSxFQUF1QmpCLEVBQUlrQixRQUFRRCxzQkFBd0IsR0FDM0RXLEtBQUVBLEVBQUlDLE1BQUVBLEVBQUtDLE1BQUVBLEdBQVU5QixFQUFJSyxLQUNuQzlCLElBQUl3RCxLQUFLL0MsSUFBSywrQkFBaUNpQyxHQUMvQzdDLDhCQUFBa0MsUUFBMEIwQixlQUFlZixHQUF3QlcsS0FBQUEsRUFBTUMsTUFBQUEsRUFBT0MsTUFBQUEsSUFBU3RCLEtBQUtDLElBQzFGUixFQUFJUyxLQUFLRCxLQUNSRyxNQUFNQyxJQUNQdEMsSUFBSXVDLE1BQU05QixJQUFLNkIsR0FDZlosRUFBSVMsTUFBT0MsUUFBUSxFQUFPSSxXQUFZRixFQUFJRyxjQUk5Q3pCLEtBQUswQyxTQUFTLGtCQUFtQixDQUFDakMsRUFBS0MsRUFBS0MsS0FDMUNELEVBQUlpQyxPQUFPLGtDQUdiM0MsS0FBSzBDLFNBQVMsbUJBQW9CLENBQUNqQyxFQUFLQyxFQUFLQyxLQUMzQ0QsRUFBSWlDLE9BQU8sbUNBR2IzQyxLQUFLWSxVQUFVLG1CQUFvQixDQUFDSCxFQUFLQyxFQUFLQyxZQUNyQ0YsRUFBSWtCLFFBQThCLHFCQUN6Q2xCLEVBQUlrQixRQUFRUSxLQUFLYixJQUNYQSxFQUNGWixFQUFJUyxNQUFPQyxRQUFRLEVBQU9JLHNDQUF1Q0YsRUFBSUcsWUFFckVmLEVBQUlTLE1BQU9DLFFBQVEsUUFLekJwQixLQUFLMEMsU0FBUyxJQUFLLENBQUNqQyxFQUFLQyxFQUFLQyxLQUM1QixNQUFNZSxFQUF1QmpCLEVBQUlrQixRQUFRRCxzQkFBd0IsRUFDakUxQyxJQUFJd0QsS0FBSy9DLElBQUssK0JBQWlDaUMsR0FDL0M3Qyw4QkFBQWtDLFFBQTBCYSxxQkFBcUJGLEdBQXNCVCxLQUFLQyxHQUNwRUEsRUFBS0UsUUFBVUYsRUFBS1csS0FDZlgsRUFBS1csS0FFTGhELDhCQUFBa0MsUUFBMEI2Qix3QkFBd0JuQyxFQUFJd0IsS0FBT3hCLEVBQUl3QixLQUFLQyxHQUFLLE1BQU1qQixLQUFLQyxJQUMzRixHQUFJQSxFQUFLRSxRQUFVRixFQUFLVyxLQUd0QixPQURBcEIsRUFBSWtCLFFBQVFELHFCQUF1QlIsRUFBS1csS0FBS0ssR0FDdENoQixFQUFLVyxLQUVaLE1BQU0sSUFBSWdCLHVEQUF1RDNCLEVBQUtNLGlCQUkzRVAsS0FBTTZCLElBQ1AsTUFBTUMsRUFBUWxFLDhCQUFBa0MsUUFBMEJpQyxpQkFBaUJGLEdBQ3pELEdBQUlDLEVBQU0zQixRQUFVMkIsRUFBTWxCLEtBQU0sQ0FDOUIsTUFBTW9CLEVBQVFGLEVBQU1sQixLQUVwQixHQURBcUIsUUFBUWxFLElBQUksa0JBQW9CaUUsR0FDbEIsZUFBVkEsRUFFRnBFLDhCQUFBa0MsUUFBMEJvQyxpQkFBaUJMLEdBQW1CN0IsS0FBS0MsSUFDakUsSUFBSUEsRUFBS0UsU0FBVUYsRUFBS1csS0FTdEIsTUFBTSxJQUFJZ0Isc0NBQXNDM0IsRUFBS00sY0FUekIsQ0FDNUIsTUFBTTRCLEVBQW9CbEMsRUFBS1csS0FDL0JuQixFQUFJMkMsT0FBT0MsVUFBWUYsRUFBa0JFLFVBQ3pDNUMsRUFBSTJDLE9BQU9FLG1CQUFxQkgsRUFBa0JHLG1CQUNsRDdDLEVBQUkyQyxPQUFPRyxVQUFZSixFQUFrQkksVUFDekM5QyxFQUFJMkMsT0FBT0ksWUFBY0wsRUFBa0JLLFlBQzNDL0MsRUFBSTJDLE9BQU9LLE9BQVMxRCxLQUFLRSxxQkFDekJRLEVBQUlpQyxPQUFPLDBDQUtWLEdBQWMsb0JBQVZNLEVBQ1RwRSw4QkFBQWtDLFFBQTBCNEMsMkJBQTJCYixHQUFtQjdCLEtBQUtDLElBQzNFLElBQUlBLEVBQUtFLFNBQVVGLEVBQUtXLEtBVXRCLE1BQU0sSUFBSWdCLCtDQUErQzNCLEVBQUtNLGNBVmxDLENBQzVCLE1BQU1vQyxFQUFtQjFDLEVBQUtXLEtBQzlCbkIsRUFBSTJDLE9BQU9DLFVBQVlNLEVBQWlCTixVQUN4QzVDLEVBQUkyQyxPQUFPUSxRQUFVRCxFQUFpQkMsUUFDdENuRCxFQUFJMkMsT0FBT1MsY0FBZ0JGLEVBQWlCRSxjQUM1Q3BELEVBQUkyQyxPQUFPVSxpQkFBbUJILEVBQWlCRyxpQkFDL0NyRCxFQUFJMkMsT0FBT0csVUFBWUksRUFBaUJKLFVBQ3hDOUMsRUFBSTJDLE9BQU9LLE9BQVMxRCxLQUFLQyw4QkFDekJTLEVBQUlpQyxPQUFPLHVDQU1WLEdBQWMsYUFBVk0sRUFHVHZDLEVBQUkyQyxPQUFPSyxPQUFTMUQsS0FBS0MsOEJBQ3pCUyxFQUFJaUMsT0FBTyxxQ0FDTixHQUFjLGNBQVZNLEVBQ1RwRSw4QkFBQWtDLFFBQTBCaUQsZ0NBQWdDbEIsR0FBbUI3QixLQUFLQyxJQUNoRixJQUFJQSxFQUFLRSxTQUFVRixFQUFLVyxLQU90QixNQUFNLElBQUlnQix1REFBdUQzQixFQUFLTSxjQU50RTBCLFFBQVFlLElBQUkvQyxHQUNaUixFQUFJMkMsT0FBT2EsYUFBZWhELEVBQUtXLEtBRS9CbkIsRUFBSTJDLE9BQU9LLE9BQVMxRCxLQUFLQyw4QkFDekJTLEVBQUlpQyxPQUFPLHVDQUtWLENBQUEsR0FBYyxjQUFWTSxFQUdULE1BQU0sSUFBSUosMkJBQTJCSSxNQUZyQ3ZDLEVBQUlpQyxPQUFPLHFDQUtkdEIsTUFBTUMsSUFDUFgsRUFBS1csT0FNVHRCLEtBQUtZLFVBQVUsSUFBSyxDQUFDSCxFQUFLQyxFQUFLQyxLQUM3QixNQUFNZSxFQUF1QmpCLEVBQUlrQixRQUFRRCxxQkFDekM3Qyw4QkFBQWtDLFFBQTBCb0Qsb0JBQW9CekMsRUFBc0JqQixFQUFJSyxLQUFLc0QsYUFBYW5ELEtBQUtQLEVBQUlTLEtBQUtrRCxLQUFLM0QsSUFBTVcsTUFBTVYsTUFoTy9IMkQsUUFBQXZELFFBQUFyQiIsImZpbGUiOiJhcHAvY29udHJvbGxlcnMvY29tcGV0ZW5jeS1leGVyY2lzZS1jb250cm9sbGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgUHJvbWlzZSBmcm9tICdibHVlYmlyZCdcbmltcG9ydCBDb3Vyc2VTZXJ2aWNlIGZyb20gJy4uLy4uL3NlcnZpY2VzL2NvdXJzZS1zZXJ2aWNlJ1xuaW1wb3J0IEV4ZXJjaXNlU2VydmljZSwgeyBFeGVyY2lzZUFuc3dlciB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2V4ZXJjaXNlLXNlcnZpY2UnXG5pbXBvcnQgQ29tcGV0ZW5jeUV4ZXJjaXNlU2VydmljZSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9jb21wZXRlbmN5LWV4ZXJjaXNlLXNlcnZpY2UnXG5pbXBvcnQgRXhlcmNpc2VHZW5lcmF0b3IgZnJvbSAnLi4vLi4vbGliL2V4ZXJjaXNlX2dlbmVyYXRvci9leGVyY2lzZS1nZW5lcmF0b3InXG5pbXBvcnQgRXhlcmNpc2VIZWxwZXIgZnJvbSAnLi4vdXRpbHMvZXhlcmNpc2UtaGVscGVyJ1xuaW1wb3J0IFRvcGljRXhlcmNpc2VTZXJ2aWNlIGZyb20gJy4uLy4uL3NlcnZpY2VzL3RvcGljLWV4ZXJjaXNlLXNlcnZpY2UnXG5pbXBvcnQgeyBSZXNwb25zZSB9IGZyb20gJ2F3cy1zZGsnO1xuXG5sZXQgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKVxuXG5sZXQgbW9tZW50ID0gcmVxdWlyZSgnbW9tZW50LXRpbWV6b25lJylcblxubGV0IGxvZyA9IHJlcXVpcmUoJ25wbWxvZycpXG5cbmxldCBBbmFseXRpY3NTZXJ2aWNlID0gcmVxdWlyZShwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vc2VydmljZXMvYW5hbHl0aWNzLXNlcnZpY2UnKSlcbmxldCBCYXNlQ29udHJvbGxlciA9IHJlcXVpcmUocGF0aC5qb2luKF9fZGlybmFtZSwgJ2Jhc2UtY29udHJvbGxlcicpKVxubGV0IFBhc3Nwb3J0SGVscGVyID0gcmVxdWlyZShwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vdXRpbHMvcGFzc3BvcnQtaGVscGVyJykpXG5sZXQgUGF0aEZvcm1hdHRlciA9IHJlcXVpcmUocGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uL2xpYi9wYXRoLWZvcm1hdHRlcicpKVxuXG5sZXQgRm9ybWF0dGVyID0gcmVxdWlyZShwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vbGliL3V0aWxzL2Zvcm1hdHRlcicpKVxubGV0IFV0aWxzID0gcmVxdWlyZShwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vdXRpbHMvdXRpbHMnKSlcblxuY29uc3QgVEFHID0gJ0V4ZXJjaXNlQ29udHJvbGxlcidcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ29tcGV0ZW5jeUV4ZXJjaXNlQ29udHJvbGxlciBleHRlbmRzIEJhc2VDb250cm9sbGVyIHtcbiAgcHJpdmF0ZSBjb21wZXRlbmN5RXhlcmNpc2VMb2dpc2N0aWNKUzogc3RyaW5nXG4gIHByaXZhdGUgY29tcGV0ZW5jeUV4ZXJjaXNlSlM6IHN0cmluZ1xuXG4gIGluaXRpYWxpemUgKCkge1xuICAgIHJldHVybiBQcm9taXNlLmpvaW4oXG4gICAgICBQYXRoRm9ybWF0dGVyLmhhc2hBc3NldCgnYXBwJywgJy9hc3NldHMvanMvY29tcGV0ZW5jeS1leGVyY2lzZS1sb2dpc3RpYy1hcHAtYnVuZGxlLmpzJyksXG4gICAgICBQYXRoRm9ybWF0dGVyLmhhc2hBc3NldCgnYXBwJywgJy9hc3NldHMvanMvY29tcGV0ZW5jeS1leGVyY2lzZS1hcHAtYnVuZGxlLmpzJylcbiAgICApLnNwcmVhZCgocmVzdWx0OiBzdHJpbmcsIHJlc3VsdDI6IHN0cmluZykgPT4ge1xuICAgICAgdGhpcy5jb21wZXRlbmN5RXhlcmNpc2VMb2dpc2N0aWNKUyA9IHJlc3VsdFxuICAgICAgdGhpcy5jb21wZXRlbmN5RXhlcmNpc2VKUyA9IHJlc3VsdDJcbiAgICB9KVxuICB9XG5cbiAgY29uc3RydWN0b3IgKGluaXREYXRhKSB7XG4gICAgc3VwZXIoaW5pdERhdGEpXG4gICAgY29uc3QgYW5hbHl0aWNzU2VydmljZSA9IG5ldyBBbmFseXRpY3NTZXJ2aWNlKHRoaXMuZ2V0RGIoKS5zZXF1ZWxpemUsIHRoaXMuZ2V0RGIoKS5tb2RlbHMpXG4gICAgdGhpcy5hZGRJbnRlcmNlcHRvcigocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICAgIG5leHQoKVxuICAgIH0pXG5cbiAgICB0aGlzLnJvdXRlUG9zdCgnL2V4ZXJjaXNlLWNvZGUnLCAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICAgIGNvbnN0IGNvZGUgPSByZXEuYm9keS5jb2RlXG4gICAgICBDb21wZXRlbmN5RXhlcmNpc2VTZXJ2aWNlLnN1Ym1pdEV4ZXJjaXNlQ29kZShjb2RlKS50aGVuKHJlc3AgPT4ge1xuICAgICAgICByZXMuanNvbihyZXNwKVxuICAgICAgICBpZiAoIXJlc3Auc3RhdHVzKSB7XG4gICAgICAgICAgLy8gVE9ETzogU2VuZCBlbWFpbCB0byB1cyBzbyB3ZSBrbm93IHRoZXJlJ3MgYSB3cm9uZyBhdHRlbXB0XG4gICAgICAgIH1cbiAgICAgIH0pLmNhdGNoKGVyciA9PiB7XG4gICAgICAgIGxvZy5lcnJvcihUQUcsIGVycilcbiAgICAgICAgcmVzLmpzb24oeyBzdGF0dXM6IGZhbHNlLCBlcnJNZXNzYWdlOiBlcnIubWVzc2FnZSB9KVxuICAgICAgfSlcbiAgICB9KVxuXG4gICAgdGhpcy5yb3V0ZVBvc3QoJy9zdGFydC10b3BpYycsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgICAgY29uc3QgY29tcGV0ZW5jeUV4ZXJjaXNlSWQgPSByZXEuc2Vzc2lvbi5jb21wZXRlbmN5RXhlcmNpc2VJZCB8fCAwXG4gICAgICBpZiAoY29tcGV0ZW5jeUV4ZXJjaXNlSWQpIHtcbiAgICAgICAgQ29tcGV0ZW5jeUV4ZXJjaXNlU2VydmljZS5nZXRHZW5lcmF0ZWRFeGVyY2lzZShjb21wZXRlbmN5RXhlcmNpc2VJZCkudGhlbihyZXNwID0+IHtcbiAgICAgICAgICBpZiAocmVzcC5zdGF0dXMgJiYgcmVzcC5kYXRhKSB7XG4gICAgICAgICAgICByZXR1cm4gQ29tcGV0ZW5jeUV4ZXJjaXNlU2VydmljZS5zdGFydEV4ZXJjaXNlKHJlc3AuZGF0YSkudGhlbihyZXNwID0+IHtcbiAgICAgICAgICAgICAgaWYgKHJlc3Auc3RhdHVzICYmIHJlc3AuZGF0YSkge1xuICAgICAgICAgICAgICAgIHJlcy5qc29uKHsgc3RhdHVzOiB0cnVlIH0pXG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzLmpzb24oeyBzdGF0dXM6IGZhbHNlLCBlcnJNZXNzYWdlOiBgRmFpbGVkIHRvIHN0YXJ0RXhlcmNpc2U6ICR7cmVzcC5lcnJNZXNzYWdlfWAgfSlcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHJlcy5qc29uKHsgc3RhdHVzOiBmYWxzZSwgZXJyTWVzc2FnZTogYEZhaWxlZCB0byBnZXRHZW5lcmF0ZWRFeGVyY2lzZTogJHtyZXNwLmVyck1lc3NhZ2V9YCB9KVxuICAgICAgICAgIH1cbiAgICAgICAgfSkuY2F0Y2gobmV4dClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlcy5qc29uKHsgc3RhdHVzOiBmYWxzZSwgZXJyTWVzc2FnZTogYGNvbXBldGVuY3lFeGVyY2lzZUlkIGlzIG5vdCBmb3VuZCEgU2Vzc2lvbiBleHBpcmVkP2AsIGVyckNvZGU6IDEgfSlcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgdGhpcy5yb3V0ZVBvc3QoJy9hYmFuZG9uLWV4ZXJjaXNlJywgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgICBjb25zdCBjb21wZXRlbmN5RXhlcmNpc2VJZCA9IHJlcS5zZXNzaW9uLmNvbXBldGVuY3lFeGVyY2lzZUlkIHx8IDBcbiAgICAgIGlmIChjb21wZXRlbmN5RXhlcmNpc2VJZCkge1xuICAgICAgICBDb21wZXRlbmN5RXhlcmNpc2VTZXJ2aWNlLmdldEdlbmVyYXRlZEV4ZXJjaXNlKGNvbXBldGVuY3lFeGVyY2lzZUlkKS50aGVuKHJlc3AgPT4ge1xuICAgICAgICAgIGlmIChyZXNwLnN0YXR1cyAmJiByZXNwLmRhdGEpIHtcbiAgICAgICAgICAgIHJldHVybiBDb21wZXRlbmN5RXhlcmNpc2VTZXJ2aWNlLmFiYW5kb25FeGVyY2lzZShyZXNwLmRhdGEsIHJlcS51c2VyID8gcmVxLnVzZXIuaWQgOiBudWxsKS50aGVuKHJlc3AgPT4ge1xuICAgICAgICAgICAgICBpZiAocmVzcC5zdGF0dXMpIHtcbiAgICAgICAgICAgICAgICAvLyBEZWxldGUgaWQgZnJvbSBzZXNzaW9uLCBzbyB0aGF0IHVzZXIgY2FuIHJlLXRha2UgdGhlIGNvbXBldGVuY3kgdGVzdFxuICAgICAgICAgICAgICAgIGRlbGV0ZSByZXEuc2Vzc2lvblsnY29tcGV0ZW5jeUV4ZXJjaXNlSWQnXVxuICAgICAgICAgICAgICAgIHJlcS5zZXNzaW9uLnNhdmUoZXJyID0+IHtcbiAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzLmpzb24oeyBzdGF0dXM6IGZhbHNlLCBlcnJNZXNzYWdlOiBlcnIubWVzc2FnZSB9KVxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzLmpzb24oeyBzdGF0dXM6IHRydWUgfSlcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlcy5qc29uKHsgc3RhdHVzOiBmYWxzZSwgZXJyTWVzc2FnZTogYEZhaWxlZCB0byBhYmFuZG9uRXhlcmNpc2U6ICR7cmVzcC5lcnJNZXNzYWdlfWAgfSlcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHJlcy5qc29uKHsgc3RhdHVzOiBmYWxzZSwgZXJyTWVzc2FnZTogYEZhaWxlZCB0byBnZXRHZW5lcmF0ZWRFeGVyY2lzZTogJHtyZXNwLmVyck1lc3NhZ2V9YCB9KVxuICAgICAgICAgIH1cbiAgICAgICAgfSkuY2F0Y2goZXJyID0+IHtcbiAgICAgICAgICBsb2cuZXJyb3IoVEFHLCBlcnIpXG4gICAgICAgICAgcmVzLmpzb24oeyBzdGF0dXM6IGZhbHNlLCBlcnJNZXNzYWdlOiAnRmFpbGVkOiAnICsgZXJyLm1lc3NhZ2UgfSlcbiAgICAgICAgfSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlcy5qc29uKHsgc3RhdHVzOiBmYWxzZSwgZXJyTWVzc2FnZTogYGNvbXBldGVuY3lFeGVyY2lzZUlkIGlzIG5vdCBmb3VuZCEgU2Vzc2lvbiBleHBpcmVkP2AsIGVyckNvZGU6IDEgfSlcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgdGhpcy5yb3V0ZVBvc3QoJy9za2lwLXRvcGljJywgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgICBjb25zdCBjb21wZXRlbmN5RXhlcmNpc2VJZCA9IHJlcS5zZXNzaW9uLmNvbXBldGVuY3lFeGVyY2lzZUlkIHx8IDBcbiAgICAgIGlmIChjb21wZXRlbmN5RXhlcmNpc2VJZCkge1xuICAgICAgICBDb21wZXRlbmN5RXhlcmNpc2VTZXJ2aWNlLmdldEdlbmVyYXRlZEV4ZXJjaXNlKGNvbXBldGVuY3lFeGVyY2lzZUlkKS50aGVuKHJlc3AgPT4ge1xuICAgICAgICAgIGlmIChyZXNwLnN0YXR1cyAmJiByZXNwLmRhdGEpIHtcbiAgICAgICAgICAgIHJldHVybiBDb21wZXRlbmN5RXhlcmNpc2VTZXJ2aWNlLnNraXBUb3BpYyhyZXNwLmRhdGEpLnRoZW4ocmVzcCA9PiB7XG4gICAgICAgICAgICAgIGlmIChyZXNwLnN0YXR1cykge1xuICAgICAgICAgICAgICAgIHJlcy5qc29uKHsgc3RhdHVzOiB0cnVlIH0pXG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzLmpzb24oeyBzdGF0dXM6IGZhbHNlLCBlcnJNZXNzYWdlOiBgRmFpbGVkIHRvIGFiYW5kb25FeGVyY2lzZTogJHtyZXNwLmVyck1lc3NhZ2V9YCB9KVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzLmpzb24oeyBzdGF0dXM6IGZhbHNlLCBlcnJNZXNzYWdlOiBgRmFpbGVkIHRvIGdldEdlbmVyYXRlZEV4ZXJjaXNlOiAke3Jlc3AuZXJyTWVzc2FnZX1gIH0pXG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzLmpzb24oeyBzdGF0dXM6IGZhbHNlLCBlcnJNZXNzYWdlOiBgY29tcGV0ZW5jeUV4ZXJjaXNlSWQgaXMgbm90IGZvdW5kISBTZXNzaW9uIGV4cGlyZWQ/YCwgZXJyQ29kZTogMSB9KVxuICAgICAgfVxuICAgIH0pXG5cbiAgICB0aGlzLnJvdXRlUG9zdCgnL3N1Ym1pdCcsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgICAgY29uc3QgY29tcGV0ZW5jeUV4ZXJjaXNlSWQgPSByZXEuc2Vzc2lvbi5jb21wZXRlbmN5RXhlcmNpc2VJZCB8fCAwXG4gICAgICBjb25zdCB7IG5hbWUsIHBob25lLCBlbWFpbCB9ID0gcmVxLmJvZHlcbiAgICAgIGxvZy5pbmZvKFRBRywgJy8uR0VUOiBjb21wZXRlbmN5RXhlcmNpc2VJZD0nICsgY29tcGV0ZW5jeUV4ZXJjaXNlSWQpXG4gICAgICBDb21wZXRlbmN5RXhlcmNpc2VTZXJ2aWNlLnN1Ym1pdEV4ZXJjaXNlKGNvbXBldGVuY3lFeGVyY2lzZUlkLCB7IG5hbWUsIHBob25lLCBlbWFpbCB9KS50aGVuKHJlc3AgPT4ge1xuICAgICAgICByZXMuanNvbihyZXNwKVxuICAgICAgfSkuY2F0Y2goZXJyID0+IHtcbiAgICAgICAgbG9nLmVycm9yKFRBRywgZXJyKVxuICAgICAgICByZXMuanNvbih7IHN0YXR1czogZmFsc2UsIGVyck1lc3NhZ2U6IGVyci5tZXNzYWdlIH0pXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICB0aGlzLnJvdXRlR2V0KCcvZGVidWcvZmluaXNoZWQnLCAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICAgIHJlcy5yZW5kZXIoJ2NvbXBldGVuY3ktZXhlcmNpc2UvZmluaXNoZWQnKVxuICAgIH0pXG5cbiAgICB0aGlzLnJvdXRlR2V0KCcvZGVidWcvc3VibWl0dGVkJywgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgICByZXMucmVuZGVyKCdjb21wZXRlbmN5LWV4ZXJjaXNlL3N1Ym1pdHRlZCcpXG4gICAgfSlcblxuICAgIHRoaXMucm91dGVQb3N0KCcvcmV0YWtlLWV4ZXJjaXNlJywgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgICBkZWxldGUgcmVxLnNlc3Npb25bJ2NvbXBldGVuY3lFeGVyY2lzZUlkJ11cbiAgICAgIHJlcS5zZXNzaW9uLnNhdmUoZXJyID0+IHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIHJlcy5qc29uKHsgc3RhdHVzOiBmYWxzZSwgZXJyTWVzc2FnZTogYEZhaWxlZCB0byBzYXZlIHNlc3Npb246ICR7ZXJyLm1lc3NhZ2V9YCB9KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlcy5qc29uKHsgc3RhdHVzOiB0cnVlIH0pXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSlcblxuICAgIHRoaXMucm91dGVHZXQoJy8nLCAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICAgIGNvbnN0IGNvbXBldGVuY3lFeGVyY2lzZUlkID0gcmVxLnNlc3Npb24uY29tcGV0ZW5jeUV4ZXJjaXNlSWQgfHwgMFxuICAgICAgbG9nLmluZm8oVEFHLCAnLy5HRVQ6IGNvbXBldGVuY3lFeGVyY2lzZUlkPScgKyBjb21wZXRlbmN5RXhlcmNpc2VJZClcbiAgICAgIENvbXBldGVuY3lFeGVyY2lzZVNlcnZpY2UuZ2V0R2VuZXJhdGVkRXhlcmNpc2UoY29tcGV0ZW5jeUV4ZXJjaXNlSWQpLnRoZW4ocmVzcCA9PiB7XG4gICAgICAgIGlmIChyZXNwLnN0YXR1cyAmJiByZXNwLmRhdGEpIHtcbiAgICAgICAgICByZXR1cm4gcmVzcC5kYXRhXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIENvbXBldGVuY3lFeGVyY2lzZVNlcnZpY2UuZ2VuZXJhdGVBbmRTYXZlRXhlcmNpc2UocmVxLnVzZXIgPyByZXEudXNlci5pZCA6IG51bGwpLnRoZW4ocmVzcCA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcC5zdGF0dXMgJiYgcmVzcC5kYXRhKSB7XG4gICAgICAgICAgICAgIC8vIFNhdmUgZ2VuZXJhdGVkIGV4ZXJjaXNlIGlkIHRvIHVzZXIgc2Vzc2lvblxuICAgICAgICAgICAgICByZXEuc2Vzc2lvbi5jb21wZXRlbmN5RXhlcmNpc2VJZCA9IHJlc3AuZGF0YS5pZFxuICAgICAgICAgICAgICByZXR1cm4gcmVzcC5kYXRhXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBjcmVhdGUgZ2VuZXJhdGVkQ29tcGV0ZW5jeUV4ZXJjaXNlOiAke3Jlc3AuZXJyTWVzc2FnZX1gKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgIH0pLnRoZW4oKGdlbmVyYXRlZEV4ZXJjaXNlOiBHZW5lcmF0ZWRDb21wZXRlbmN5RXhlcmNpc2UpID0+IHtcbiAgICAgICAgY29uc3QgcmVzcDIgPSBDb21wZXRlbmN5RXhlcmNpc2VTZXJ2aWNlLmdldEV4ZXJjaXNlU3RhdGUoZ2VuZXJhdGVkRXhlcmNpc2UpXG4gICAgICAgIGlmIChyZXNwMi5zdGF0dXMgJiYgcmVzcDIuZGF0YSkge1xuICAgICAgICAgIGNvbnN0IHN0YXRlID0gcmVzcDIuZGF0YVxuICAgICAgICAgIGNvbnNvbGUubG9nKCdFeGVyY2lzZSBzdGF0ZT0nICsgc3RhdGUpXG4gICAgICAgICAgaWYgKHN0YXRlID09PSAnZXhlcmNpc2luZycpIHtcbiAgICAgICAgICAgIC8vIENvbnRpbnVlIHRvIGV4ZXJjaXNlIHBhZ2VcbiAgICAgICAgICAgIENvbXBldGVuY3lFeGVyY2lzZVNlcnZpY2UuY29udGludWVFeGVyY2lzZShnZW5lcmF0ZWRFeGVyY2lzZSkudGhlbihyZXNwID0+IHtcbiAgICAgICAgICAgICAgaWYgKHJlc3Auc3RhdHVzICYmIHJlc3AuZGF0YSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZvcm1hdHRlZEV4ZXJjaXNlID0gcmVzcC5kYXRhXG4gICAgICAgICAgICAgICAgcmVzLmxvY2Fscy50b3BpY05hbWUgPSBmb3JtYXR0ZWRFeGVyY2lzZS50b3BpY05hbWVcbiAgICAgICAgICAgICAgICByZXMubG9jYWxzLmZvcm1hdHRlZEV4ZXJjaXNlcyA9IGZvcm1hdHRlZEV4ZXJjaXNlLmZvcm1hdHRlZEV4ZXJjaXNlc1xuICAgICAgICAgICAgICAgIHJlcy5sb2NhbHMuaWRlYWxUaW1lID0gZm9ybWF0dGVkRXhlcmNpc2UuaWRlYWxUaW1lXG4gICAgICAgICAgICAgICAgcmVzLmxvY2Fscy5lbGFwc2VkVGltZSA9IGZvcm1hdHRlZEV4ZXJjaXNlLmVsYXBzZWRUaW1lXG4gICAgICAgICAgICAgICAgcmVzLmxvY2Fscy5idW5kbGUgPSB0aGlzLmNvbXBldGVuY3lFeGVyY2lzZUpTXG4gICAgICAgICAgICAgICAgcmVzLnJlbmRlcignY29tcGV0ZW5jeS1leGVyY2lzZS9leGVyY2lzaW5nJylcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBjb250aW51ZSBleGVyY2lzZTogJHtyZXNwLmVyck1lc3NhZ2V9YClcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSAncGVuZGluZ0V4ZXJjaXNlJykge1xuICAgICAgICAgICAgQ29tcGV0ZW5jeUV4ZXJjaXNlU2VydmljZS5nZXRQZW5kaW5nVG9waWNJbmZvcm1hdGlvbihnZW5lcmF0ZWRFeGVyY2lzZSkudGhlbihyZXNwID0+IHtcbiAgICAgICAgICAgICAgaWYgKHJlc3Auc3RhdHVzICYmIHJlc3AuZGF0YSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRvcGljSW5mb3JtYXRpb24gPSByZXNwLmRhdGFcbiAgICAgICAgICAgICAgICByZXMubG9jYWxzLnRvcGljTmFtZSA9IHRvcGljSW5mb3JtYXRpb24udG9waWNOYW1lXG4gICAgICAgICAgICAgICAgcmVzLmxvY2Fscy50b3BpY05vID0gdG9waWNJbmZvcm1hdGlvbi50b3BpY05vXG4gICAgICAgICAgICAgICAgcmVzLmxvY2Fscy50b3BpY1F1YW50aXR5ID0gdG9waWNJbmZvcm1hdGlvbi50b3BpY1F1YW50aXR5XG4gICAgICAgICAgICAgICAgcmVzLmxvY2Fscy5xdWVzdGlvblF1YW50aXR5ID0gdG9waWNJbmZvcm1hdGlvbi5xdWVzdGlvblF1YW50aXR5XG4gICAgICAgICAgICAgICAgcmVzLmxvY2Fscy5pZGVhbFRpbWUgPSB0b3BpY0luZm9ybWF0aW9uLmlkZWFsVGltZVxuICAgICAgICAgICAgICAgIHJlcy5sb2NhbHMuYnVuZGxlID0gdGhpcy5jb21wZXRlbmN5RXhlcmNpc2VMb2dpc2N0aWNKU1xuICAgICAgICAgICAgICAgIHJlcy5yZW5kZXIoJ2NvbXBldGVuY3ktZXhlcmNpc2UvcGVuZGluZycpXG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gZ2V0UGVuZGluZ1RvcGljSW5mb3JtYXRpb246ICR7cmVzcC5lcnJNZXNzYWdlfWApXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAvLyBTaG93IFwiU3RhcnQgRXhlcmNpc2luZ1wiIHBhZ2VcbiAgICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSAnZmluaXNoZWQnKSB7XG4gICAgICAgICAgICAvLyBTaG93IHN1Ym1pc3Npb24gcGFnZSBoZXJlXG4gICAgICAgICAgICAvLyBTZW5kIGVtYWlsIHNvIHRoYXQgd2Uga25vdyBzb21lYm9keSBjb21wbGV0ZXMgYW4gZXhlcmNpc2UhXG4gICAgICAgICAgICByZXMubG9jYWxzLmJ1bmRsZSA9IHRoaXMuY29tcGV0ZW5jeUV4ZXJjaXNlTG9naXNjdGljSlNcbiAgICAgICAgICAgIHJlcy5yZW5kZXIoJ2NvbXBldGVuY3ktZXhlcmNpc2UvZmluaXNoZWQnKVxuICAgICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09ICdzdWJtaXR0ZWQnKSB7XG4gICAgICAgICAgICBDb21wZXRlbmN5RXhlcmNpc2VTZXJ2aWNlLmdldFN1Ym1pdHRlZEV4ZXJjaXNlSW5mb3JtYXRpb24oZ2VuZXJhdGVkRXhlcmNpc2UpLnRoZW4ocmVzcCA9PiB7XG4gICAgICAgICAgICAgIGlmIChyZXNwLnN0YXR1cyAmJiByZXNwLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmRpcihyZXNwKVxuICAgICAgICAgICAgICAgIHJlcy5sb2NhbHMudG9waWNSZXN1bHRzID0gcmVzcC5kYXRhXG4gICAgICAgICAgICAgICAgLy8gU2hvdyBzY29yZSBoZXJlXG4gICAgICAgICAgICAgICAgcmVzLmxvY2Fscy5idW5kbGUgPSB0aGlzLmNvbXBldGVuY3lFeGVyY2lzZUxvZ2lzY3RpY0pTXG4gICAgICAgICAgICAgICAgcmVzLnJlbmRlcignY29tcGV0ZW5jeS1leGVyY2lzZS9zdWJtaXR0ZWQnKVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIGdldCBzdWJtaXR0ZWQgZXhlcmNpc2UgaW5mb3JtYXRpb246ICR7cmVzcC5lcnJNZXNzYWdlfWApXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gJ2FiYW5kb25lZCcpIHtcbiAgICAgICAgICAgIHJlcy5yZW5kZXIoJ2NvbXBldGVuY3ktZXhlcmNpc2UvYWJhbmRvbmVkJylcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmV4cGVjdGVkIHN0YXRlOiAke3N0YXRlfSFgKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSkuY2F0Y2goZXJyID0+IHtcbiAgICAgICAgbmV4dChlcnIpXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICAvLyBFeGVyY2lzZSBzdWJtaXNzaW9uXG4gICAgLy8gVE9ETzogUmVmYWN0b3IgdGhpcyBvbnRvIENvbXBldGVuY3lFeGVyY2lzZVNlcnZpY2VcbiAgICB0aGlzLnJvdXRlUG9zdCgnLycsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgICAgY29uc3QgY29tcGV0ZW5jeUV4ZXJjaXNlSWQgPSByZXEuc2Vzc2lvbi5jb21wZXRlbmN5RXhlcmNpc2VJZFxuICAgICAgQ29tcGV0ZW5jeUV4ZXJjaXNlU2VydmljZS5zdWJtaXRUb3BpY0V4ZXJjaXNlKGNvbXBldGVuY3lFeGVyY2lzZUlkLCByZXEuYm9keS51c2VyQW5zd2VycykudGhlbihyZXMuanNvbi5iaW5kKHJlcykpLmNhdGNoKG5leHQpXG4gICAgfSlcbiAgfVxufVxuIl19
