"use strict";Object.defineProperty(exports,"__esModule",{value:!0});const path=require("path"),express=require("express"),Promise=require("bluebird");function addImageModel(t,e){e.Image=t.define("images",{id:{type:t.Sequelize.INTEGER,primaryKey:!0,autoIncrement:!0},filename:{type:t.Sequelize.STRING,unique:!0},url:{type:t.Sequelize.TEXT}})}exports.addImageModel=addImageModel;class AppController{constructor(t){this.interceptors=[],this.siteData=t,this.router=express(),this.viewPath=t.viewPath||path.join(__dirname,"views"),this.assetsPath=t.assetPath||path.join(this.viewPath,"/assets"),this.router.set("views",this.viewPath),this.router.set("view engine","pug"),this.router.use("/assets",express.static(this.assetsPath,{maxAge:"1h"}))}initialize(){return Promise.resolve(null)}isUpToDate(){return Promise.resolve(!0)}getInitData(){return this.siteData}getDb(){return this.siteData.db}getSite(){return this.siteData.site}extendInterceptors(...t){return this.interceptors.concat(t)}addInterceptor(...t){this.interceptors=this.extendInterceptors(...t)}routeAll(t,...e){this.router.all(t,this.extendInterceptors(...e))}routeGet(t,...e){this.router.get(t,this.extendInterceptors(...e))}routePost(t,...e){this.router.post(t,this.extendInterceptors(...e))}routeUse(t,...e){this.router.use(t,this.extendInterceptors(...e))}evictRequireCache(){return Promise.resolve(null)}getRouter(){return this.router}}exports.AppController=AppController;class CMSController{constructor(t,e=!0){this.interceptors=[],this.siteData=t,this.siteHash=t.site.hash,this.router=express(),e?(this.subRouter=express(),this.router.use(`/${this.siteHash}`,this.subRouter)):this.subRouter=this.router,this.subRouter.locals.rootifyPath=this.rootifyPath.bind(this),this.subRouter.locals.basedir=t.baseDir,this.viewPath=t.viewPath,this.assetsPath=t.assetPath||path.join(this.viewPath,"/assets"),this.subRouter.use("/assets",express.static(this.assetsPath)),this.subRouter.set("views",this.viewPath),this.subRouter.set("view engine","pug")}rootifyPath(t){return this.siteHash?`/${this.siteHash}/${t}`:`/${t}`}extendInterceptors(...t){return this.interceptors.concat(t)}addInterceptor(...t){this.interceptors=this.extendInterceptors(...t)}routeAll(t,...e){this.subRouter.all(t,this.extendInterceptors(...e))}routeGet(t,...e){this.subRouter.get(t,this.extendInterceptors(...e))}routePost(t,...e){this.subRouter.post(t,this.extendInterceptors(...e))}routeUse(t,...e){this.subRouter.use(t,this.extendInterceptors(...e))}getRouter(){return this.router}}exports.CMSController=CMSController;
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9zaXRlLWRlZmluaXRpb25zLnRzIl0sIm5hbWVzIjpbInBhdGgiLCJyZXF1aXJlIiwiZXhwcmVzcyIsIlByb21pc2UiLCJhZGRJbWFnZU1vZGVsIiwic2VxdWVsaXplIiwibW9kZWxzIiwiSW1hZ2UiLCJkZWZpbmUiLCJpZCIsInR5cGUiLCJTZXF1ZWxpemUiLCJJTlRFR0VSIiwicHJpbWFyeUtleSIsImF1dG9JbmNyZW1lbnQiLCJmaWxlbmFtZSIsIlNUUklORyIsInVuaXF1ZSIsInVybCIsIlRFWFQiLCJleHBvcnRzIiwiQXBwQ29udHJvbGxlciIsIltvYmplY3QgT2JqZWN0XSIsImRhdGEiLCJ0aGlzIiwiaW50ZXJjZXB0b3JzIiwic2l0ZURhdGEiLCJyb3V0ZXIiLCJ2aWV3UGF0aCIsImpvaW4iLCJfX2Rpcm5hbWUiLCJhc3NldHNQYXRoIiwiYXNzZXRQYXRoIiwic2V0IiwidXNlIiwic3RhdGljIiwibWF4QWdlIiwicmVzb2x2ZSIsImRiIiwic2l0ZSIsImZucyIsImNvbmNhdCIsImV4dGVuZEludGVyY2VwdG9ycyIsImFsbCIsImdldCIsInBvc3QiLCJDTVNDb250cm9sbGVyIiwidXNlU3Vicm91dGVyIiwic2l0ZUhhc2giLCJoYXNoIiwic3ViUm91dGVyIiwibG9jYWxzIiwicm9vdGlmeVBhdGgiLCJiaW5kIiwiYmFzZWRpciIsImJhc2VEaXIiXSwibWFwcGluZ3MiOiJvRUFBQSxNQUFBQSxLQUFBQyxRQUFBLFFBRUFDLFFBQUFELFFBQUEsV0FDQUUsUUFBQUYsUUFBQSxZQW1DQSxTQUFBRyxjQUErQkMsRUFBc0JDLEdBQ25EQSxFQUFPQyxNQUFRRixFQUFVRyxPQUFPLFVBQzlCQyxJQUFNQyxLQUFNTCxFQUFVTSxVQUFVQyxRQUFTQyxZQUFZLEVBQU1DLGVBQWUsR0FDMUVDLFVBQVlMLEtBQU1MLEVBQVVNLFVBQVVLLE9BQVFDLFFBQVEsR0FDdERDLEtBQU9SLEtBQU1MLEVBQVVNLFVBQVVRLFFBSnJDQyxRQUFBaEIsY0FBQUEsb0JB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QixzQkFBc0JGLElBR3ZEbEIsU0FBVXRCLEtBQWlCd0MsR0FDekJoQixLQUFLMEIsVUFBVWhCLElBQUlsQyxFQUFNd0IsS0FBS2tCLHNCQUFzQkYsSUFHdERsQixZQUNFLE9BQU9FLEtBQUtHLFFBakVoQlAsUUFBQTBCLGNBQUFBIiwiZmlsZSI6InNpdGUtZGVmaW5pdGlvbnMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnXG5cbmltcG9ydCAqIGFzIGV4cHJlc3MgZnJvbSAnZXhwcmVzcydcbmltcG9ydCAqIGFzIFByb21pc2UgZnJvbSAnYmx1ZWJpcmQnXG5cbmltcG9ydCB7IFNlcXVlbGl6ZSwgTW9kZWxzIH0gZnJvbSAnc2VxdWVsaXplJ1xuXG5leHBvcnQgaW50ZXJmYWNlIERhdGFiYXNlIHtcbiAgc2VxdWVsaXplOiBTZXF1ZWxpemVcbiAgbW9kZWxzOiB7fVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIFVzZXIge1xuICBpZDogbnVtYmVyLFxuICB1c2VybmFtZTogc3RyaW5nLFxuICBlbWFpbDogc3RyaW5nLFxuICBzaXRlSWQ6IG51bWJlclxufVxuXG4vKiAtLS0tLS0tLS0tLS0tLS0gSW1hZ2UgU2VydmljZSAtLS0tLS0tLS0tLS0tLS0gKi9cbmV4cG9ydCB0eXBlIEZpbGVOYW1lRm9ybWF0dGVyID0gKGZpbGVuYW1lOiBzdHJpbmcpID0+IHN0cmluZ1xuZXhwb3J0IHR5cGUgVVJMRm9ybWF0dGVyID0gKGZpbGVuYW1lOiBzdHJpbmcpID0+IHN0cmluZ1xuZXhwb3J0IGludGVyZmFjZSBJbWFnZVJlc291cmNlIHtcbiAgdXJsOiBzdHJpbmcsXG4gIGlkZW50aWZpZXI6IHN0cmluZ1xufVxuZXhwb3J0IGludGVyZmFjZSBJbWFnZVNlcnZpY2Uge1xuICBnZXRFeHByZXNzVXBsb2FkTWlkZGxld2FyZSAodXBsb2FkUGF0aDogc3RyaW5nLCB1cmxGb3JtYXR0ZXI6IFVSTEZvcm1hdHRlcixcbiAgICBmaWVsZE5hbWU/OiBzdHJpbmcsIGZpbGVOYW1lRm9ybWF0dGVyPzogRmlsZU5hbWVGb3JtYXR0ZXIpOiBleHByZXNzLlJlcXVlc3RIYW5kbGVyXG4gIGdldEltYWdlcyAodXJsRm9ybWF0dGVyOiBVUkxGb3JtYXR0ZXIpOiBQcm9taXNlPE5DUmVzcG9uc2U8SW1hZ2VSZXNvdXJjZT4+XG4gIGRlbGV0ZUltYWdlICh1cGxvYWRQYXRoOiBzdHJpbmcsIGZpbGVOYW1lOiBzdHJpbmcpOiBQcm9taXNlPE5DUmVzcG9uc2U8bnVsbD4+XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW1hZ2VTZXJ2aWNlQ29uc3RydWN0YWJsZSB7XG4gIG5ldyAoc2VxdWVsaXplOiBTZXF1ZWxpemUsIG1vZGVsczogTW9kZWxzKTogSW1hZ2VTZXJ2aWNlXG59XG5cbi8vIERhdGFiYXNlIGZvcm1hdCBuZWVkZWQgdG8gdXNlIEltYWdlIFNlcnZpY2VcbmV4cG9ydCBmdW5jdGlvbiBhZGRJbWFnZU1vZGVsIChzZXF1ZWxpemU6IFNlcXVlbGl6ZSwgbW9kZWxzOiBNb2RlbHMpIHtcbiAgbW9kZWxzLkltYWdlID0gc2VxdWVsaXplLmRlZmluZSgnaW1hZ2VzJywge1xuICAgIGlkOiB7IHR5cGU6IHNlcXVlbGl6ZS5TZXF1ZWxpemUuSU5URUdFUiwgcHJpbWFyeUtleTogdHJ1ZSwgYXV0b0luY3JlbWVudDogdHJ1ZSB9LFxuICAgIGZpbGVuYW1lOiB7IHR5cGU6IHNlcXVlbGl6ZS5TZXF1ZWxpemUuU1RSSU5HLCB1bmlxdWU6IHRydWUgfSxcbiAgICB1cmw6IHsgdHlwZTogc2VxdWVsaXplLlNlcXVlbGl6ZS5URVhUIH1cbiAgfSlcbn1cbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xuXG5leHBvcnQgaW50ZXJmYWNlIFNlcnZpY2VzIHtcbiAgSW1hZ2VTZXJ2aWNlOiBJbWFnZVNlcnZpY2VDb25zdHJ1Y3RhYmxlXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2l0ZSB7XG4gIGlkOiBudW1iZXIsXG4gIHRlbXBsYXRlSWQ6IHN0cmluZyxcbiAgbmFtZTogc3RyaW5nLFxuICBkYk5hbWU6IHN0cmluZyxcbiAgaGFzaDogc3RyaW5nXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2l0ZURhdGEge1xuICBzaXRlOiBTaXRlLFxuICB1c2VyOiBVc2VyLFxuICBzb2NrZXRJTzogU29ja2V0SU8sXG4gIGRiOiBEYXRhYmFzZSxcbiAgdmlld1BhdGg6IHN0cmluZyxcbiAgYmFzZURpcj86IHN0cmluZyxcbiAgYXNzZXRQYXRoPzogc3RyaW5nLFxuICBzZXJ2aWNlczogU2VydmljZXNcbn1cblxuZXhwb3J0IHR5cGUgU29ja2V0SU8gPSBhbnlcblxuZXhwb3J0IGludGVyZmFjZSBEQlN0cnVjdHVyZSB7XG4gIC8vIFJldHVybiBtb2RlbHNcbiAgYWRkVGFibGVzIChzZXF1ZWxpemU6IFNlcXVlbGl6ZSwgbW9kZWxzOiB7fSk6IHt9XG59XG5cbi8qIC0tLS0tLS0tLS0tLS0tLSBBcHAgQ29udHJvbGxlciAtLS0tLS0tLS0tLS0tLS0gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBBcHBDb250cm9sbGVyIHtcbiAgcmVhZG9ubHkgcm91dGVyOiBleHByZXNzLkV4cHJlc3NcbiAgcHJvdGVjdGVkIHZpZXdQYXRoOiBzdHJpbmdcbiAgcHJvdGVjdGVkIGFzc2V0c1BhdGg6IHN0cmluZ1xuICBwcm90ZWN0ZWQgc2l0ZURhdGE6IFNpdGVEYXRhXG4gIHByb3RlY3RlZCBpbnRlcmNlcHRvcnM6IGV4cHJlc3MuUmVxdWVzdEhhbmRsZXJbXSA9IFtdXG5cbiAgY29uc3RydWN0b3IgKGRhdGE6IFNpdGVEYXRhKSB7XG4gICAgdGhpcy5zaXRlRGF0YSA9IGRhdGFcbiAgICB0aGlzLnJvdXRlciA9IGV4cHJlc3MoKVxuICAgIC8vIFRPRE86IF9fZGlybmFtZSBpcyBub3QgbmVjZXNzYXJ5XG4gICAgdGhpcy52aWV3UGF0aCA9IGRhdGEudmlld1BhdGggfHwgcGF0aC5qb2luKF9fZGlybmFtZSwgJ3ZpZXdzJylcbiAgICB0aGlzLmFzc2V0c1BhdGggPSBkYXRhLmFzc2V0UGF0aCB8fCBwYXRoLmpvaW4odGhpcy52aWV3UGF0aCwgJy9hc3NldHMnKVxuXG4gICAgdGhpcy5yb3V0ZXIuc2V0KCd2aWV3cycsIHRoaXMudmlld1BhdGgpXG4gICAgdGhpcy5yb3V0ZXIuc2V0KCd2aWV3IGVuZ2luZScsICdwdWcnKVxuICAgIHRoaXMucm91dGVyLnVzZSgnL2Fzc2V0cycsIGV4cHJlc3Muc3RhdGljKHRoaXMuYXNzZXRzUGF0aCwgeyBtYXhBZ2U6ICcxaCcgfSkpXG4gIH1cbiAgLy8gSW5pdGlhbGl6ZSB0aGUgY2xhc3MuIFRoZSByZWFzb24gdGhpcyBjYW4ndCBiZSBkb25lIHVzaW5nIGNvbnN0cnVjdG9yIGlzIGJlY2F1c2VcbiAgLy8gd2UgbWF5IGhhdmUgdG8gd2FpdCB1bnRpbCB0aGUgaW5pdGlhbGl6YXRpb24gaXMgY29tcGVsdGUgYmVmb3JlIHByZWNlZWRpbmdcbiAgaW5pdGlhbGl6ZSAoKTogUHJvbWlzZTxudWxsPiB7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShudWxsKVxuICB9XG5cbiAgLy8gV2hldGhlciB0aGUgaW5zdGFuY2UgaXMgc3RpbGwgdmFsaWQgb3Igbm90IChpLmUuIHRoZXJlIGFyZSB1cGRhdGVkIGZpbGVzKVxuICBpc1VwVG9EYXRlICgpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRydWUpXG4gIH1cblxuICBnZXRJbml0RGF0YSAoKTogU2l0ZURhdGEge1xuICAgIHJldHVybiB0aGlzLnNpdGVEYXRhXG4gIH1cblxuICBnZXREYiAoKTogRGF0YWJhc2Uge1xuICAgIHJldHVybiB0aGlzLnNpdGVEYXRhLmRiXG4gIH1cblxuICBnZXRTaXRlICgpOiBTaXRlIHtcbiAgICByZXR1cm4gdGhpcy5zaXRlRGF0YS5zaXRlXG4gIH1cblxuICBwcm90ZWN0ZWQgZXh0ZW5kSW50ZXJjZXB0b3JzICguLi5mbnM6IGV4cHJlc3MuUmVxdWVzdEhhbmRsZXJbXSkge1xuICAgIHJldHVybiB0aGlzLmludGVyY2VwdG9ycy5jb25jYXQoZm5zKVxuICB9XG5cbiAgcHJvdGVjdGVkIGFkZEludGVyY2VwdG9yICguLi5mbnM6IGV4cHJlc3MuUmVxdWVzdEhhbmRsZXJbXSkge1xuICAgIHRoaXMuaW50ZXJjZXB0b3JzID0gdGhpcy5leHRlbmRJbnRlcmNlcHRvcnMoLi4uZm5zKVxuICB9XG5cbiAgcm91dGVBbGwgKHBhdGgsIC4uLmZuczogZXhwcmVzcy5SZXF1ZXN0SGFuZGxlcltdKSB7XG4gICAgdGhpcy5yb3V0ZXIuYWxsKHBhdGgsIHRoaXMuZXh0ZW5kSW50ZXJjZXB0b3JzKC4uLmZucykpXG4gIH1cblxuICByb3V0ZUdldCAocGF0aCwgLi4uZm5zOiBBcnJheTxleHByZXNzLlJlcXVlc3RIYW5kbGVyPikge1xuICAgIHRoaXMucm91dGVyLmdldChwYXRoLCB0aGlzLmV4dGVuZEludGVyY2VwdG9ycyguLi5mbnMpKVxuICB9XG5cbiAgcm91dGVQb3N0IChwYXRoLCAuLi5mbnM6IEFycmF5PGV4cHJlc3MuUmVxdWVzdEhhbmRsZXI+KSB7XG4gICAgdGhpcy5yb3V0ZXIucG9zdChwYXRoLCB0aGlzLmV4dGVuZEludGVyY2VwdG9ycyguLi5mbnMpKVxuICB9XG5cbiAgcm91dGVVc2UgKHBhdGgsIC4uLmZuczogQXJyYXk8ZXhwcmVzcy5SZXF1ZXN0SGFuZGxlcj4pIHtcbiAgICB0aGlzLnJvdXRlci51c2UocGF0aCwgdGhpcy5leHRlbmRJbnRlcmNlcHRvcnMoLi4uZm5zKSlcbiAgfVxuXG4gIC8vIFdoZW4gdGhlIGluc3RhbmNlIG9mIHRoZSBjbGFzcyBpcyBubyBsb25nZXIgdmFsaWQsXG4gIC8vIHdlIGhhdmUgdG8gZXZpY3Qgb3V0IHRoZSBjYWNoZSBzbyByZS1pbnN0YW50aWF0aW9uIGlzIGNsZWFuXG4gIGV2aWN0UmVxdWlyZUNhY2hlICgpOiBQcm9taXNlPG51bGw+IHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG51bGwpXG4gIH1cblxuICBnZXRSb3V0ZXIgKCk6IGV4cHJlc3MuRXhwcmVzcyB7XG4gICAgcmV0dXJuIHRoaXMucm91dGVyXG4gIH1cbn1cbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cblxuLyogLS0tLS0tLS0tLS0tLS0tIENNUyBDb250cm9sbGVyIC0tLS0tLS0tLS0tLS0tLSAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIENNU0NvbnRyb2xsZXIge1xuICByZWFkb25seSBzaXRlSGFzaDogc3RyaW5nXG4gIHJlYWRvbmx5IHJvdXRlcjogZXhwcmVzcy5FeHByZXNzXG4gIHJlYWRvbmx5IHN1YlJvdXRlcjogZXhwcmVzcy5FeHByZXNzXG4gIHByb3RlY3RlZCB2aWV3UGF0aDogc3RyaW5nXG4gIHByb3RlY3RlZCBhc3NldHNQYXRoOiBzdHJpbmdcbiAgcHJvdGVjdGVkIGludGVyY2VwdG9yczogQXJyYXk8YW55PiA9IFtdXG4gIHJlYWRvbmx5IHNpdGVEYXRhOiBTaXRlRGF0YVxuXG4gIGNvbnN0cnVjdG9yIChzaXRlRGF0YTogU2l0ZURhdGEsIHVzZVN1YnJvdXRlciA9IHRydWUpIHtcbiAgICB0aGlzLnNpdGVEYXRhID0gc2l0ZURhdGFcbiAgICB0aGlzLnNpdGVIYXNoID0gc2l0ZURhdGEuc2l0ZS5oYXNoXG4gICAgLy8gU2luY2UgdGhlIHBhdGggaXMgcHJlZml4ZWQgd2l0aCAvOmhhc2gvLCB3ZSBkb24ndCB3YW5uYSBoYW5kbGUgaXQgbWFudWFsbHkgZXZlcnl0aW1lLCBoZW5jZSB3ZSB1c2UgdHdvIHJvdXRlcnNcbiAgICB0aGlzLnJvdXRlciA9IGV4cHJlc3MoKVxuICAgIGlmICh1c2VTdWJyb3V0ZXIpIHtcbiAgICAgIHRoaXMuc3ViUm91dGVyID0gZXhwcmVzcygpXG4gICAgICB0aGlzLnJvdXRlci51c2UoYC8ke3RoaXMuc2l0ZUhhc2h9YCwgdGhpcy5zdWJSb3V0ZXIpXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc3ViUm91dGVyID0gdGhpcy5yb3V0ZXJcbiAgICB9XG4gICAgdGhpcy5zdWJSb3V0ZXIubG9jYWxzLnJvb3RpZnlQYXRoID0gdGhpcy5yb290aWZ5UGF0aC5iaW5kKHRoaXMpXG4gICAgLy8gVXNlZCBmb3IgcHVnIHBhdGggdGhhdCBzdGFydHMgd2l0aCAvXG4gICAgdGhpcy5zdWJSb3V0ZXIubG9jYWxzLmJhc2VkaXIgPSBzaXRlRGF0YS5iYXNlRGlyXG4gICAgdGhpcy52aWV3UGF0aCA9IHNpdGVEYXRhLnZpZXdQYXRoXG4gICAgdGhpcy5hc3NldHNQYXRoID0gc2l0ZURhdGEuYXNzZXRQYXRoIHx8IHBhdGguam9pbih0aGlzLnZpZXdQYXRoLCAnL2Fzc2V0cycpXG4gICAgdGhpcy5zdWJSb3V0ZXIudXNlKCcvYXNzZXRzJywgZXhwcmVzcy5zdGF0aWModGhpcy5hc3NldHNQYXRoKSlcbiAgICB0aGlzLnN1YlJvdXRlci5zZXQoJ3ZpZXdzJywgdGhpcy52aWV3UGF0aClcbiAgICB0aGlzLnN1YlJvdXRlci5zZXQoJ3ZpZXcgZW5naW5lJywgJ3B1ZycpXG4gIH1cblxuICAvLyBTaW5jZSB3ZSdyZSB1c2luZyAvOmhhc2gvcGF0aCwgd2UgaGF2ZSB0byBwcmVwZW5kIDpoYXNoXG4gIC8vIGFzIHRoZSByb290IG9mIHRoZSBwYXRoLCB3aGVuIHJlZmVycmluZyB0byBhbiBhc3NldFxuICBwcm90ZWN0ZWQgcm9vdGlmeVBhdGggKGZpbGVuYW1lKSB7XG4gICAgaWYgKHRoaXMuc2l0ZUhhc2gpIHtcbiAgICAgIHJldHVybiBgLyR7dGhpcy5zaXRlSGFzaH0vJHtmaWxlbmFtZX1gXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBgLyR7ZmlsZW5hbWV9YFxuICAgIH1cbiAgfVxuXG4gIHByb3RlY3RlZCBleHRlbmRJbnRlcmNlcHRvcnMgKC4uLmZuczogZXhwcmVzcy5SZXF1ZXN0SGFuZGxlcltdKSB7XG4gICAgcmV0dXJuIHRoaXMuaW50ZXJjZXB0b3JzLmNvbmNhdChmbnMpXG4gIH1cblxuICBwcm90ZWN0ZWQgYWRkSW50ZXJjZXB0b3IgKC4uLmZuczogZXhwcmVzcy5SZXF1ZXN0SGFuZGxlcltdKSB7XG4gICAgdGhpcy5pbnRlcmNlcHRvcnMgPSB0aGlzLmV4dGVuZEludGVyY2VwdG9ycyguLi5mbnMpXG4gIH1cblxuICByb3V0ZUFsbCAocGF0aDogc3RyaW5nLCAuLi5mbnM6IGV4cHJlc3MuUmVxdWVzdEhhbmRsZXJbXSkge1xuICAgIHRoaXMuc3ViUm91dGVyLmFsbChwYXRoLCB0aGlzLmV4dGVuZEludGVyY2VwdG9ycyguLi5mbnMpKVxuICB9XG5cbiAgcm91dGVHZXQgKHBhdGg6IHN0cmluZywgLi4uZm5zOiBBcnJheTxleHByZXNzLlJlcXVlc3RIYW5kbGVyPikge1xuICAgIHRoaXMuc3ViUm91dGVyLmdldChwYXRoLCB0aGlzLmV4dGVuZEludGVyY2VwdG9ycyguLi5mbnMpKVxuICB9XG5cbiAgcm91dGVQb3N0IChwYXRoOiBzdHJpbmcsIC4uLmZuczogQXJyYXk8ZXhwcmVzcy5SZXF1ZXN0SGFuZGxlcj4pIHtcbiAgICB0aGlzLnN1YlJvdXRlci5wb3N0KHBhdGgsIHRoaXMuZXh0ZW5kSW50ZXJjZXB0b3JzKC4uLmZucykpXG4gIH1cblxuICByb3V0ZVVzZSAocGF0aDogc3RyaW5nLCAuLi5mbnM6IEFycmF5PGV4cHJlc3MuUmVxdWVzdEhhbmRsZXI+KSB7XG4gICAgdGhpcy5zdWJSb3V0ZXIudXNlKHBhdGgsIHRoaXMuZXh0ZW5kSW50ZXJjZXB0b3JzKC4uLmZucykpXG4gIH1cblxuICBnZXRSb3V0ZXIgKCk6IGV4cHJlc3MuRXhwcmVzcyB7XG4gICAgcmV0dXJuIHRoaXMucm91dGVyXG4gIH1cblxuICBhYnN0cmFjdCBnZXRTaWRlYmFyICgpOiBhbnlbXVxufVxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xuIl19