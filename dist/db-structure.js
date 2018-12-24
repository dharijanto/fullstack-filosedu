const Sequelize=require("sequelize");function addTables(e,i){return i.Subject=e.define("subject",{id:{type:Sequelize.INTEGER,primaryKey:!0,autoIncrement:!0},subject:{type:Sequelize.STRING,unique:!0},description:{type:Sequelize.STRING}}),i.Topic=e.define("topic",{id:{type:Sequelize.INTEGER,primaryKey:!0,autoIncrement:!0},topic:{type:Sequelize.STRING,unique:!0},description:{type:Sequelize.STRING},topicNo:{type:Sequelize.INTEGER}}),i.Topic.belongsTo(i.Subject),i.Subtopic=e.define("subtopics",{id:{type:Sequelize.INTEGER,primaryKey:!0,autoIncrement:!0},subtopic:{type:Sequelize.STRING,unique:!0},description:{type:Sequelize.STRING},data:{type:Sequelize.TEXT("long")},subtopicNo:{type:Sequelize.INTEGER}}),i.Subtopic.belongsTo(i.Topic),i.Tag=e.define("tag",{id:{type:Sequelize.INTEGER,primaryKey:!0,autoIncrement:!0},tag:{type:Sequelize.STRING,unique:!0},description:{type:Sequelize.STRING}}),i.Tag.belongsTo(i.Topic),i.TopicDependency=e.define("topicDependency",{id:{type:Sequelize.INTEGER,primaryKey:!0,autoIncrement:!0},topicId:{type:Sequelize.INTEGER,references:{model:i.Topic,key:"id"},unique:"compositeIndex"},dependencyId:{type:Sequelize.INTEGER,references:{model:i.Topic,key:"id"},unique:"compositeIndex"},description:Sequelize.STRING}),i.School=e.define("schools",{id:{type:Sequelize.INTEGER,primaryKey:!0,autoIncrement:!0},identifier:{type:Sequelize.STRING,unique:!0},name:{type:Sequelize.TEXT},address:{type:Sequelize.TEXT},phone:{type:Sequelize.STRING},logo:{type:Sequelize.TEXT}}),i.User=e.define("users",{id:{type:Sequelize.INTEGER,primaryKey:!0,autoIncrement:!0},username:{type:Sequelize.STRING},saltedPass:{type:Sequelize.STRING},salt:{type:Sequelize.STRING},email:{type:Sequelize.STRING},fullName:{type:Sequelize.STRING},grade:{type:Sequelize.STRING}}),i.User.belongsTo(i.School),i.Exercise=e.define("exercises",{id:{type:Sequelize.INTEGER,primaryKey:!0,autoIncrement:!0},data:{type:Sequelize.TEXT}}),i.Exercise.belongsTo(i.Subtopic),i.GeneratedExercise=e.define("generatedExercise",{id:{type:Sequelize.INTEGER,primaryKey:!0,autoIncrement:!0},exerciseHash:{type:Sequelize.STRING},knowns:{type:Sequelize.TEXT},unknowns:{type:Sequelize.TEXT},userAnswer:{type:Sequelize.TEXT},submitted:{type:Sequelize.BOOLEAN,defaultValue:!1},submittedAt:{type:Sequelize.DATE},score:{type:Sequelize.FLOAT},timeFinish:{type:Sequelize.FLOAT},idealTime:{type:Sequelize.FLOAT},onCloud:{type:Sequelize.BOOLEAN,defaultValue:!0}}),i.GeneratedExercise.belongsTo(i.Exercise),i.GeneratedExercise.belongsTo(i.User),i.Videos=e.define("videos",{id:{type:Sequelize.INTEGER,primaryKey:!0,autoIncrement:!0},filename:{type:Sequelize.STRING,unique:!0},sourceLink:{type:Sequelize.TEXT}}),i.Videos.belongsTo(i.Subtopic),i.WatchedVideo=e.define("watchedVideos",{id:{type:Sequelize.INTEGER,primaryKey:!0,autoIncrement:!0},date:{type:Sequelize.DATE,defaultValue:e.fn("NOW")},onCloud:{type:Sequelize.BOOLEAN,defaultValue:!0}}),i.WatchedVideo.belongsTo(i.Videos),i.WatchedVideo.belongsTo(i.User),i.Images=e.define("images",{id:{type:Sequelize.INTEGER,primaryKey:!0,autoIncrement:!0},filename:{type:Sequelize.STRING,unique:!0},sourceLink:{type:Sequelize.TEXT}}),i.Analytics=e.define("analytics",{id:{type:Sequelize.INTEGER,primaryKey:!0,autoIncrement:!0},type:{type:Sequelize.Sequelize.ENUM(["video","exercise"])},key:{type:Sequelize.STRING},value:{type:Sequelize.INTEGER},userId:Sequelize.INTEGER,videoId:Sequelize.INTEGER,exerciseId:Sequelize.INTEGER,onCloud:{type:Sequelize.BOOLEAN,defaultValue:!0}}),i.GeneratedTopicExercise=e.define("generatedTopicExercises",{id:{type:Sequelize.INTEGER,primaryKey:!0,autoIncrement:!0},submitted:{type:Sequelize.BOOLEAN,defaultValue:!1},submittedAt:{type:Sequelize.DATE},score:{type:Sequelize.FLOAT},timeFinish:{type:Sequelize.FLOAT},topicExerciseHash:{type:Sequelize.STRING},exerciseDetail:{type:Sequelize.TEXT},idealTime:{type:Sequelize.FLOAT},onCloud:{type:Sequelize.BOOLEAN,defaultValue:!0}}),i.GeneratedTopicExercise.belongsTo(i.Topic),i.GeneratedTopicExercise.belongsTo(i.User),i.Synchronization=e.define("synchronization",{schoolIdentifier:{type:Sequelize.STRING},serverHash:{type:Sequelize.STRING},localId:{type:Sequelize.INTEGER},cloudId:{type:Sequelize.INTEGER},tableName:{type:Sequelize.STRING}}),i.SyncHistory=e.define("syncHistories",{id:{type:Sequelize.INTEGER,primaryKey:!0,autoIncrement:!0},schoolIdentifier:{type:Sequelize.STRING},status:{type:Sequelize.ENUM(["Syncing","Success","Failed"])},date:{type:Sequelize.STRING}}),i.LocalMetaData=e.define("localMetaData",{id:{type:Sequelize.INTEGER,primaryKey:!0,autoIncrement:!0},key:{type:Sequelize.STRING,unique:!0},value:{type:Sequelize.STRING}}),i}module.exports=addTables;
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9kYi1zdHJ1Y3R1cmUuanMiXSwibmFtZXMiOlsiU2VxdWVsaXplIiwicmVxdWlyZSIsImFkZFRhYmxlcyIsInNlcXVlbGl6ZSIsIm1vZGVscyIsIlN1YmplY3QiLCJkZWZpbmUiLCJpZCIsInR5cGUiLCJJTlRFR0VSIiwicHJpbWFyeUtleSIsImF1dG9JbmNyZW1lbnQiLCJzdWJqZWN0IiwiU1RSSU5HIiwidW5pcXVlIiwiZGVzY3JpcHRpb24iLCJUb3BpYyIsInRvcGljIiwidG9waWNObyIsImJlbG9uZ3NUbyIsIlN1YnRvcGljIiwic3VidG9waWMiLCJkYXRhIiwiVEVYVCIsInN1YnRvcGljTm8iLCJUYWciLCJ0YWciLCJUb3BpY0RlcGVuZGVuY3kiLCJ0b3BpY0lkIiwicmVmZXJlbmNlcyIsIm1vZGVsIiwia2V5IiwiZGVwZW5kZW5jeUlkIiwiU2Nob29sIiwiaWRlbnRpZmllciIsIm5hbWUiLCJhZGRyZXNzIiwicGhvbmUiLCJsb2dvIiwiVXNlciIsInVzZXJuYW1lIiwic2FsdGVkUGFzcyIsInNhbHQiLCJlbWFpbCIsImZ1bGxOYW1lIiwiZ3JhZGUiLCJFeGVyY2lzZSIsIkdlbmVyYXRlZEV4ZXJjaXNlIiwiZXhlcmNpc2VIYXNoIiwia25vd25zIiwidW5rbm93bnMiLCJ1c2VyQW5zd2VyIiwic3VibWl0dGVkIiwiQk9PTEVBTiIsImRlZmF1bHRWYWx1ZSIsInN1Ym1pdHRlZEF0IiwiREFURSIsInNjb3JlIiwiRkxPQVQiLCJ0aW1lRmluaXNoIiwiaWRlYWxUaW1lIiwib25DbG91ZCIsIlZpZGVvcyIsImZpbGVuYW1lIiwic291cmNlTGluayIsIldhdGNoZWRWaWRlbyIsImRhdGUiLCJmbiIsIkltYWdlcyIsIkFuYWx5dGljcyIsIkVOVU0iLCJ2YWx1ZSIsInVzZXJJZCIsInZpZGVvSWQiLCJleGVyY2lzZUlkIiwiR2VuZXJhdGVkVG9waWNFeGVyY2lzZSIsInRvcGljRXhlcmNpc2VIYXNoIiwiZXhlcmNpc2VEZXRhaWwiLCJTeW5jaHJvbml6YXRpb24iLCJzY2hvb2xJZGVudGlmaWVyIiwic2VydmVySGFzaCIsImxvY2FsSWQiLCJjbG91ZElkIiwidGFibGVOYW1lIiwiU3luY0hpc3RvcnkiLCJzdGF0dXMiLCJMb2NhbE1ldGFEYXRhIiwibW9kdWxlIiwiZXhwb3J0cyJdLCJtYXBwaW5ncyI6IkFBQUEsTUFBTUEsVUFBWUMsUUFBUSxhQUUxQixTQUFBQyxVQUFvQkMsRUFBV0MsR0FpTDdCLE9BOUtBQSxFQUFPQyxRQUFVRixFQUFVRyxPQUFPLFdBQ2hDQyxJQUFLQyxLQUFNUixVQUFVUyxRQUFTQyxZQUFZLEVBQU1DLGVBQWUsR0FDL0RDLFNBQVVKLEtBQU1SLFVBQVVhLE9BQVFDLFFBQVEsR0FDMUNDLGFBQWNQLEtBQU1SLFVBQVVhLFVBR2hDVCxFQUFPWSxNQUFRYixFQUFVRyxPQUFPLFNBQzlCQyxJQUFLQyxLQUFNUixVQUFVUyxRQUFTQyxZQUFZLEVBQU1DLGVBQWUsR0FDL0RNLE9BQVFULEtBQU1SLFVBQVVhLE9BQVFDLFFBQVEsR0FDeENDLGFBQWNQLEtBQU1SLFVBQVVhLFFBQzlCSyxTQUFVVixLQUFNUixVQUFVUyxXQUU1QkwsRUFBT1ksTUFBTUcsVUFBVWYsRUFBT0MsU0FFOUJELEVBQU9nQixTQUFXakIsRUFBVUcsT0FBTyxhQUNqQ0MsSUFBS0MsS0FBTVIsVUFBVVMsUUFBU0MsWUFBWSxFQUFNQyxlQUFlLEdBQy9EVSxVQUFXYixLQUFNUixVQUFVYSxPQUFRQyxRQUFRLEdBQzNDQyxhQUFjUCxLQUFNUixVQUFVYSxRQUM5QlMsTUFBT2QsS0FBTVIsVUFBVXVCLEtBQUssU0FDNUJDLFlBQWFoQixLQUFNUixVQUFVUyxXQUUvQkwsRUFBT2dCLFNBQVNELFVBQVVmLEVBQU9ZLE9BRWpDWixFQUFPcUIsSUFBTXRCLEVBQVVHLE9BQU8sT0FDNUJDLElBQUtDLEtBQU1SLFVBQVVTLFFBQVNDLFlBQVksRUFBTUMsZUFBZSxHQUMvRGUsS0FBTWxCLEtBQU1SLFVBQVVhLE9BQVFDLFFBQVEsR0FDdENDLGFBQWNQLEtBQU1SLFVBQVVhLFVBRWhDVCxFQUFPcUIsSUFBSU4sVUFBVWYsRUFBT1ksT0FFNUJaLEVBQU91QixnQkFBa0J4QixFQUFVRyxPQUFPLG1CQUN4Q0MsSUFBS0MsS0FBTVIsVUFBVVMsUUFBU0MsWUFBWSxFQUFNQyxlQUFlLEdBQy9EaUIsU0FDRXBCLEtBQU1SLFVBQVVTLFFBQ2hCb0IsWUFDRUMsTUFBTzFCLEVBQU9ZLE1BQ2RlLElBQUssTUFFUGpCLE9BQVEsa0JBRVZrQixjQUNFeEIsS0FBTVIsVUFBVVMsUUFDaEJvQixZQUNFQyxNQUFPMUIsRUFBT1ksTUFDZGUsSUFBSyxNQUVQakIsT0FBUSxrQkFFVkMsWUFBYWYsVUFBVWEsU0FHekJULEVBQU82QixPQUFTOUIsRUFBVUcsT0FBTyxXQUMvQkMsSUFBS0MsS0FBTVIsVUFBVVMsUUFBU0MsWUFBWSxFQUFNQyxlQUFlLEdBQy9EdUIsWUFBYTFCLEtBQU1SLFVBQVVhLE9BQVFDLFFBQVEsR0FDN0NxQixNQUFPM0IsS0FBTVIsVUFBVXVCLE1BQ3ZCYSxTQUFVNUIsS0FBTVIsVUFBVXVCLE1BQzFCYyxPQUFRN0IsS0FBTVIsVUFBVWEsUUFDeEJ5QixNQUFPOUIsS0FBTVIsVUFBVXVCLFFBR3pCbkIsRUFBT21DLEtBQU9wQyxFQUFVRyxPQUFPLFNBQzdCQyxJQUFLQyxLQUFNUixVQUFVUyxRQUFTQyxZQUFZLEVBQU1DLGVBQWUsR0FDL0Q2QixVQUFXaEMsS0FBTVIsVUFBVWEsUUFDM0I0QixZQUFhakMsS0FBTVIsVUFBVWEsUUFDN0I2QixNQUFPbEMsS0FBTVIsVUFBVWEsUUFDdkI4QixPQUFRbkMsS0FBTVIsVUFBVWEsUUFDeEIrQixVQUFXcEMsS0FBTVIsVUFBVWEsUUFDM0JnQyxPQUFRckMsS0FBTVIsVUFBVWEsVUFFMUJULEVBQU9tQyxLQUFLcEIsVUFBVWYsRUFBTzZCLFFBRTdCN0IsRUFBTzBDLFNBQVczQyxFQUFVRyxPQUFPLGFBQ2pDQyxJQUFLQyxLQUFNUixVQUFVUyxRQUFTQyxZQUFZLEVBQU1DLGVBQWUsR0FDL0RXLE1BQU9kLEtBQU1SLFVBQVV1QixRQUV6Qm5CLEVBQU8wQyxTQUFTM0IsVUFBVWYsRUFBT2dCLFVBRWpDaEIsRUFBTzJDLGtCQUFvQjVDLEVBQVVHLE9BQU8scUJBQzFDQyxJQUFLQyxLQUFNUixVQUFVUyxRQUFTQyxZQUFZLEVBQU1DLGVBQWUsR0FDL0RxQyxjQUFleEMsS0FBTVIsVUFBVWEsUUFDL0JvQyxRQUFTekMsS0FBTVIsVUFBVXVCLE1BQ3pCMkIsVUFBVzFDLEtBQU1SLFVBQVV1QixNQUMzQjRCLFlBQWEzQyxLQUFNUixVQUFVdUIsTUFDN0I2QixXQUFZNUMsS0FBTVIsVUFBVXFELFFBQVNDLGNBQWMsR0FDbkRDLGFBQWMvQyxLQUFNUixVQUFVd0QsTUFDOUJDLE9BQVFqRCxLQUFNUixVQUFVMEQsT0FDeEJDLFlBQWFuRCxLQUFNUixVQUFVMEQsT0FDN0JFLFdBQVlwRCxLQUFNUixVQUFVMEQsT0FDNUJHLFNBQVVyRCxLQUFNUixVQUFVcUQsUUFBU0MsY0FBYyxLQUVuRGxELEVBQU8yQyxrQkFBa0I1QixVQUFVZixFQUFPMEMsVUFDMUMxQyxFQUFPMkMsa0JBQWtCNUIsVUFBVWYsRUFBT21DLE1BRzFDbkMsRUFBTzBELE9BQVMzRCxFQUFVRyxPQUFPLFVBQy9CQyxJQUFLQyxLQUFNUixVQUFVUyxRQUFTQyxZQUFZLEVBQU1DLGVBQWUsR0FDL0RvRCxVQUFXdkQsS0FBTVIsVUFBVWEsT0FBUUMsUUFBUSxHQUMzQ2tELFlBQWF4RCxLQUFNUixVQUFVdUIsUUFFL0JuQixFQUFPMEQsT0FBTzNDLFVBQVVmLEVBQU9nQixVQUUvQmhCLEVBQU82RCxhQUFlOUQsRUFBVUcsT0FBTyxpQkFDckNDLElBQUtDLEtBQU1SLFVBQVVTLFFBQVNDLFlBQVksRUFBTUMsZUFBZSxHQUMvRHVELE1BQU8xRCxLQUFNUixVQUFVd0QsS0FBTUYsYUFBY25ELEVBQVVnRSxHQUFHLFFBQ3hETixTQUFVckQsS0FBTVIsVUFBVXFELFFBQVNDLGNBQWMsS0FFbkRsRCxFQUFPNkQsYUFBYTlDLFVBQVVmLEVBQU8wRCxRQUNyQzFELEVBQU82RCxhQUFhOUMsVUFBVWYsRUFBT21DLE1BRXJDbkMsRUFBT2dFLE9BQVNqRSxFQUFVRyxPQUFPLFVBQy9CQyxJQUFLQyxLQUFNUixVQUFVUyxRQUFTQyxZQUFZLEVBQU1DLGVBQWUsR0FDL0RvRCxVQUFXdkQsS0FBTVIsVUFBVWEsT0FBUUMsUUFBUSxHQUMzQ2tELFlBQWF4RCxLQUFNUixVQUFVdUIsUUFHL0JuQixFQUFPaUUsVUFBWWxFLEVBQVVHLE9BQU8sYUFDbENDLElBQUtDLEtBQU1SLFVBQVVTLFFBQVNDLFlBQVksRUFBTUMsZUFBZSxHQUMvREgsTUFBT0EsS0FBTVIsVUFBVUEsVUFBVXNFLE1BQU0sUUFBUyxjQUNoRHZDLEtBQU12QixLQUFNUixVQUFVYSxRQUN0QjBELE9BQVEvRCxLQUFNUixVQUFVUyxTQUN4QitELE9BQVF4RSxVQUFVUyxRQUNsQmdFLFFBQVN6RSxVQUFVUyxRQUNuQmlFLFdBQVkxRSxVQUFVUyxRQUN0Qm9ELFNBQVVyRCxLQUFNUixVQUFVcUQsUUFBU0MsY0FBYyxLQUduRGxELEVBQU91RSx1QkFBeUJ4RSxFQUFVRyxPQUFPLDJCQUMvQ0MsSUFBS0MsS0FBTVIsVUFBVVMsUUFBU0MsWUFBWSxFQUFNQyxlQUFlLEdBQy9EeUMsV0FBWTVDLEtBQU1SLFVBQVVxRCxRQUFTQyxjQUFjLEdBQ25EQyxhQUFjL0MsS0FBTVIsVUFBVXdELE1BQzlCQyxPQUFRakQsS0FBTVIsVUFBVTBELE9BQ3hCQyxZQUFhbkQsS0FBTVIsVUFBVTBELE9BQzdCa0IsbUJBQW9CcEUsS0FBTVIsVUFBVWEsUUFDcENnRSxnQkFBaUJyRSxLQUFNUixVQUFVdUIsTUFDakNxQyxXQUFZcEQsS0FBTVIsVUFBVTBELE9BQzVCRyxTQUFVckQsS0FBTVIsVUFBVXFELFFBQVNDLGNBQWMsS0FFbkRsRCxFQUFPdUUsdUJBQXVCeEQsVUFBVWYsRUFBT1ksT0FDL0NaLEVBQU91RSx1QkFBdUJ4RCxVQUFVZixFQUFPbUMsTUFFL0NuQyxFQUFPMEUsZ0JBQWtCM0UsRUFBVUcsT0FBTyxtQkFDeEN5RSxrQkFBbUJ2RSxLQUFNUixVQUFVYSxRQUNuQ21FLFlBQWF4RSxLQUFNUixVQUFVYSxRQUM3Qm9FLFNBQVV6RSxLQUFNUixVQUFVUyxTQUMxQnlFLFNBQVUxRSxLQUFNUixVQUFVUyxTQUMxQjBFLFdBQVkzRSxLQUFNUixVQUFVYSxVQUc5QlQsRUFBT2dGLFlBQWNqRixFQUFVRyxPQUFPLGlCQUNwQ0MsSUFBS0MsS0FBTVIsVUFBVVMsUUFBU0MsWUFBWSxFQUFNQyxlQUFlLEdBQy9Eb0Usa0JBQW1CdkUsS0FBTVIsVUFBVWEsUUFDbkN3RSxRQUFTN0UsS0FBTVIsVUFBVXNFLE1BQU0sVUFBVyxVQUFXLFlBSXJESixNQUFPMUQsS0FBTVIsVUFBVWEsVUFhekJULEVBQU9rRixjQUFnQm5GLEVBQVVHLE9BQU8saUJBQ3RDQyxJQUFLQyxLQUFNUixVQUFVUyxRQUFTQyxZQUFZLEVBQU1DLGVBQWUsR0FDL0RvQixLQUFNdkIsS0FBTVIsVUFBVWEsT0FBUUMsUUFBUSxHQUN0Q3lELE9BQVEvRCxLQUFNUixVQUFVYSxVQUduQlQsRUFHVG1GLE9BQU9DLFFBQVV0RiIsImZpbGUiOiJkYi1zdHJ1Y3R1cmUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBTZXF1ZWxpemUgPSByZXF1aXJlKCdzZXF1ZWxpemUnKVxuXG5mdW5jdGlvbiBhZGRUYWJsZXMgKHNlcXVlbGl6ZSwgbW9kZWxzKSB7XG4gIC8vIG1vZGVscy5Vc2VyID0gc2VxdWVsaXplLmRlZmluZSgnVXNlcicsIC4uLilcblxuICBtb2RlbHMuU3ViamVjdCA9IHNlcXVlbGl6ZS5kZWZpbmUoJ3N1YmplY3QnLCB7XG4gICAgaWQ6IHt0eXBlOiBTZXF1ZWxpemUuSU5URUdFUiwgcHJpbWFyeUtleTogdHJ1ZSwgYXV0b0luY3JlbWVudDogdHJ1ZX0sXG4gICAgc3ViamVjdDoge3R5cGU6IFNlcXVlbGl6ZS5TVFJJTkcsIHVuaXF1ZTogdHJ1ZX0sXG4gICAgZGVzY3JpcHRpb246IHt0eXBlOiBTZXF1ZWxpemUuU1RSSU5HfVxuICB9KVxuXG4gIG1vZGVscy5Ub3BpYyA9IHNlcXVlbGl6ZS5kZWZpbmUoJ3RvcGljJywge1xuICAgIGlkOiB7dHlwZTogU2VxdWVsaXplLklOVEVHRVIsIHByaW1hcnlLZXk6IHRydWUsIGF1dG9JbmNyZW1lbnQ6IHRydWV9LFxuICAgIHRvcGljOiB7dHlwZTogU2VxdWVsaXplLlNUUklORywgdW5pcXVlOiB0cnVlfSxcbiAgICBkZXNjcmlwdGlvbjoge3R5cGU6IFNlcXVlbGl6ZS5TVFJJTkd9LFxuICAgIHRvcGljTm86IHt0eXBlOiBTZXF1ZWxpemUuSU5URUdFUn1cbiAgfSlcbiAgbW9kZWxzLlRvcGljLmJlbG9uZ3NUbyhtb2RlbHMuU3ViamVjdClcblxuICBtb2RlbHMuU3VidG9waWMgPSBzZXF1ZWxpemUuZGVmaW5lKCdzdWJ0b3BpY3MnLCB7XG4gICAgaWQ6IHt0eXBlOiBTZXF1ZWxpemUuSU5URUdFUiwgcHJpbWFyeUtleTogdHJ1ZSwgYXV0b0luY3JlbWVudDogdHJ1ZX0sXG4gICAgc3VidG9waWM6IHt0eXBlOiBTZXF1ZWxpemUuU1RSSU5HLCB1bmlxdWU6IHRydWV9LFxuICAgIGRlc2NyaXB0aW9uOiB7dHlwZTogU2VxdWVsaXplLlNUUklOR30sXG4gICAgZGF0YToge3R5cGU6IFNlcXVlbGl6ZS5URVhUKCdsb25nJyl9LFxuICAgIHN1YnRvcGljTm86IHt0eXBlOiBTZXF1ZWxpemUuSU5URUdFUn1cbiAgfSlcbiAgbW9kZWxzLlN1YnRvcGljLmJlbG9uZ3NUbyhtb2RlbHMuVG9waWMpXG5cbiAgbW9kZWxzLlRhZyA9IHNlcXVlbGl6ZS5kZWZpbmUoJ3RhZycsIHtcbiAgICBpZDoge3R5cGU6IFNlcXVlbGl6ZS5JTlRFR0VSLCBwcmltYXJ5S2V5OiB0cnVlLCBhdXRvSW5jcmVtZW50OiB0cnVlfSxcbiAgICB0YWc6IHt0eXBlOiBTZXF1ZWxpemUuU1RSSU5HLCB1bmlxdWU6IHRydWV9LFxuICAgIGRlc2NyaXB0aW9uOiB7dHlwZTogU2VxdWVsaXplLlNUUklOR31cbiAgfSlcbiAgbW9kZWxzLlRhZy5iZWxvbmdzVG8obW9kZWxzLlRvcGljKVxuXG4gIG1vZGVscy5Ub3BpY0RlcGVuZGVuY3kgPSBzZXF1ZWxpemUuZGVmaW5lKCd0b3BpY0RlcGVuZGVuY3knLCB7XG4gICAgaWQ6IHt0eXBlOiBTZXF1ZWxpemUuSU5URUdFUiwgcHJpbWFyeUtleTogdHJ1ZSwgYXV0b0luY3JlbWVudDogdHJ1ZX0sXG4gICAgdG9waWNJZDoge1xuICAgICAgdHlwZTogU2VxdWVsaXplLklOVEVHRVIsXG4gICAgICByZWZlcmVuY2VzOiB7XG4gICAgICAgIG1vZGVsOiBtb2RlbHMuVG9waWMsXG4gICAgICAgIGtleTogJ2lkJ1xuICAgICAgfSxcbiAgICAgIHVuaXF1ZTogJ2NvbXBvc2l0ZUluZGV4J1xuICAgIH0sXG4gICAgZGVwZW5kZW5jeUlkOiB7XG4gICAgICB0eXBlOiBTZXF1ZWxpemUuSU5URUdFUixcbiAgICAgIHJlZmVyZW5jZXM6IHtcbiAgICAgICAgbW9kZWw6IG1vZGVscy5Ub3BpYyxcbiAgICAgICAga2V5OiAnaWQnXG4gICAgICB9LFxuICAgICAgdW5pcXVlOiAnY29tcG9zaXRlSW5kZXgnXG4gICAgfSxcbiAgICBkZXNjcmlwdGlvbjogU2VxdWVsaXplLlNUUklOR1xuICB9KVxuXG4gIG1vZGVscy5TY2hvb2wgPSBzZXF1ZWxpemUuZGVmaW5lKCdzY2hvb2xzJywge1xuICAgIGlkOiB7dHlwZTogU2VxdWVsaXplLklOVEVHRVIsIHByaW1hcnlLZXk6IHRydWUsIGF1dG9JbmNyZW1lbnQ6IHRydWV9LFxuICAgIGlkZW50aWZpZXI6IHt0eXBlOiBTZXF1ZWxpemUuU1RSSU5HLCB1bmlxdWU6IHRydWV9LFxuICAgIG5hbWU6IHt0eXBlOiBTZXF1ZWxpemUuVEVYVH0sXG4gICAgYWRkcmVzczoge3R5cGU6IFNlcXVlbGl6ZS5URVhUfSxcbiAgICBwaG9uZToge3R5cGU6IFNlcXVlbGl6ZS5TVFJJTkd9LFxuICAgIGxvZ286IHt0eXBlOiBTZXF1ZWxpemUuVEVYVH1cbiAgfSlcblxuICBtb2RlbHMuVXNlciA9IHNlcXVlbGl6ZS5kZWZpbmUoJ3VzZXJzJywge1xuICAgIGlkOiB7dHlwZTogU2VxdWVsaXplLklOVEVHRVIsIHByaW1hcnlLZXk6IHRydWUsIGF1dG9JbmNyZW1lbnQ6IHRydWV9LFxuICAgIHVzZXJuYW1lOiB7dHlwZTogU2VxdWVsaXplLlNUUklOR30sIC8vIFRoZSBwYWlyIG9mICh1c2VybmFtZSwgc2Nob29sSWQpIHNob3VsZCBiZSB1bmlxdWUsIHdlIHNob3VsZCB1c2UgTXlTUUwgY29tcG9zaXRlIGtleSBmb3IgdGhpc1xuICAgIHNhbHRlZFBhc3M6IHt0eXBlOiBTZXF1ZWxpemUuU1RSSU5HfSxcbiAgICBzYWx0OiB7dHlwZTogU2VxdWVsaXplLlNUUklOR30sXG4gICAgZW1haWw6IHt0eXBlOiBTZXF1ZWxpemUuU1RSSU5HfSxcbiAgICBmdWxsTmFtZToge3R5cGU6IFNlcXVlbGl6ZS5TVFJJTkd9LFxuICAgIGdyYWRlOiB7dHlwZTogU2VxdWVsaXplLlNUUklOR31cbiAgfSlcbiAgbW9kZWxzLlVzZXIuYmVsb25nc1RvKG1vZGVscy5TY2hvb2wpXG5cbiAgbW9kZWxzLkV4ZXJjaXNlID0gc2VxdWVsaXplLmRlZmluZSgnZXhlcmNpc2VzJywge1xuICAgIGlkOiB7dHlwZTogU2VxdWVsaXplLklOVEVHRVIsIHByaW1hcnlLZXk6IHRydWUsIGF1dG9JbmNyZW1lbnQ6IHRydWV9LFxuICAgIGRhdGE6IHt0eXBlOiBTZXF1ZWxpemUuVEVYVH1cbiAgfSlcbiAgbW9kZWxzLkV4ZXJjaXNlLmJlbG9uZ3NUbyhtb2RlbHMuU3VidG9waWMpXG5cbiAgbW9kZWxzLkdlbmVyYXRlZEV4ZXJjaXNlID0gc2VxdWVsaXplLmRlZmluZSgnZ2VuZXJhdGVkRXhlcmNpc2UnLCB7XG4gICAgaWQ6IHt0eXBlOiBTZXF1ZWxpemUuSU5URUdFUiwgcHJpbWFyeUtleTogdHJ1ZSwgYXV0b0luY3JlbWVudDogdHJ1ZX0sXG4gICAgZXhlcmNpc2VIYXNoOiB7dHlwZTogU2VxdWVsaXplLlNUUklOR30sXG4gICAga25vd25zOiB7dHlwZTogU2VxdWVsaXplLlRFWFR9LCAvLyBKU09OOiBhcnJheSBvZiBrbm93bnMgaS5lLiBbe3g6IDV9LCB7eDogM30sIHt4OiA3fV0gKHRoaXMgaXMgYW5zd2VyIGtleSlcbiAgICB1bmtub3duczoge3R5cGU6IFNlcXVlbGl6ZS5URVhUfSwgLy8gSlNPTjogYXJyYXkgb2YgdW5rbm93bnMgaS5lLiBbe2E6IDEsIGI6IDN9LCB7YTogNywgYjogM31dXG4gICAgdXNlckFuc3dlcjoge3R5cGU6IFNlcXVlbGl6ZS5URVhUfSwgLy8gSlNPTjogYXJyYXkgb2Yga25vd25zIGkuZS4gW3t4OiA1fSwge3g6IDN9LCB7eDogN31dXG4gICAgc3VibWl0dGVkOiB7dHlwZTogU2VxdWVsaXplLkJPT0xFQU4sIGRlZmF1bHRWYWx1ZTogZmFsc2V9LCAvLyBXaGV0aGVyIHRoaXMgZ2VuZXJhdGVkIGV4ZXJjaXNlIGlzIGNvbXBsZXRlIG9yIG5vdFxuICAgIHN1Ym1pdHRlZEF0OiB7dHlwZTogU2VxdWVsaXplLkRBVEV9LFxuICAgIHNjb3JlOiB7dHlwZTogU2VxdWVsaXplLkZMT0FUfSxcbiAgICB0aW1lRmluaXNoOiB7dHlwZTogU2VxdWVsaXplLkZMT0FUfSxcbiAgICBpZGVhbFRpbWU6IHt0eXBlOiBTZXF1ZWxpemUuRkxPQVR9LFxuICAgIG9uQ2xvdWQ6IHt0eXBlOiBTZXF1ZWxpemUuQk9PTEVBTiwgZGVmYXVsdFZhbHVlOiB0cnVlfVxuICB9KVxuICBtb2RlbHMuR2VuZXJhdGVkRXhlcmNpc2UuYmVsb25nc1RvKG1vZGVscy5FeGVyY2lzZSlcbiAgbW9kZWxzLkdlbmVyYXRlZEV4ZXJjaXNlLmJlbG9uZ3NUbyhtb2RlbHMuVXNlcilcblxuICAvLyBMb2NhbGx5IGhvc3RlZCB2aWRlb3NcbiAgbW9kZWxzLlZpZGVvcyA9IHNlcXVlbGl6ZS5kZWZpbmUoJ3ZpZGVvcycsIHtcbiAgICBpZDoge3R5cGU6IFNlcXVlbGl6ZS5JTlRFR0VSLCBwcmltYXJ5S2V5OiB0cnVlLCBhdXRvSW5jcmVtZW50OiB0cnVlfSxcbiAgICBmaWxlbmFtZToge3R5cGU6IFNlcXVlbGl6ZS5TVFJJTkcsIHVuaXF1ZTogdHJ1ZX0sXG4gICAgc291cmNlTGluazoge3R5cGU6IFNlcXVlbGl6ZS5URVhUfVxuICB9KVxuICBtb2RlbHMuVmlkZW9zLmJlbG9uZ3NUbyhtb2RlbHMuU3VidG9waWMpXG5cbiAgbW9kZWxzLldhdGNoZWRWaWRlbyA9IHNlcXVlbGl6ZS5kZWZpbmUoJ3dhdGNoZWRWaWRlb3MnLCB7XG4gICAgaWQ6IHt0eXBlOiBTZXF1ZWxpemUuSU5URUdFUiwgcHJpbWFyeUtleTogdHJ1ZSwgYXV0b0luY3JlbWVudDogdHJ1ZX0sXG4gICAgZGF0ZToge3R5cGU6IFNlcXVlbGl6ZS5EQVRFLCBkZWZhdWx0VmFsdWU6IHNlcXVlbGl6ZS5mbignTk9XJyl9LFxuICAgIG9uQ2xvdWQ6IHt0eXBlOiBTZXF1ZWxpemUuQk9PTEVBTiwgZGVmYXVsdFZhbHVlOiB0cnVlfVxuICB9KVxuICBtb2RlbHMuV2F0Y2hlZFZpZGVvLmJlbG9uZ3NUbyhtb2RlbHMuVmlkZW9zKVxuICBtb2RlbHMuV2F0Y2hlZFZpZGVvLmJlbG9uZ3NUbyhtb2RlbHMuVXNlcilcblxuICBtb2RlbHMuSW1hZ2VzID0gc2VxdWVsaXplLmRlZmluZSgnaW1hZ2VzJywge1xuICAgIGlkOiB7dHlwZTogU2VxdWVsaXplLklOVEVHRVIsIHByaW1hcnlLZXk6IHRydWUsIGF1dG9JbmNyZW1lbnQ6IHRydWV9LFxuICAgIGZpbGVuYW1lOiB7dHlwZTogU2VxdWVsaXplLlNUUklORywgdW5pcXVlOiB0cnVlfSxcbiAgICBzb3VyY2VMaW5rOiB7dHlwZTogU2VxdWVsaXplLlRFWFR9XG4gIH0pXG5cbiAgbW9kZWxzLkFuYWx5dGljcyA9IHNlcXVlbGl6ZS5kZWZpbmUoJ2FuYWx5dGljcycsIHtcbiAgICBpZDoge3R5cGU6IFNlcXVlbGl6ZS5JTlRFR0VSLCBwcmltYXJ5S2V5OiB0cnVlLCBhdXRvSW5jcmVtZW50OiB0cnVlfSxcbiAgICB0eXBlOiB7dHlwZTogU2VxdWVsaXplLlNlcXVlbGl6ZS5FTlVNKFsndmlkZW8nLCAnZXhlcmNpc2UnXSl9LFxuICAgIGtleToge3R5cGU6IFNlcXVlbGl6ZS5TVFJJTkd9LFxuICAgIHZhbHVlOiB7dHlwZTogU2VxdWVsaXplLklOVEVHRVJ9LFxuICAgIHVzZXJJZDogU2VxdWVsaXplLklOVEVHRVIsXG4gICAgdmlkZW9JZDogU2VxdWVsaXplLklOVEVHRVIsXG4gICAgZXhlcmNpc2VJZDogU2VxdWVsaXplLklOVEVHRVIsXG4gICAgb25DbG91ZDoge3R5cGU6IFNlcXVlbGl6ZS5CT09MRUFOLCBkZWZhdWx0VmFsdWU6IHRydWV9XG4gIH0pXG5cbiAgbW9kZWxzLkdlbmVyYXRlZFRvcGljRXhlcmNpc2UgPSBzZXF1ZWxpemUuZGVmaW5lKCdnZW5lcmF0ZWRUb3BpY0V4ZXJjaXNlcycsIHtcbiAgICBpZDoge3R5cGU6IFNlcXVlbGl6ZS5JTlRFR0VSLCBwcmltYXJ5S2V5OiB0cnVlLCBhdXRvSW5jcmVtZW50OiB0cnVlfSxcbiAgICBzdWJtaXR0ZWQ6IHt0eXBlOiBTZXF1ZWxpemUuQk9PTEVBTiwgZGVmYXVsdFZhbHVlOiBmYWxzZX0sXG4gICAgc3VibWl0dGVkQXQ6IHt0eXBlOiBTZXF1ZWxpemUuREFURX0sXG4gICAgc2NvcmU6IHt0eXBlOiBTZXF1ZWxpemUuRkxPQVR9LFxuICAgIHRpbWVGaW5pc2g6IHt0eXBlOiBTZXF1ZWxpemUuRkxPQVR9LFxuICAgIHRvcGljRXhlcmNpc2VIYXNoOiB7dHlwZTogU2VxdWVsaXplLlNUUklOR30sXG4gICAgZXhlcmNpc2VEZXRhaWw6IHt0eXBlOiBTZXF1ZWxpemUuVEVYVH0sXG4gICAgaWRlYWxUaW1lOiB7dHlwZTogU2VxdWVsaXplLkZMT0FUfSxcbiAgICBvbkNsb3VkOiB7dHlwZTogU2VxdWVsaXplLkJPT0xFQU4sIGRlZmF1bHRWYWx1ZTogdHJ1ZX1cbiAgfSlcbiAgbW9kZWxzLkdlbmVyYXRlZFRvcGljRXhlcmNpc2UuYmVsb25nc1RvKG1vZGVscy5Ub3BpYylcbiAgbW9kZWxzLkdlbmVyYXRlZFRvcGljRXhlcmNpc2UuYmVsb25nc1RvKG1vZGVscy5Vc2VyKVxuXG4gIG1vZGVscy5TeW5jaHJvbml6YXRpb24gPSBzZXF1ZWxpemUuZGVmaW5lKCdzeW5jaHJvbml6YXRpb24nLCB7XG4gICAgc2Nob29sSWRlbnRpZmllcjoge3R5cGU6IFNlcXVlbGl6ZS5TVFJJTkd9LCAvLyBJZGVudGlmeSB3aGljaCBzY2hvb2xcbiAgICBzZXJ2ZXJIYXNoOiB7dHlwZTogU2VxdWVsaXplLlNUUklOR30sIC8vIElkZW50aWZ5IHdoaWNoIHZlcnNpb24gb2Ygc2Nob29sIHNlcnZlclxuICAgIGxvY2FsSWQ6IHt0eXBlOiBTZXF1ZWxpemUuSU5URUdFUn0sXG4gICAgY2xvdWRJZDoge3R5cGU6IFNlcXVlbGl6ZS5JTlRFR0VSfSxcbiAgICB0YWJsZU5hbWU6IHt0eXBlOiBTZXF1ZWxpemUuU1RSSU5HfVxuICB9KVxuXG4gIG1vZGVscy5TeW5jSGlzdG9yeSA9IHNlcXVlbGl6ZS5kZWZpbmUoJ3N5bmNIaXN0b3JpZXMnLCB7XG4gICAgaWQ6IHt0eXBlOiBTZXF1ZWxpemUuSU5URUdFUiwgcHJpbWFyeUtleTogdHJ1ZSwgYXV0b0luY3JlbWVudDogdHJ1ZX0sXG4gICAgc2Nob29sSWRlbnRpZmllcjoge3R5cGU6IFNlcXVlbGl6ZS5TVFJJTkd9LFxuICAgIHN0YXR1czoge3R5cGU6IFNlcXVlbGl6ZS5FTlVNKFsnU3luY2luZycsICdTdWNjZXNzJywgJ0ZhaWxlZCddKX0sXG4gICAgLy8gRGF0ZSBvZiBsYXN0IHN5bmNocm9uaXphdGlvbi4gSW50ZW50aW9uYWxseSBTVFJJTkcgdHlwZSBpbnN0ZWFkIG9mIERBVEVcbiAgICAvLyBiZWNhdXNlIHdlJ3JlIHN0b3JpbmcgbG9jYWwgc2VydmVyJ3MgZGF0ZSwgbm90IG91cnMuIEFuZCB0byBhdm9pZCBjb25mdXNpb25cbiAgICAvLyB3aXRoIHRpbWV6b25lIGNvbnZlcnNpb24sIFNUUklORyBpcyB3YXkgZWFzaWVyIHRvIHdvcmsgd2l0aCBpbiB0aGlzIGNhc2VcbiAgICBkYXRlOiB7dHlwZTogU2VxdWVsaXplLlNUUklOR31cbiAgfSlcblxuICAvLyBJbmZvcm1hdGlvbiB0aGF0IGJlbG9uZ3Mgb25seSB0byBsb2NhbCBzZXJ2ZXIgYW5kIG5ldmVyIHN5bmNlZCB0byBjbG91ZC5cbiAgLy8gV2hlbiB3ZSBzeW5jIGZyb20gY2xvdWQgdG8gbG9jYWwsIHdlIGVzc2VudGlhbGx5IGRvIG15c3FsIGR1bXAgYW5kIHRoZW5cbiAgLy8gcmVzdG9yZSBpdCBvbiB0aGUgbG9jYWwgc2VydmVyLCBoZW5jZSB0aGlzIHRhYmxlIGlzIGVtcHR5IGFnYWluIG9uIGEgbmV3bHkgc3luY2VkIGxvY2FsLlxuICAvKlxuICAgIEN1cnJlbnRseSB0aGlzIGlzIHVzZWQgdG8gc3RvcmU6XG4gICAge1xuICAgICAga2V5OiAnU0VSVkVSX0hBU0gnXG4gICAgICB2YWx1ZTogW2hhc2hfdmFsdWVdXG4gICAgfVxuICAqL1xuICBtb2RlbHMuTG9jYWxNZXRhRGF0YSA9IHNlcXVlbGl6ZS5kZWZpbmUoJ2xvY2FsTWV0YURhdGEnLCB7XG4gICAgaWQ6IHt0eXBlOiBTZXF1ZWxpemUuSU5URUdFUiwgcHJpbWFyeUtleTogdHJ1ZSwgYXV0b0luY3JlbWVudDogdHJ1ZX0sXG4gICAga2V5OiB7dHlwZTogU2VxdWVsaXplLlNUUklORywgdW5pcXVlOiB0cnVlfSxcbiAgICB2YWx1ZToge3R5cGU6IFNlcXVlbGl6ZS5TVFJJTkd9XG4gIH0pXG5cbiAgcmV0dXJuIG1vZGVsc1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFkZFRhYmxlc1xuIl19
