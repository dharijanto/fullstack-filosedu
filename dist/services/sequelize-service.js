"use strict";Object.defineProperty(exports,"__esModule",{value:!0});let log=require("npmlog");const TAG="SequelizeService";class SequelizeService{constructor(e,i){this.sequelize=e,this.models=i}static initialize(e,i){if(log.verbose(TAG,"initialize()"),SequelizeService.instance)throw new Error("SequelizeService is already initialized");SequelizeService.instance=new SequelizeService(e,i)}static getInstance(){if(SequelizeService.instance)return SequelizeService.instance;throw new Error("SequelizeService is not initialized!")}}exports.default=SequelizeService;
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9zZXJ2aWNlcy9zZXF1ZWxpemUtc2VydmljZS50cyJdLCJuYW1lcyI6WyJsb2ciLCJyZXF1aXJlIiwiVEFHIiwiU2VxdWVsaXplU2VydmljZSIsIltvYmplY3QgT2JqZWN0XSIsInNlcXVlbGl6ZSIsIm1vZGVscyIsInRoaXMiLCJ2ZXJib3NlIiwiaW5zdGFuY2UiLCJFcnJvciIsImV4cG9ydHMiLCJkZWZhdWx0Il0sIm1hcHBpbmdzIjoib0VBQ0EsSUFBSUEsSUFBTUMsUUFBUSxVQUVsQixNQUFNQyxJQUFNLHlCQUVaQyxpQkFLRUMsWUFBcUJDLEVBQXNCQyxHQUN6Q0MsS0FBS0YsVUFBWUEsRUFDakJFLEtBQUtELE9BQVNBLEVBR2hCRixrQkFBbUJDLEVBQXNCQyxHQUV2QyxHQURBTixJQUFJUSxRQUFRTixJQUFLLGdCQUNaQyxpQkFBaUJNLFNBR3BCLE1BQU0sSUFBSUMsTUFBTSwyQ0FGaEJQLGlCQUFpQk0sU0FBVyxJQUFJTixpQkFBaUJFLEVBQVdDLEdBTWhFRixxQkFDRSxHQUFJRCxpQkFBaUJNLFNBQ25CLE9BQU9OLGlCQUFpQk0sU0FFeEIsTUFBTSxJQUFJQyxNQUFNLHlDQXZCdEJDLFFBQUFDLFFBQUFUIiwiZmlsZSI6InNlcnZpY2VzL3NlcXVlbGl6ZS1zZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU2VxdWVsaXplLCBNb2RlbHMgfSBmcm9tICdzZXF1ZWxpemUnXG5sZXQgbG9nID0gcmVxdWlyZSgnbnBtbG9nJylcblxuY29uc3QgVEFHID0gJ1NlcXVlbGl6ZVNlcnZpY2UnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNlcXVlbGl6ZVNlcnZpY2Uge1xuICBwcml2YXRlIHN0YXRpYyBpbnN0YW5jZTogU2VxdWVsaXplU2VydmljZVxuICByZWFkb25seSBzZXF1ZWxpemU6IFNlcXVlbGl6ZVxuICByZWFkb25seSBtb2RlbHM6IE1vZGVsc1xuXG4gIHByaXZhdGUgY29uc3RydWN0b3IgKHNlcXVlbGl6ZTogU2VxdWVsaXplLCBtb2RlbHM6IE1vZGVscykge1xuICAgIHRoaXMuc2VxdWVsaXplID0gc2VxdWVsaXplXG4gICAgdGhpcy5tb2RlbHMgPSBtb2RlbHNcbiAgfVxuXG4gIHN0YXRpYyBpbml0aWFsaXplIChzZXF1ZWxpemU6IFNlcXVlbGl6ZSwgbW9kZWxzOiBNb2RlbHMpIHtcbiAgICBsb2cudmVyYm9zZShUQUcsICdpbml0aWFsaXplKCknKVxuICAgIGlmICghU2VxdWVsaXplU2VydmljZS5pbnN0YW5jZSkge1xuICAgICAgU2VxdWVsaXplU2VydmljZS5pbnN0YW5jZSA9IG5ldyBTZXF1ZWxpemVTZXJ2aWNlKHNlcXVlbGl6ZSwgbW9kZWxzKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1NlcXVlbGl6ZVNlcnZpY2UgaXMgYWxyZWFkeSBpbml0aWFsaXplZCcpXG4gICAgfVxuICB9XG5cbiAgc3RhdGljIGdldEluc3RhbmNlICgpOiBTZXF1ZWxpemVTZXJ2aWNlIHtcbiAgICBpZiAoU2VxdWVsaXplU2VydmljZS5pbnN0YW5jZSkge1xuICAgICAgcmV0dXJuIFNlcXVlbGl6ZVNlcnZpY2UuaW5zdGFuY2VcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdTZXF1ZWxpemVTZXJ2aWNlIGlzIG5vdCBpbml0aWFsaXplZCEnKVxuICAgIH1cbiAgfVxufVxuIl19