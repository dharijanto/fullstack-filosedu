const axios=require("axios"),sleep=require("sleep-promise"),_=require("lodash"),Promise=require("bluebird"),BASE_URL="http://app-filosedu.nusantara-local.com",accounts=[{username:"admin",password:"kelinciloncat2"}];function executeExercise(e,s,t){return()=>(console.time(`Iteration=${s} successfully load the page!`),e.get(t).then(n=>{console.timeEnd(`Iteration=${s} successfully load the page!`);const o=n.data;return console.dir(o),sleep(3e3).then(()=>(console.time(`Iteration=${s} successfully submitted in!`),e(t,{method:"POST",data:{},withCredentials:!0}).then(e=>{e.data;return console.timeEnd(`Iteration=${s} successfully submitted in!`),sleep(3e3)})))}))}accounts.forEach(e=>{}),Promise.map(accounts,e=>{const s=axios.create({withCredentials:!0});return console.time(`loginTime-${e.username}`),s(`${BASE_URL}/login`,{method:"POST",data:{schoolId:3,username:e.username,password:e.password},withCredentials:!0}).then(s=>{const t=s.data;console.timeEnd(`loginTime-${e.username}`),console.dir(t.indexOf("Admin")),console.dir(s)})},{concurrency:10});
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9zY3JpcHRzL2xvYWQtdGVzdGluZy9jb25jdXJyZW50LWV4ZXJjaXNlLmpzIl0sIm5hbWVzIjpbImF4aW9zIiwicmVxdWlyZSIsInNsZWVwIiwiXyIsIlByb21pc2UiLCJCQVNFX1VSTCIsImFjY291bnRzIiwidXNlcm5hbWUiLCJwYXNzd29yZCIsImV4ZWN1dGVFeGVyY2lzZSIsImF4aW9zSW5zdGFuY2UiLCJpdGVyYXRpb24iLCJmdWxsVVJMIiwiY29uc29sZSIsInRpbWUiLCJnZXQiLCJ0aGVuIiwicmF3UmVzcCIsInRpbWVFbmQiLCJyZXNwIiwiZGF0YSIsImRpciIsIm1ldGhvZCIsIndpdGhDcmVkZW50aWFscyIsImZvckVhY2giLCJhY2NvdW50IiwibWFwIiwiY3JlYXRlIiwic2Nob29sSWQiLCJpbmRleE9mIiwiY29uY3VycmVuY3kiXSwibWFwcGluZ3MiOiJBQUFBLE1BQU1BLE1BQVFDLFFBQVEsU0FDaEJDLE1BQVFELFFBQVEsaUJBQ2hCRSxFQUFJRixRQUFRLFVBQ1pHLFFBQVVILFFBQVEsWUFFbEJJLFNBQVcsMENBRVhDLFdBRUpDLFNBQVUsUUFDVkMsU0FBVSxtQkE0Q1osU0FBQUMsZ0JBQTBCQyxFQUFlQyxFQUFXQyxHQUNsRCxNQUFPLEtBQ0xDLFFBQVFDLGtCQUFrQkgsaUNBQ25CRCxFQUFjSyxJQUFJSCxHQUFTSSxLQUFLQyxJQUNyQ0osUUFBUUsscUJBQXFCUCxpQ0FDN0IsTUFBTVEsRUFBT0YsRUFBUUcsS0FFckIsT0FEQVAsUUFBUVEsSUFBSUYsR0FDTGpCLE1BQU0sS0FBTWMsS0FBSyxLQUN0QkgsUUFBUUMsa0JBQWtCSCxnQ0FDbkJELEVBQWNFLEdBQ25CVSxPQUFRLE9BQ1JGLFFBQ0FHLGlCQUFpQixJQUNoQlAsS0FBS0MsSUFDT0EsRUFBUUcsS0FFckIsT0FEQVAsUUFBUUsscUJBQXFCUCxnQ0FDdEJULE1BQU0sWUFwQnZCSSxTQUFTa0IsUUFBUUMsT0EyQmpCckIsUUFBUXNCLElBQUlwQixTQUFVbUIsSUFDcEIsTUFBTWYsRUFBZ0JWLE1BQU0yQixRQUFRSixpQkFBaUIsSUFFckQsT0FEQVYsUUFBUUMsa0JBQWtCVyxFQUFRbEIsWUFDM0JHLEtBQWlCTCxrQkFDdEJpQixPQUFRLE9BQ1JGLE1BQ0VRLFNBQVUsRUFDVnJCLFNBQVVrQixFQUFRbEIsU0FDbEJDLFNBQVVpQixFQUFRakIsVUFFcEJlLGlCQUFpQixJQUNoQlAsS0FBS0MsSUFLTixNQUFNRSxFQUFPRixFQUFRRyxLQUNyQlAsUUFBUUsscUJBQXFCTyxFQUFRbEIsWUFDckNNLFFBQVFRLElBQUlGLEVBQUtVLFFBQVEsVUFDekJoQixRQUFRUSxJQUFJSixPQWdCZGEsWUFBYSIsImZpbGUiOiJzY3JpcHRzL2xvYWQtdGVzdGluZy9jb25jdXJyZW50LWV4ZXJjaXNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgYXhpb3MgPSByZXF1aXJlKCdheGlvcycpXG5jb25zdCBzbGVlcCA9IHJlcXVpcmUoJ3NsZWVwLXByb21pc2UnKVxuY29uc3QgXyA9IHJlcXVpcmUoJ2xvZGFzaCcpXG5jb25zdCBQcm9taXNlID0gcmVxdWlyZSgnYmx1ZWJpcmQnKVxuXG5jb25zdCBCQVNFX1VSTCA9ICdodHRwOi8vYXBwLWZpbG9zZWR1Lm51c2FudGFyYS1sb2NhbC5jb20nXG5cbmNvbnN0IGFjY291bnRzID0gW1xue1xuICB1c2VybmFtZTogJ2FkbWluJyxcbiAgcGFzc3dvcmQ6ICdrZWxpbmNpbG9uY2F0Midcbn1cbi8vICx7XG4vLyAgIHVzZXJuYW1lOiAnYWRtaW4yJyxcbi8vICAgcGFzc3dvcmQ6ICdrZWxpbmNpbG9uY2F0Midcbi8vIH1cbi8vICx7XG4vLyB1c2VybmFtZTogJ2FkbWluMycsXG4vLyAgIHBhc3N3b3JkOiAna2VsaW5jaWxvbmNhdDInXG4vLyB9XG4vLyAse1xuLy8gdXNlcm5hbWU6ICdhZG1pbjQnLFxuLy8gICBwYXNzd29yZDogJ2tlbGluY2lsb25jYXQyJ1xuLy8gfVxuLy8gLHtcbi8vIHVzZXJuYW1lOiAnYWRtaW41Jyxcbi8vICAgcGFzc3dvcmQ6ICdrZWxpbmNpbG9uY2F0Midcbi8vIH1cbi8vICx7XG4vLyB1c2VybmFtZTogJ2FkbWluNicsXG4vLyAgIHBhc3N3b3JkOiAna2VsaW5jaWxvbmNhdDInXG4vLyB9XG4vLyAse1xuLy8gdXNlcm5hbWU6ICdhZG1pbjcnLFxuLy8gICBwYXNzd29yZDogJ2tlbGluY2lsb25jYXQyJ1xuLy8gfVxuLy8gLHtcbi8vIHVzZXJuYW1lOiAnYWRtaW44Jyxcbi8vICAgcGFzc3dvcmQ6ICdrZWxpbmNpbG9uY2F0Midcbi8vIH1cbi8vICx7XG4vLyB1c2VybmFtZTogJ2FkbWluOScsXG4vLyAgIHBhc3N3b3JkOiAna2VsaW5jaWxvbmNhdDInXG4vLyB9XG4vLyAse1xuLy8gdXNlcm5hbWU6ICdhZG1pbjEwJyxcbi8vICAgcGFzc3dvcmQ6ICdrZWxpbmNpbG9uY2F0Midcbi8vIH1cbl1cblxuYWNjb3VudHMuZm9yRWFjaChhY2NvdW50ID0+IHtcblxufSlcblxuZnVuY3Rpb24gZXhlY3V0ZUV4ZXJjaXNlIChheGlvc0luc3RhbmNlLCBpdGVyYXRpb24sIGZ1bGxVUkwpIHtcbiAgcmV0dXJuICgpID0+IHtcbiAgICBjb25zb2xlLnRpbWUoYEl0ZXJhdGlvbj0ke2l0ZXJhdGlvbn0gc3VjY2Vzc2Z1bGx5IGxvYWQgdGhlIHBhZ2UhYClcbiAgICByZXR1cm4gYXhpb3NJbnN0YW5jZS5nZXQoZnVsbFVSTCkudGhlbihyYXdSZXNwID0+IHtcbiAgICAgIGNvbnNvbGUudGltZUVuZChgSXRlcmF0aW9uPSR7aXRlcmF0aW9ufSBzdWNjZXNzZnVsbHkgbG9hZCB0aGUgcGFnZSFgKVxuICAgICAgY29uc3QgcmVzcCA9IHJhd1Jlc3AuZGF0YVxuICAgICAgY29uc29sZS5kaXIocmVzcClcbiAgICAgIHJldHVybiBzbGVlcCgzMDAwKS50aGVuKCgpID0+IHtcbiAgICAgICAgY29uc29sZS50aW1lKGBJdGVyYXRpb249JHtpdGVyYXRpb259IHN1Y2Nlc3NmdWxseSBzdWJtaXR0ZWQgaW4hYClcbiAgICAgICAgcmV0dXJuIGF4aW9zSW5zdGFuY2UoZnVsbFVSTCwge1xuICAgICAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICAgICAgZGF0YToge30sXG4gICAgICAgICAgd2l0aENyZWRlbnRpYWxzOiB0cnVlXG4gICAgICAgIH0pLnRoZW4ocmF3UmVzcCA9PiB7XG4gICAgICAgICAgY29uc3QgcmVzcCA9IHJhd1Jlc3AuZGF0YVxuICAgICAgICAgIGNvbnNvbGUudGltZUVuZChgSXRlcmF0aW9uPSR7aXRlcmF0aW9ufSBzdWNjZXNzZnVsbHkgc3VibWl0dGVkIGluIWApXG4gICAgICAgICAgcmV0dXJuIHNsZWVwKDMwMDApXG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgIH0pXG4gIH1cbn1cblxuUHJvbWlzZS5tYXAoYWNjb3VudHMsIGFjY291bnQgPT4ge1xuICBjb25zdCBheGlvc0luc3RhbmNlID0gYXhpb3MuY3JlYXRlKHt3aXRoQ3JlZGVudGlhbHM6IHRydWV9KVxuICBjb25zb2xlLnRpbWUoYGxvZ2luVGltZS0ke2FjY291bnQudXNlcm5hbWV9YClcbiAgcmV0dXJuIGF4aW9zSW5zdGFuY2UoYCR7QkFTRV9VUkx9L2xvZ2luYCwge1xuICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgZGF0YToge1xuICAgICAgc2Nob29sSWQ6IDMsXG4gICAgICB1c2VybmFtZTogYWNjb3VudC51c2VybmFtZSxcbiAgICAgIHBhc3N3b3JkOiBhY2NvdW50LnBhc3N3b3JkXG4gICAgfSxcbiAgICB3aXRoQ3JlZGVudGlhbHM6IHRydWVcbiAgfSkudGhlbihyYXdSZXNwID0+IHtcbiAgICAvLyBheGlvc0luc3RhbmNlLmdldChgJHtCQVNFX1VSTH0vYCwge3dpdGhDcmVkZW50aWFsc2U6IHRydWV9KS50aGVuKHJhd1Jlc3AgPT4ge1xuICAgIC8vICAgY29uc3QgcmVzcCA9IHJhd1Jlc3AuZGF0YVxuICAgIC8vICAgY29uc29sZS5kaXIocmVzcClcbiAgICAvLyB9KVxuICAgIGNvbnN0IHJlc3AgPSByYXdSZXNwLmRhdGFcbiAgICBjb25zb2xlLnRpbWVFbmQoYGxvZ2luVGltZS0ke2FjY291bnQudXNlcm5hbWV9YClcbiAgICBjb25zb2xlLmRpcihyZXNwLmluZGV4T2YoJ0FkbWluJykpXG4gICAgY29uc29sZS5kaXIocmF3UmVzcClcbiAgICAvLyAvLyAxMDAgdGltZXNcbiAgICAvLyBjb25zdCBwcm9taXNlcyA9IF8ucmFuZ2UoMTAwKS5tYXAoaSA9PiB7XG4gICAgLy8gICBjb25zdCBwYXRoID0gJzEyL3Blbmp1bWxhaGFuLzE2L3Blbmp1bWxhaGFuLWhhc2lsLWJpbGFuZ2FuLTYtMTAvMjkvbGF0aWhhbi0xJ1xuICAgIC8vICAgY29uc3QgZnVsbFVSTCA9IGAke0JBU0VfVVJMfS8ke3BhdGh9YFxuICAgIC8vICAgcmV0dXJuIGV4ZWN1dGVFeGVyY2lzZShheGlvc0luc3RhbmNlLCBpLCBmdWxsVVJMKVxuICAgIC8vIH0pXG5cbiAgICAvLyBwcm9taXNlcy5yZWR1Y2UoKGFjYywgcHJvbWlzZSkgPT4ge1xuICAgIC8vICAgcmV0dXJuIGFjYy50aGVuKCgpID0+IHtcbiAgICAvLyAgICAgcmV0dXJuIHByb21pc2UoKVxuICAgIC8vICAgfSlcbiAgICAvLyB9LCBQcm9taXNlLnJlc29sdmUoKSlcbiAgICBcbiAgfSlcbn0sIHtcbiAgY29uY3VycmVuY3k6IDEwXG59KSJdfQ==
