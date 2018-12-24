var path=require("path"),fs=require("fs"),AWS=require("aws-sdk"),log=require("npmlog"),multer=require("multer"),Promise=require("bluebird"),url=require("url"),CRUDService=require(path.join(__dirname,"crud-service")),AppConfig=require(path.join(__dirname,"../app-config.js"));const TAG="ImageService";var s3=new AWS.S3;class ImageService extends CRUDService{getImages(){return log.verbose(TAG,`Cloud Server Status = ${AppConfig.CLOUD_SERVER}`),new Promise((e,t)=>this._models.Images.findAll({order:[["createdAt","DESC"]]}).then(t=>{t.length>0?(t=AppConfig.CLOUD_SERVER?t.map(e=>({url:e.sourceLink,public_id:e.filename})):t.map(e=>{return{url:url.resolve(AppConfig.BASE_URL,path.join(AppConfig.IMAGE_MOUNT_PATH,e.filename)),public_id:e.filename}}),e({status:!0,data:{resources:t}})):e({status:!0,data:{resources:[]}})}).catch(e=>{t(e)}))}getAllImages(){return this.read({modelName:"Images",searchClause:{}})}static uploadImageMiddleware(){return multer({storage:multer.diskStorage({destination:(e,t,a)=>{a(null,AppConfig.IMAGE_PATH)},filename:(e,t,a)=>{a(null,Date.now()+"_"+t.originalname)}})}).single("file")}_deleteImageLocal(e){return new Promise((t,a)=>{fs.unlink(path.join(AppConfig.IMAGE_PATH,e),e=>{e?a(e):t({status:!0})})})}_deleteImageDB(e){return new Promise((t,a)=>{this._models.Images.destroy({where:{filename:e}}).then(e=>{t({status:!0})}).catch(e=>{a(e)})})}deleteImage(e){return Promise.join(this._deleteImageLocal(e),this._deleteImageDB(e)).spread((t,a)=>{if(!AppConfig.CLOUD_SERVER)return t.status&&a.status?{status:!0}:{status:!1};var r={Bucket:AppConfig.AWS_IMAGE_CONF.AWS_BUCKET_NAME,Key:AppConfig.AWS_IMAGE_CONF.AWS_PREFIX_FOLDER_IMAGE_NAME+e};s3.deleteObject(r,function(e,t){return e?(log.error(TAG,`deleteImage(): s3.deleteObject err=${JSON.stringify(e)}`),e):{status:!0}})})}_addImage(e,t=null){return this.create({modelName:"Images",data:{filename:e,sourceLink:t}}).then(e=>e.status?{status:!0,data:{filename:e.data.filename}}:e)}_uploadImageToS3(e){return new Promise((t,a)=>{fs.readFile(path.join(AppConfig.IMAGE_PATH,e),(r,s)=>{r&&a(r);var i=Buffer.from(s,"binary");const n=path.join(AppConfig.AWS_IMAGE_CONF.AWS_PREFIX_FOLDER_IMAGE_NAME,e);var u={Bucket:AppConfig.AWS_IMAGE_CONF.AWS_BUCKET_NAME,Key:n,Body:i,ACL:"public-read"};s3.putObject(u,function(r,s){r?fs.unlink(path.join(AppConfig.IMAGE_PATH,e),(e,t)=>{a(r)}):(log.verbose(TAG,"_uploadImageToS3(): data1="+JSON.stringify(s)),t({status:!0,data:{URL:url.resolve(AppConfig.AWS_IMAGE_CONF.AWS_LINK,path.join(AppConfig.AWS_IMAGE_CONF.AWS_BUCKET_NAME,n))}}))})})})}uploadAndSaveImageToDB(e){return new Promise((t,a)=>{if(!AppConfig.CLOUD_SERVER)return this._addImage(e,null).then(e=>{e.status?t(e):t({status:!1})}).catch(e=>{a(e)});this._uploadImageToS3(e).then(a=>{if(a.status)return this._addImage(e,a.data.URL).then(e=>{e.status?t(e):t({status:!1})});t({status:!1})}).catch(e=>{a(e)})})}}module.exports=ImageService;
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9zZXJ2aWNlcy9pbWFnZS1zZXJ2aWNlLmpzIl0sIm5hbWVzIjpbInBhdGgiLCJyZXF1aXJlIiwiZnMiLCJBV1MiLCJsb2ciLCJtdWx0ZXIiLCJQcm9taXNlIiwidXJsIiwiQ1JVRFNlcnZpY2UiLCJqb2luIiwiX19kaXJuYW1lIiwiQXBwQ29uZmlnIiwiVEFHIiwiczMiLCJTMyIsIkltYWdlU2VydmljZSIsIltvYmplY3QgT2JqZWN0XSIsInZlcmJvc2UiLCJDTE9VRF9TRVJWRVIiLCJyZXNvbHZlIiwicmVqZWN0IiwidGhpcyIsIl9tb2RlbHMiLCJmaW5kQWxsIiwib3JkZXIiLCJ0aGVuIiwiZGF0YXMiLCJsZW5ndGgiLCJtYXAiLCJkYXRhIiwic291cmNlTGluayIsInB1YmxpY19pZCIsImZpbGVuYW1lIiwiQkFTRV9VUkwiLCJJTUFHRV9NT1VOVF9QQVRIIiwic3RhdHVzIiwicmVzb3VyY2VzIiwiY2F0Y2giLCJlcnIiLCJyZWFkIiwibW9kZWxOYW1lIiwic2VhcmNoQ2xhdXNlIiwic3RvcmFnZSIsImRpc2tTdG9yYWdlIiwiZGVzdGluYXRpb24iLCJyZXEiLCJmaWxlIiwiY2FsbGJhY2siLCJJTUFHRV9QQVRIIiwiRGF0ZSIsIm5vdyIsIm9yaWdpbmFsbmFtZSIsInNpbmdsZSIsImZpbGVOYW1lIiwidW5saW5rIiwiZGVzdHJveSIsIndoZXJlIiwibnVtUm93cyIsIl9kZWxldGVJbWFnZUxvY2FsIiwiX2RlbGV0ZUltYWdlREIiLCJzcHJlYWQiLCJyZXNwMSIsInJlc3AyIiwicGFyYW1zIiwiQnVja2V0IiwiQVdTX0lNQUdFX0NPTkYiLCJBV1NfQlVDS0VUX05BTUUiLCJLZXkiLCJBV1NfUFJFRklYX0ZPTERFUl9JTUFHRV9OQU1FIiwiZGVsZXRlT2JqZWN0IiwiZXJyb3IiLCJKU09OIiwic3RyaW5naWZ5IiwiY3JlYXRlIiwicmVzcCIsInJlYWRGaWxlIiwiYmFzZTY0ZGF0YSIsIkJ1ZmZlciIsImZyb20iLCJmaWxlUGF0aCIsIkJvZHkiLCJBQ0wiLCJwdXRPYmplY3QiLCJlcnIxIiwiZGF0YTEiLCJlcnIyIiwiZGF0YTIiLCJVUkwiLCJBV1NfTElOSyIsIl9hZGRJbWFnZSIsIl91cGxvYWRJbWFnZVRvUzMiLCJtb2R1bGUiLCJleHBvcnRzIl0sIm1hcHBpbmdzIjoiQUFBQSxJQUFJQSxLQUFPQyxRQUFRLFFBQ2ZDLEdBQUtELFFBQVEsTUFFYkUsSUFBTUYsUUFBUSxXQUNkRyxJQUFNSCxRQUFRLFVBQ2RJLE9BQVNKLFFBQVEsVUFDakJLLFFBQVVMLFFBQVEsWUFDbEJNLElBQU1OLFFBQVEsT0FFZE8sWUFBY1AsUUFBUUQsS0FBS1MsS0FBS0MsVUFBVyxpQkFDM0NDLFVBQVlWLFFBQVFELEtBQUtTLEtBQUtDLFVBQVcscUJBRTdDLE1BQU1FLElBQU0sZUFFWixJQUFJQyxHQUFLLElBQUlWLElBQUlXLFNBRWpCQyxxQkFBMkJQLFlBR3pCUSxZQUVFLE9BREFaLElBQUlhLFFBQVFMLDZCQUE4QkQsVUFBVU8sZ0JBQzdDLElBQUlaLFFBQVEsQ0FBQ2EsRUFBU0MsSUFDcEJDLEtBQUtDLFFBQWdCLE9BQUVDLFNBQVNDLFFBQVMsWUFBYSxXQUFXQyxLQUFLQyxJQUN2RUEsRUFBTUMsT0FBUyxHQUVmRCxFQURFZixVQUFVTyxhQUNKUSxFQUFNRSxJQUFJQyxLQUVkdEIsSUFBS3NCLEVBQUtDLFdBQ1ZDLFVBQVdGLEVBQUtHLFlBSVpOLEVBQU1FLElBQUlDLElBRWhCLE9BQ0V0QixJQUZhQSxJQUFJWSxRQUFRUixVQUFVc0IsU0FBVWpDLEtBQUtTLEtBQUtFLFVBQVV1QixpQkFBa0JMLEVBQUtHLFdBR3hGRCxVQUFXRixFQUFLRyxZQUl0QmIsR0FDRWdCLFFBQVEsRUFDUk4sTUFDRU8sVUFBV1YsTUFJZlAsR0FDRWdCLFFBQVEsRUFDUk4sTUFDRU8sa0JBSUxDLE1BQU1DLElBQ1BsQixFQUFPa0IsTUFLYnRCLGVBQ0UsT0FBT0ssS0FBS2tCLE1BQU1DLFVBQVcsU0FBVUMsa0JBR3pDekIsK0JBYUUsT0FYZVgsUUFDYnFDLFFBQVNyQyxPQUFPc0Ms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S0FBS29FLFVBQVVwQyxFQUFVcUIsRUFBSzdDLEtBQUswRCxLQUFLOUQsS0FBS3FDLElBQzlDQSxFQUFNM0IsT0FDUmhCLEVBQVEyQyxHQUVSM0MsR0FBU2dCLFFBQVEsTUFJckJoQixHQUFTZ0IsUUFBUSxNQUVsQkUsTUFBTUMsSUFDUGxCLEVBQU9rQixRQWlCakJxRCxPQUFPQyxRQUFVN0UiLCJmaWxlIjoic2VydmljZXMvaW1hZ2Utc2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBwYXRoID0gcmVxdWlyZSgncGF0aCcpXG52YXIgZnMgPSByZXF1aXJlKCdmcycpXG5cbnZhciBBV1MgPSByZXF1aXJlKCdhd3Mtc2RrJylcbnZhciBsb2cgPSByZXF1aXJlKCducG1sb2cnKVxudmFyIG11bHRlciA9IHJlcXVpcmUoJ211bHRlcicpXG52YXIgUHJvbWlzZSA9IHJlcXVpcmUoJ2JsdWViaXJkJylcbnZhciB1cmwgPSByZXF1aXJlKCd1cmwnKVxuXG52YXIgQ1JVRFNlcnZpY2UgPSByZXF1aXJlKHBhdGguam9pbihfX2Rpcm5hbWUsICdjcnVkLXNlcnZpY2UnKSlcbnZhciBBcHBDb25maWcgPSByZXF1aXJlKHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9hcHAtY29uZmlnLmpzJykpXG5cbmNvbnN0IFRBRyA9ICdJbWFnZVNlcnZpY2UnXG5cbnZhciBzMyA9IG5ldyBBV1MuUzMoKVxuXG5jbGFzcyBJbWFnZVNlcnZpY2UgZXh0ZW5kcyBDUlVEU2VydmljZSB7XG4gIC8vIEdldCBsb2NhbC9yZW1vdGUgaW1hZ2VzLCBkZXBlbmRpbmcgd2hldGhlclxuICAvLyBzZXJ2ZXIgaXMgY29uZmlndXJlZCB0byBiZSBjbG91ZCBvciBub3RcbiAgZ2V0SW1hZ2VzICgpIHtcbiAgICBsb2cudmVyYm9zZShUQUcsIGBDbG91ZCBTZXJ2ZXIgU3RhdHVzID0gJHtBcHBDb25maWcuQ0xPVURfU0VSVkVSfWApXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHJldHVybiB0aGlzLl9tb2RlbHNbJ0ltYWdlcyddLmZpbmRBbGwoe29yZGVyOiBbWydjcmVhdGVkQXQnLCAnREVTQyddXX0pLnRoZW4oZGF0YXMgPT4ge1xuICAgICAgICBpZiAoZGF0YXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGlmIChBcHBDb25maWcuQ0xPVURfU0VSVkVSKSB7XG4gICAgICAgICAgICBkYXRhcyA9IGRhdGFzLm1hcChkYXRhID0+IHtcbiAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB1cmw6IGRhdGEuc291cmNlTGluayxcbiAgICAgICAgICAgICAgICBwdWJsaWNfaWQ6IGRhdGEuZmlsZW5hbWVcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZGF0YXMgPSBkYXRhcy5tYXAoZGF0YSA9PiB7XG4gICAgICAgICAgICAgIHZhciBsb2NhbFVSTCA9IHVybC5yZXNvbHZlKEFwcENvbmZpZy5CQVNFX1VSTCwgcGF0aC5qb2luKEFwcENvbmZpZy5JTUFHRV9NT1VOVF9QQVRILCBkYXRhLmZpbGVuYW1lKSlcbiAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB1cmw6IGxvY2FsVVJMLFxuICAgICAgICAgICAgICAgIHB1YmxpY19pZDogZGF0YS5maWxlbmFtZVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgIHN0YXR1czogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgcmVzb3VyY2VzOiBkYXRhc1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICBzdGF0dXM6IHRydWUsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgIHJlc291cmNlczogW11cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICB9KS5jYXRjaChlcnIgPT4ge1xuICAgICAgICByZWplY3QoZXJyKVxuICAgICAgfSlcbiAgICB9KVxuICB9XG5cbiAgZ2V0QWxsSW1hZ2VzICgpIHtcbiAgICByZXR1cm4gdGhpcy5yZWFkKHttb2RlbE5hbWU6ICdJbWFnZXMnLCBzZWFyY2hDbGF1c2U6IHt9fSlcbiAgfVxuXG4gIHN0YXRpYyB1cGxvYWRJbWFnZU1pZGRsZXdhcmUgKCkge1xuICAgIHZhciBmaWxlTmFtZSA9IG51bGxcbiAgICBjb25zdCB1cGxvYWQgPSBtdWx0ZXIoe1xuICAgICAgc3RvcmFnZTogbXVsdGVyLmRpc2tTdG9yYWdlKHtcbiAgICAgICAgZGVzdGluYXRpb246IChyZXEsIGZpbGUsIGNhbGxiYWNrKSA9PiB7XG4gICAgICAgICAgY2FsbGJhY2sobnVsbCwgQXBwQ29uZmlnLklNQUdFX1BBVEgpXG4gICAgICAgIH0sXG4gICAgICAgIGZpbGVuYW1lOiAocmVxLCBmaWxlLCBjYWxsYmFjaykgPT4ge1xuICAgICAgICAgIGZpbGVOYW1lID0gRGF0ZS5ub3coKSArICdfJyArIGZpbGUub3JpZ2luYWxuYW1lXG4gICAgICAgICAgY2FsbGJhY2sobnVsbCwgZmlsZU5hbWUpXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSkuc2luZ2xlKCdmaWxlJylcbiAgICByZXR1cm4gdXBsb2FkXG4gIH1cblxuICBfZGVsZXRlSW1hZ2VMb2NhbCAoZmlsZU5hbWUpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgZnMudW5saW5rKHBhdGguam9pbihBcHBDb25maWcuSU1BR0VfUEFUSCwgZmlsZU5hbWUpLCAoZXJyKSA9PiB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc29sdmUoe3N0YXR1czogdHJ1ZX0pXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuXG4gIF9kZWxldGVJbWFnZURCIChmaWxlTmFtZSkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB0aGlzLl9tb2RlbHNbJ0ltYWdlcyddLmRlc3Ryb3koe3doZXJlOiB7ZmlsZW5hbWU6IGZpbGVOYW1lfX0pLnRoZW4obnVtUm93cyA9PiB7XG4gICAgICAgIHJlc29sdmUoe3N0YXR1czogdHJ1ZX0pXG4gICAgICB9KS5jYXRjaChlcnIgPT4ge1xuICAgICAgICByZWplY3QoZXJyKVxuICAgICAgfSlcbiAgICB9KVxuICB9XG5cbiAgZGVsZXRlSW1hZ2UgKGZpbGVOYW1lKSB7XG4gICAgcmV0dXJuIFByb21pc2Uuam9pbihcbiAgICAgIHRoaXMuX2RlbGV0ZUltYWdlTG9jYWwoZmlsZU5hbWUpLFxuICAgICAgdGhpcy5fZGVsZXRlSW1hZ2VEQihmaWxlTmFtZSkpLnNwcmVhZCgocmVzcDEsIHJlc3AyKSA9PiB7XG4gICAgICAgIGlmIChBcHBDb25maWcuQ0xPVURfU0VSVkVSKSB7XG4gICAgICAgICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgICAgICAgIEJ1Y2tldDogQXBwQ29uZmlnLkFXU19JTUFHRV9DT05GLkFXU19CVUNLRVRfTkFNRSxcbiAgICAgICAgICAgIEtleTogQXBwQ29uZmlnLkFXU19JTUFHRV9DT05GLkFXU19QUkVGSVhfRk9MREVSX0lNQUdFX05BTUUgKyBmaWxlTmFtZVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIFRPRE86IG15IGFjY291bnQgYXdzIG5vdCBhbGxvd2VkIHRvIGRlbGV0ZVxuICAgICAgICAgIHMzLmRlbGV0ZU9iamVjdChwYXJhbXMsIGZ1bmN0aW9uIChlcnIsIGRhdGEpIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgbG9nLmVycm9yKFRBRywgYGRlbGV0ZUltYWdlKCk6IHMzLmRlbGV0ZU9iamVjdCBlcnI9JHtKU09OLnN0cmluZ2lmeShlcnIpfWApXG4gICAgICAgICAgICAgIHJldHVybiBlcnJcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJldHVybiB7c3RhdHVzOiB0cnVlfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKHJlc3AxLnN0YXR1cyAmJiByZXNwMi5zdGF0dXMpIHtcbiAgICAgICAgICAgIHJldHVybiB7c3RhdHVzOiB0cnVlfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4ge3N0YXR1czogZmFsc2V9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICB9XG5cbiAgX2FkZEltYWdlIChmaWxlbmFtZSwgc291cmNlTGluayA9IG51bGwpIHtcbiAgICByZXR1cm4gdGhpcy5jcmVhdGUoe1xuICAgICAgbW9kZWxOYW1lOiAnSW1hZ2VzJyxcbiAgICAgIGRhdGE6IHtcbiAgICAgICAgZmlsZW5hbWUsXG4gICAgICAgIHNvdXJjZUxpbmtcbiAgICAgIH1cbiAgICB9KS50aGVuKHJlc3AgPT4ge1xuICAgICAgaWYgKHJlc3Auc3RhdHVzKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgc3RhdHVzOiB0cnVlLFxuICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIGZpbGVuYW1lOiByZXNwLmRhdGEuZmlsZW5hbWVcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiByZXNwXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIF91cGxvYWRJbWFnZVRvUzMgKGZpbGVOYW1lKSB7XG4gICAgLy8gZXhhbXBsZSBjb250ZW50IGZpbGVOYW1lIDogMTUxNzM5MjM5ODgwOF82MDFfQXJ0aV9QZWNhaGFuLm1wNFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBmcy5yZWFkRmlsZShwYXRoLmpvaW4oQXBwQ29uZmlnLklNQUdFX1BBVEgsIGZpbGVOYW1lKSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgfVxuICAgICAgICAvLyBDaGFuZ2luZyBmcm9tIG5ldyBCdWZmZXIgdG8gQnVmZmVyLmZyb20gYmVjYXVzZSBpdCdzIGRlcHJlY2F0ZWQgaW4gbm9kZSB2NlxuICAgICAgICB2YXIgYmFzZTY0ZGF0YSA9IEJ1ZmZlci5mcm9tKGRhdGEsICdiaW5hcnknKVxuICAgICAgICBjb25zdCBmaWxlUGF0aCA9IHBhdGguam9pbihBcHBDb25maWcuQVdTX0lNQUdFX0NPTkYuQVdTX1BSRUZJWF9GT0xERVJfSU1BR0VfTkFNRSwgZmlsZU5hbWUpXG4gICAgICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICAgICAgQnVja2V0OiBBcHBDb25maWcuQVdTX0lNQUdFX0NPTkYuQVdTX0JVQ0tFVF9OQU1FLFxuICAgICAgICAgIEtleTogZmlsZVBhdGgsXG4gICAgICAgICAgQm9keTogYmFzZTY0ZGF0YSxcbiAgICAgICAgICBBQ0w6ICdwdWJsaWMtcmVhZCdcbiAgICAgICAgfVxuXG4gICAgICAgIHMzLnB1dE9iamVjdChwYXJhbXMsIGZ1bmN0aW9uIChlcnIxLCBkYXRhMSkge1xuICAgICAgICAgIGlmIChlcnIxKSB7XG4gICAgICAgICAgICAvLyBPbiBlcnJvciwgZGVsZXRlIGxvY2FsIGZpbGVcbiAgICAgICAgICAgIGZzLnVubGluayhwYXRoLmpvaW4oQXBwQ29uZmlnLklNQUdFX1BBVEgsIGZpbGVOYW1lKSwgKGVycjIsIGRhdGEyKSA9PiB7XG4gICAgICAgICAgICAgIHJlamVjdChlcnIxKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbG9nLnZlcmJvc2UoVEFHLCAnX3VwbG9hZEltYWdlVG9TMygpOiBkYXRhMT0nICsgSlNPTi5zdHJpbmdpZnkoZGF0YTEpKVxuICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgIHN0YXR1czogdHJ1ZSxcbiAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIFVSTDogdXJsLnJlc29sdmUoXG4gICAgICAgICAgICAgICAgICBBcHBDb25maWcuQVdTX0lNQUdFX0NPTkYuQVdTX0xJTkssXG4gICAgICAgICAgICAgICAgICBwYXRoLmpvaW4oQXBwQ29uZmlnLkFXU19JTUFHRV9DT05GLkFXU19CVUNLRVRfTkFNRSwgZmlsZVBhdGgpKVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuXG4gIHVwbG9hZEFuZFNhdmVJbWFnZVRvREIgKGZpbGVOYW1lKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGlmIChBcHBDb25maWcuQ0xPVURfU0VSVkVSKSB7XG4gICAgICAgIHRoaXMuX3VwbG9hZEltYWdlVG9TMyhmaWxlTmFtZSkudGhlbihyZXNwID0+IHtcbiAgICAgICAgICBpZiAocmVzcC5zdGF0dXMpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9hZGRJbWFnZShmaWxlTmFtZSwgcmVzcC5kYXRhLlVSTCkudGhlbihyZXNwMiA9PiB7XG4gICAgICAgICAgICAgIGlmIChyZXNwMi5zdGF0dXMpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3AyKVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe3N0YXR1czogZmFsc2V9KVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXNvbHZlKHtzdGF0dXM6IGZhbHNlfSlcbiAgICAgICAgICB9XG4gICAgICAgIH0pLmNhdGNoKGVyciA9PiB7XG4gICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgfSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRJbWFnZShmaWxlTmFtZSwgbnVsbCkudGhlbihyZXNwMiA9PiB7XG4gICAgICAgICAgaWYgKHJlc3AyLnN0YXR1cykge1xuICAgICAgICAgICAgcmVzb2x2ZShyZXNwMilcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzb2x2ZSh7c3RhdHVzOiBmYWxzZX0pXG4gICAgICAgICAgfVxuICAgICAgICB9KS5jYXRjaChlcnIgPT4ge1xuICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfSlcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEltYWdlU2VydmljZVxuIl19