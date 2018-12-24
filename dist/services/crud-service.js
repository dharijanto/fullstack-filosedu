var util=require("util"),_=require("lodash"),log=require("npmlog");const TAG="CRUDService";class CRUDService{constructor(e,r){this._sequelize=e,this._models=r}getSequelize(){return this._sequelize}create({modelName:e,data:r,trx:t}){if(log.verbose(TAG,`create(): modelName=${e} data=${JSON.stringify(r)}`),!(r=_.omit(r,"id")))throw new Error("data has to be specified!");return this._models[e].create(r,{transaction:t}).then(e=>({status:!0,data:e.get({plain:!0})})).catch(e=>{if("SequelizeUniqueConstraintError"===e.name)return{status:!1,errMessage:"Unique Constraint Error"};if("SequelizeForeignKeyConstraintError"===e.name)return{status:!1,errMessage:"Foreign Key Constraint Error!"};throw e})}read({modelName:e,searchClause:r,order:t=[],include:a,limit:s,trx:i}){if(!r)throw new Error("searchClause has to be specified!");return log.verbose(TAG,`read(): modelName=${e} searchClause=${JSON.stringify(r)}`),this._models[e].findAll({where:r,order:t,include:a,limit:s,transaction:i}).then(e=>e.length>0?{status:!0,data:e.map(e=>e.get({plain:!0}))}:{status:!1,errMessage:"Data not found"})}readOne({modelName:e,searchClause:r,order:t,include:a,trx:s}){return this.read({modelName:e,searchClause:r,order:t,include:a,trx:s}).then(e=>e.status?{status:!0,data:e.data[0]}:e)}update({modelName:e,data:r,trx:t}){if(!("id"in r))throw new Error("data needs to have id!");return log.verbose(TAG,`update(): modelName=${e} data=${JSON.stringify(r)}`),this._models[e].update(r,{where:{id:r.id},transaction:t}).spread(e=>({status:!0})).catch(e=>{if("SequelizeUniqueConstraintError"===e.name)return{status:!1,errMessage:"Unique Constraint Error"};if("SequelizeForeignKeyConstraintError"===e.name)return{status:!1,errMessage:"Foreign Key Constraint Error!"};throw e})}delete({modelName:e,data:r}){return log.verbose(TAG,`delete(): modelName=${e} data=${JSON.stringify(r)}`),this._models[e].destroy({where:{id:r.id}}).then(e=>e>0?{status:!0}:{status:!1,errMessage:"Data Not Found!"}).catch(e=>{if("SequelizeUniqueConstraintError"===e.name)return{status:!1,errMessage:"Unique Constraint Error"};if("SequelizeForeignKeyConstraintError"===e.name)return{status:!1,errMessage:"Foreign Key Constraint Error!"};throw e})}}module.exports=CRUDService;
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9zZXJ2aWNlcy9jcnVkLXNlcnZpY2UuanMiXSwibmFtZXMiOlsidXRpbCIsInJlcXVpcmUiLCJfIiwibG9nIiwiVEFHIiwiQ1JVRFNlcnZpY2UiLCJbb2JqZWN0IE9iamVjdF0iLCJzZXF1ZWxpemUiLCJtb2RlbHMiLCJ0aGlzIiwiX3NlcXVlbGl6ZSIsIl9tb2RlbHMiLCJtb2RlbE5hbWUiLCJkYXRhIiwidHJ4IiwidmVyYm9zZSIsIkpTT04iLCJzdHJpbmdpZnkiLCJvbWl0IiwiRXJyb3IiLCJjcmVhdGUiLCJ0cmFuc2FjdGlvbiIsInRoZW4iLCJjcmVhdGVkRGF0YSIsInN0YXR1cyIsImdldCIsInBsYWluIiwiY2F0Y2giLCJlcnIiLCJuYW1lIiwiZXJyTWVzc2FnZSIsInNlYXJjaENsYXVzZSIsIm9yZGVyIiwiaW5jbHVkZSIsImxpbWl0IiwiZmluZEFsbCIsIndoZXJlIiwicmVhZERhdGEiLCJsZW5ndGgiLCJtYXAiLCJyZWFkIiwicmVzcCIsInVwZGF0ZSIsImlkIiwic3ByZWFkIiwiY291bnQiLCJkZXN0cm95IiwibnVtRGVsZXRlZCIsIm1vZHVsZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiJBQUFBLElBQUlBLEtBQU9DLFFBQVEsUUFFZkMsRUFBSUQsUUFBUSxVQUNaRSxJQUFNRixRQUFRLFVBRWxCLE1BQU1HLElBQU0sb0JBRVpDLFlBQ0VDLFlBQWFDLEVBQVdDLEdBQ3RCQyxLQUFLQyxXQUFhSCxFQUNsQkUsS0FBS0UsUUFBVUgsRUFHakJGLGVBQ0UsT0FBT0csS0FBS0MsV0FHZEosUUFBUU0sVUFBQ0EsRUFBU0MsS0FBRUEsRUFBSUMsSUFBRUEsSUFHeEIsR0FGQVgsSUFBSVksUUFBUVgsMkJBQTRCUSxVQUFrQkksS0FBS0MsVUFBVUosUUFDekVBLEVBQU9YLEVBQUVnQixLQUFLTCxFQUFNLE9BRWxCLE1BQU0sSUFBSU0sTUFBTSw2QkFHbEIsT0FBT1YsS0FBS0UsUUFBUUMsR0FBV1EsT0FBT1AsR0FBT1EsWUFBYVAsSUFBTVEsS0FBS0MsS0FDM0RDLFFBQVEsRUFBTVgsS0FBTVUsRUFBWUUsS0FBS0MsT0FBTyxPQUNuREMsTUFBTUMsSUFDUCxHQUFpQixtQ0FBYkEsRUFBSUMsS0FDTixPQUFRTCxRQUFRLEVBQU9NLFdBQVksMkJBQzlCLEdBQWlCLHVDQUFiRixFQUFJQyxLQUNiLE9BQVFMLFFBQVEsRUFBT00sV0FBWSxpQ0FFbkMsTUFBTUYsSUFVWnRCLE1BQU1NLFVBQUNBLEVBQVNtQixhQUFFQSxFQUFZQyxNQUFFQSxLQUFVQyxRQUFFQSxFQUFPQyxNQUFFQSxFQUFLcEIsSUFBRUEsSUFDMUQsSUFBS2lCLEVBQ0gsTUFBTSxJQUFJWixNQUFNLHFDQUdsQixPQURBaEIsSUFBSVksUUFBUVgseUJBQTBCUSxrQkFBMEJJLEtBQUtDLFVBQVVjLE1BQ3hFdEIsS0FBS0UsUUFBUUMsR0FBV3VCLFNBQVNDLE1BQU9MLEVBQWNDLE1BQUFBLEVBQU9DLFFBQUFBLEVBQVNDLE1BQUFBLEVBQU9iLFlBQWFQLElBQU1RLEtBQUtlLEdBQ3RHQSxFQUFTQyxPQUFTLEdBQ1pkLFFBQVEsRUFBTVgsS0FBTXdCLEVBQVNFLElBQUkxQixHQUFRQSxFQUFLWSxLQUFLQyxPQUFPLE9BRTFERixRQUFRLEVBQU9NLFdBQVksbUJBS3pDeEIsU0FBU00sVUFBQ0EsRUFBU21CLGFBQUVBLEVBQVlDLE1BQUVBLEVBQUtDLFFBQUVBLEVBQU9uQixJQUFFQSxJQUNqRCxPQUFPTCxLQUFLK0IsTUFBTTVCLFVBQUFBLEVBQVdtQixhQUFBQSxFQUFjQyxNQUFBQSxFQUFPQyxRQUFBQSxFQUFTbkIsSUFBQUEsSUFBTVEsS0FBS21CLEdBQ2hFQSxFQUFLakIsUUFDQ0EsUUFBUSxFQUFNWCxLQUFNNEIsRUFBSzVCLEtBQUssSUFFL0I0QixHQUtibkMsUUFBUU0sVUFBQ0EsRUFBU0MsS0FBRUEsRUFBSUMsSUFBRUEsSUFDeEIsS0FBTSxPQUFRRCxHQUNaLE1BQU0sSUFBSU0sTUFBTSwwQkFJbEIsT0FGQWhCLElBQUlZLFFBQVFYLDJCQUE0QlEsVUFBa0JJLEtBQUtDLFVBQVVKLE1BRWxFSixLQUFLRSxRQUFRQyxHQUFXOEIsT0FBTzdCLEdBQU91QixPQUFRTyxHQUFJOUIsRUFBSzhCLElBQUt0QixZQUFhUCxJQUFNOEIsT0FBUUMsS0FDcEZyQixRQUFRLEtBQ2ZHLE1BQU1DLElBQ1AsR0FBaUIsbUNBQWJBLEVBQUlDLEtBQ04sT0FBUUwsUUFBUSxFQUFPTSxXQUFZLDJCQUM5QixHQUFpQix1Q0FBYkYsRUFBSUMsS0FDYixPQUFRTCxRQUFRLEVBQU9NLFdBQVksaUNBRW5DLE1BQU1GLElBS1p0QixRQUFRTSxVQUFDQSxFQUFTQyxLQUFFQSxJQUVsQixPQURBVixJQUFJWSxRQUFRWCwyQkFBNEJRLFVBQWtCSSxLQUFLQyxVQUFVSixNQUNsRUosS0FBS0UsUUFBUUMsR0FBV2tDLFNBQVNWLE9BQVFPLEdBQUk5QixFQUFLOEIsTUFBTXJCLEtBQUt5QixHQUM5REEsRUFBYSxHQUNQdkIsUUFBUSxJQUVSQSxRQUFRLEVBQU9NLFdBQVksb0JBRXBDSCxNQUFNQyxJQUNQLEdBQWlCLG1DQUFiQSxFQUFJQyxLQUNOLE9BQVFMLFFBQVEsRUFBT00sV0FBWSwyQkFDOUIsR0FBaUIsdUNBQWJGLEVBQUlDLEtBQ2IsT0FBUUwsUUFBUSxFQUFPTSxXQUFZLGlDQUVuQyxNQUFNRixLQU1kb0IsT0FBT0MsUUFBVTVDIiwiZmlsZSI6InNlcnZpY2VzL2NydWQtc2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciB1dGlsID0gcmVxdWlyZSgndXRpbCcpXG5cbnZhciBfID0gcmVxdWlyZSgnbG9kYXNoJylcbnZhciBsb2cgPSByZXF1aXJlKCducG1sb2cnKVxuXG5jb25zdCBUQUcgPSAnQ1JVRFNlcnZpY2UnXG5cbmNsYXNzIENSVURTZXJ2aWNlIHtcbiAgY29uc3RydWN0b3IgKHNlcXVlbGl6ZSwgbW9kZWxzKSB7XG4gICAgdGhpcy5fc2VxdWVsaXplID0gc2VxdWVsaXplXG4gICAgdGhpcy5fbW9kZWxzID0gbW9kZWxzXG4gIH1cblxuICBnZXRTZXF1ZWxpemUgKCkge1xuICAgIHJldHVybiB0aGlzLl9zZXF1ZWxpemVcbiAgfVxuXG4gIGNyZWF0ZSAoe21vZGVsTmFtZSwgZGF0YSwgdHJ4fSkge1xuICAgIGxvZy52ZXJib3NlKFRBRywgYGNyZWF0ZSgpOiBtb2RlbE5hbWU9JHttb2RlbE5hbWV9IGRhdGE9JHtKU09OLnN0cmluZ2lmeShkYXRhKX1gKVxuICAgIGRhdGEgPSBfLm9taXQoZGF0YSwgJ2lkJykgLy8gV2Ugd2FudCB0byBhbGxvdyBlYXN5IGR1cGxpY2F0aW9uLCBzbyB3ZSBhc3N1bWUgdGhhdCBhZGRpbmcgZGF0YSB3aXRoIHRoZSBzYW1lIGlkIG1lYW5zIGNyZWF0aW5nIGEgZHVwbGljYXRlXG4gICAgaWYgKCFkYXRhKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2RhdGEgaGFzIHRvIGJlIHNwZWNpZmllZCEnKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9tb2RlbHNbbW9kZWxOYW1lXS5jcmVhdGUoZGF0YSwge3RyYW5zYWN0aW9uOiB0cnh9KS50aGVuKGNyZWF0ZWREYXRhID0+IHtcbiAgICAgIHJldHVybiB7c3RhdHVzOiB0cnVlLCBkYXRhOiBjcmVhdGVkRGF0YS5nZXQoe3BsYWluOiB0cnVlfSl9XG4gICAgfSkuY2F0Y2goZXJyID0+IHtcbiAgICAgIGlmIChlcnIubmFtZSA9PT0gJ1NlcXVlbGl6ZVVuaXF1ZUNvbnN0cmFpbnRFcnJvcicpIHtcbiAgICAgICAgcmV0dXJuIHtzdGF0dXM6IGZhbHNlLCBlcnJNZXNzYWdlOiAnVW5pcXVlIENvbnN0cmFpbnQgRXJyb3InfVxuICAgICAgfSBlbHNlIGlmIChlcnIubmFtZSA9PT0gJ1NlcXVlbGl6ZUZvcmVpZ25LZXlDb25zdHJhaW50RXJyb3InKSB7XG4gICAgICAgIHJldHVybiB7c3RhdHVzOiBmYWxzZSwgZXJyTWVzc2FnZTogJ0ZvcmVpZ24gS2V5IENvbnN0cmFpbnQgRXJyb3IhJ31cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IGVyclxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICAvLyBJZiB0aGVyZSdzIGRhdGEgdG8gYmUgcmVhZDpcbiAgLy8ge3N0YXR1czogdHJ1ZSwgZGF0YTogW119XG4gIC8vXG4gIC8vIElmIHRoZXJlJ3Mgbm8gZGF0YTpcbiAgLy8ge3N0YXR1czogZmFsc2UsIGVyckNvZGU6IC4uLiwgZXJyTWVzc2FnZTogLi4uLCBlcnJEYXRhfVxuICByZWFkICh7bW9kZWxOYW1lLCBzZWFyY2hDbGF1c2UsIG9yZGVyID0gW10sIGluY2x1ZGUsIGxpbWl0LCB0cnh9KSB7XG4gICAgaWYgKCFzZWFyY2hDbGF1c2UpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignc2VhcmNoQ2xhdXNlIGhhcyB0byBiZSBzcGVjaWZpZWQhJylcbiAgICB9XG4gICAgbG9nLnZlcmJvc2UoVEFHLCBgcmVhZCgpOiBtb2RlbE5hbWU9JHttb2RlbE5hbWV9IHNlYXJjaENsYXVzZT0ke0pTT04uc3RyaW5naWZ5KHNlYXJjaENsYXVzZSl9YClcbiAgICByZXR1cm4gdGhpcy5fbW9kZWxzW21vZGVsTmFtZV0uZmluZEFsbCh7d2hlcmU6IHNlYXJjaENsYXVzZSwgb3JkZXIsIGluY2x1ZGUsIGxpbWl0LCB0cmFuc2FjdGlvbjogdHJ4fSkudGhlbihyZWFkRGF0YSA9PiB7XG4gICAgICBpZiAocmVhZERhdGEubGVuZ3RoID4gMCkge1xuICAgICAgICByZXR1cm4ge3N0YXR1czogdHJ1ZSwgZGF0YTogcmVhZERhdGEubWFwKGRhdGEgPT4gZGF0YS5nZXQoe3BsYWluOiB0cnVlfSkpfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHtzdGF0dXM6IGZhbHNlLCBlcnJNZXNzYWdlOiAnRGF0YSBub3QgZm91bmQnfVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICByZWFkT25lICh7bW9kZWxOYW1lLCBzZWFyY2hDbGF1c2UsIG9yZGVyLCBpbmNsdWRlLCB0cnh9KSB7XG4gICAgcmV0dXJuIHRoaXMucmVhZCh7bW9kZWxOYW1lLCBzZWFyY2hDbGF1c2UsIG9yZGVyLCBpbmNsdWRlLCB0cnh9KS50aGVuKHJlc3AgPT4ge1xuICAgICAgaWYgKHJlc3Auc3RhdHVzKSB7XG4gICAgICAgIHJldHVybiB7c3RhdHVzOiB0cnVlLCBkYXRhOiByZXNwLmRhdGFbMF19XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gcmVzcFxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICB1cGRhdGUgKHttb2RlbE5hbWUsIGRhdGEsIHRyeH0pIHtcbiAgICBpZiAoISgnaWQnIGluIGRhdGEpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2RhdGEgbmVlZHMgdG8gaGF2ZSBpZCEnKVxuICAgIH1cbiAgICBsb2cudmVyYm9zZShUQUcsIGB1cGRhdGUoKTogbW9kZWxOYW1lPSR7bW9kZWxOYW1lfSBkYXRhPSR7SlNPTi5zdHJpbmdpZnkoZGF0YSl9YClcblxuICAgIHJldHVybiB0aGlzLl9tb2RlbHNbbW9kZWxOYW1lXS51cGRhdGUoZGF0YSwge3doZXJlOiB7aWQ6IGRhdGEuaWR9LCB0cmFuc2FjdGlvbjogdHJ4fSkuc3ByZWFkKChjb3VudCkgPT4ge1xuICAgICAgcmV0dXJuIHtzdGF0dXM6IHRydWV9XG4gICAgfSkuY2F0Y2goZXJyID0+IHtcbiAgICAgIGlmIChlcnIubmFtZSA9PT0gJ1NlcXVlbGl6ZVVuaXF1ZUNvbnN0cmFpbnRFcnJvcicpIHtcbiAgICAgICAgcmV0dXJuIHtzdGF0dXM6IGZhbHNlLCBlcnJNZXNzYWdlOiAnVW5pcXVlIENvbnN0cmFpbnQgRXJyb3InfVxuICAgICAgfSBlbHNlIGlmIChlcnIubmFtZSA9PT0gJ1NlcXVlbGl6ZUZvcmVpZ25LZXlDb25zdHJhaW50RXJyb3InKSB7XG4gICAgICAgIHJldHVybiB7c3RhdHVzOiBmYWxzZSwgZXJyTWVzc2FnZTogJ0ZvcmVpZ24gS2V5IENvbnN0cmFpbnQgRXJyb3IhJ31cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IGVyclxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBkZWxldGUgKHttb2RlbE5hbWUsIGRhdGF9KSB7XG4gICAgbG9nLnZlcmJvc2UoVEFHLCBgZGVsZXRlKCk6IG1vZGVsTmFtZT0ke21vZGVsTmFtZX0gZGF0YT0ke0pTT04uc3RyaW5naWZ5KGRhdGEpfWApXG4gICAgcmV0dXJuIHRoaXMuX21vZGVsc1ttb2RlbE5hbWVdLmRlc3Ryb3koe3doZXJlOiB7aWQ6IGRhdGEuaWR9fSkudGhlbihudW1EZWxldGVkID0+IHtcbiAgICAgIGlmIChudW1EZWxldGVkID4gMCkge1xuICAgICAgICByZXR1cm4ge3N0YXR1czogdHJ1ZX1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB7c3RhdHVzOiBmYWxzZSwgZXJyTWVzc2FnZTogJ0RhdGEgTm90IEZvdW5kISd9XG4gICAgICB9XG4gICAgfSkuY2F0Y2goZXJyID0+IHtcbiAgICAgIGlmIChlcnIubmFtZSA9PT0gJ1NlcXVlbGl6ZVVuaXF1ZUNvbnN0cmFpbnRFcnJvcicpIHtcbiAgICAgICAgcmV0dXJuIHtzdGF0dXM6IGZhbHNlLCBlcnJNZXNzYWdlOiAnVW5pcXVlIENvbnN0cmFpbnQgRXJyb3InfVxuICAgICAgfSBlbHNlIGlmIChlcnIubmFtZSA9PT0gJ1NlcXVlbGl6ZUZvcmVpZ25LZXlDb25zdHJhaW50RXJyb3InKSB7XG4gICAgICAgIHJldHVybiB7c3RhdHVzOiBmYWxzZSwgZXJyTWVzc2FnZTogJ0ZvcmVpZ24gS2V5IENvbnN0cmFpbnQgRXJyb3IhJ31cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IGVyclxuICAgICAgfVxuICAgIH0pXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDUlVEU2VydmljZVxuIl19