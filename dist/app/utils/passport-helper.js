class PassportHelper{static ensureLoggedIn(e){"string"==typeof e&&(e={redirectTo:e});var r=(e=e||{}).redirectTo||"/login",s=void 0===e.setReturnTo||e.setReturnTo;return function(e,t,i){if(e.isAuthenticated&&e.isAuthenticated())i();else{if(!s||!e.session)return t.redirect(r);e.session.returnTo=e.originalUrl||e.url,e.session.save(()=>{t.redirect(r)})}}}static logOut(){return function(e,r,s){e.session.returnTo="/",e.logout(),e.session.save(()=>{r.redirect("/login")})}}}module.exports=PassportHelper;
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9hcHAvdXRpbHMvcGFzc3BvcnQtaGVscGVyLmpzIl0sIm5hbWVzIjpbIlBhc3Nwb3J0SGVscGVyIiwiW29iamVjdCBPYmplY3RdIiwib3B0aW9ucyIsInJlZGlyZWN0VG8iLCJ1cmwiLCJzZXRSZXR1cm5UbyIsInVuZGVmaW5lZCIsInJlcSIsInJlcyIsIm5leHQiLCJpc0F1dGhlbnRpY2F0ZWQiLCJzZXNzaW9uIiwicmVkaXJlY3QiLCJyZXR1cm5UbyIsIm9yaWdpbmFsVXJsIiwic2F2ZSIsImxvZ291dCIsIm1vZHVsZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiJNQUFBQSxlQUlFQyxzQkFBdUJDLEdBQ0UsaUJBQVpBLElBQ1RBLEdBQVlDLFdBQVlELElBSTFCLElBQUlFLEdBRkpGLEVBQVVBLE9BRVFDLFlBQWMsU0FDNUJFLE9BQXVDQyxJQUF4QkosRUFBUUcsYUFBb0NILEVBQVFHLFlBRXZFLE9BQU8sU0FBVUUsRUFBS0MsRUFBS0MsR0FDekIsR0FBS0YsRUFBSUcsaUJBQW9CSCxFQUFJRyxrQkFVL0JELFFBVmtELENBQ2xELElBQUlKLElBQWVFLEVBQUlJLFFBTXJCLE9BQU9ILEVBQUlJLFNBQVNSLEdBTHBCRyxFQUFJSSxRQUFRRSxTQUFXTixFQUFJTyxhQUFlUCxFQUFJSCxJQUM5Q0csRUFBSUksUUFBUUksS0FBSyxLQUNmUCxFQUFJSSxTQUFTUixPQVd2QkgsZ0JBQ0UsT0FBTyxTQUFVTSxFQUFLQyxFQUFLQyxHQUN6QkYsRUFBSUksUUFBUUUsU0FBVyxJQUN2Qk4sRUFBSVMsU0FDSlQsRUFBSUksUUFBUUksS0FBSyxLQUNmUCxFQUFJSSxTQUFTLGNBTXJCSyxPQUFPQyxRQUFVbEIiLCJmaWxlIjoiYXBwL3V0aWxzL3Bhc3Nwb3J0LWhlbHBlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImNsYXNzIFBhc3Nwb3J0SGVscGVyIHtcbiAgLy8gVE9ETzogTm8gbG9uZ2VyIG5lZWRlZCBhcyB0aGUgc2Vzc2lvbiBidWcgYXBwYXJlbnRseSBjYW1lIGZyb20gZXhwcmVzcy1zZXNzaW9uIGFuZCBpcyBhbHJlYWR5IGZpeGVkXG4gIC8vIEFkYXB0ZWQgZnJvbSBKYXJlZCBIYW5zb24ncyBjb25uZWN0LWVuc3VyZS1sb2dpblxuICAvLyBUaGUgZGlmZmVyZW5jZSBpcyB0aGF0IHRoaXMgd2FpdHMgdW50aWwgc2Vzc2lvbiBpcyBzYXZlZCBiZWZvcmUgcmVkaXJlY3RpbmdcbiAgc3RhdGljIGVuc3VyZUxvZ2dlZEluIChvcHRpb25zKSB7XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnc3RyaW5nJykge1xuICAgICAgb3B0aW9ucyA9IHsgcmVkaXJlY3RUbzogb3B0aW9ucyB9XG4gICAgfVxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG5cbiAgICB2YXIgdXJsID0gb3B0aW9ucy5yZWRpcmVjdFRvIHx8ICcvbG9naW4nXG4gICAgdmFyIHNldFJldHVyblRvID0gKG9wdGlvbnMuc2V0UmV0dXJuVG8gPT09IHVuZGVmaW5lZCkgPyB0cnVlIDogb3B0aW9ucy5zZXRSZXR1cm5Ub1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChyZXEsIHJlcywgbmV4dCkge1xuICAgICAgaWYgKCFyZXEuaXNBdXRoZW50aWNhdGVkIHx8ICFyZXEuaXNBdXRoZW50aWNhdGVkKCkpIHtcbiAgICAgICAgaWYgKHNldFJldHVyblRvICYmIHJlcS5zZXNzaW9uKSB7XG4gICAgICAgICAgcmVxLnNlc3Npb24ucmV0dXJuVG8gPSByZXEub3JpZ2luYWxVcmwgfHwgcmVxLnVybFxuICAgICAgICAgIHJlcS5zZXNzaW9uLnNhdmUoKCkgPT4ge1xuICAgICAgICAgICAgcmVzLnJlZGlyZWN0KHVybClcbiAgICAgICAgICB9KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiByZXMucmVkaXJlY3QodXJsKVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuZXh0KClcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBzdGF0aWMgbG9nT3V0ICgpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKHJlcSwgcmVzLCBuZXh0KSB7XG4gICAgICByZXEuc2Vzc2lvbi5yZXR1cm5UbyA9ICcvJ1xuICAgICAgcmVxLmxvZ291dCgpXG4gICAgICByZXEuc2Vzc2lvbi5zYXZlKCgpID0+IHtcbiAgICAgICAgcmVzLnJlZGlyZWN0KCcvbG9naW4nKVxuICAgICAgfSlcbiAgICB9XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBQYXNzcG9ydEhlbHBlclxuIl19
