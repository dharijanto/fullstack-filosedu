"use strict";Object.defineProperty(exports,"__esModule",{value:!0});let path=require("path"),log=require("npmlog"),Utility=require(path.join(__dirname,"../../utils/utility"));const exercise_solver_1=require("./exercise-solver"),TAG="BruteforceSolver";class BruteforceSolver extends exercise_solver_1.default{constructor(e){super(e)}structuralCheck(e){if(["quantity","solver","knowns","unknowns","isAnswerFn","printFn"].forEach(n=>{if(!(n in e))throw new Error(`${n} is not found!`)}),!("randomGeneratorFn"in e.solver))throw new Error("randomGeneratorFn is not found!")}_generateQuestions(e){const n=this.question.solver.randomGeneratorFn,r=this.question.solver.isEqualFn,t=this.question.knowns,o=this.question.unknowns,i=this.question.solver.timeout||1e3,s=[];let u=Utility.getTimeInMillis();for(;s.length<e;){if(Utility.getTimeInMillis()-u>i)throw new Error("Timeout limit exceeded!");{let e=n();if(!("knowns"in e&&"unknowns"in e))throw new Error("Random generator function is not correct! Either knowns or unknowns are not generated");t.forEach(n=>{if(!(n in e.knowns))throw new Error("Random generator function is not correct!")}),o.forEach(n=>{if(!(n in e.unknowns))throw new Error("Random generator function is not correct!")}),s.find(n=>r(n,e))||(log.verbose(TAG,`_generatedQuestions(): random=${JSON.stringify(e)}`),s.push(e))}}return log.verbose(TAG,"_generateQuestions(): questions generated in: "+(Utility.getTimeInMillis()-u)+" milliseconds"),s}generateQuestions(){const e=this.question.quantity||0;return this._generateQuestions(e)}generateTopicQuestions(){const e=this.question.reviewQuantity||0;return this._generateQuestions(e)}}BruteforceSolver.solverName="bruteforce_solver",exports.default=BruteforceSolver;
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9saWIvZXhlcmNpc2VfZ2VuZXJhdG9yL2V4ZXJjaXNlX3NvbHZlcnMvYnJ1dGVmb3JjZS1zb2x2ZXIudHMiXSwibmFtZXMiOlsicGF0aCIsInJlcXVpcmUiLCJsb2ciLCJVdGlsaXR5Iiwiam9pbiIsIl9fZGlybmFtZSIsImV4ZXJjaXNlX3NvbHZlcl8xIiwiVEFHIiwiQnJ1dGVmb3JjZVNvbHZlciIsImRlZmF1bHQiLCJbb2JqZWN0IE9iamVjdF0iLCJxdWVzdGlvbkRhdGEiLCJzdXBlciIsInF1ZXN0aW9uIiwiZm9yRWFjaCIsImtleSIsIkVycm9yIiwic29sdmVyIiwicXVhbnRpdHkiLCJnZXRSYW5kb20iLCJ0aGlzIiwicmFuZG9tR2VuZXJhdG9yRm4iLCJpc0VxdWFsIiwiaXNFcXVhbEZuIiwia25vd25zIiwidW5rbm93bnMiLCJ0aW1lb3V0IiwiZ2VuZXJhdGVkU2V0IiwidHMxIiwiZ2V0VGltZUluTWlsbGlzIiwibGVuZ3RoIiwicmFuZG9tIiwia25vd24iLCJ1bmtub3duIiwiZmluZCIsImdlbmVyYXRlZCIsInZlcmJvc2UiLCJKU09OIiwic3RyaW5naWZ5IiwicHVzaCIsIl9nZW5lcmF0ZVF1ZXN0aW9ucyIsInJldmlld1F1YW50aXR5Iiwic29sdmVyTmFtZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiJvRUFBQSxJQUFJQSxLQUFPQyxRQUFRLFFBQ2ZDLElBQU1ELFFBQVEsVUFFZEUsUUFBVUYsUUFBUUQsS0FBS0ksS0FBS0MsVUFBVyx3QkFFM0MsTUFBQUMsa0JBQUFMLFFBQUEscUJBRU1NLElBQU0seUJBd0JaQyx5QkFBOENGLGtCQUFBRyxRQUk1Q0MsWUFBYUMsR0FDWEMsTUFBTUQsR0FHUkQsZ0JBQWlCRyxHQU9mLElBTnNCLFdBQVksU0FBVSxTQUFVLFdBQVksYUFBYyxXQUNuRUMsUUFBUUMsSUFDbkIsS0FBTUEsS0FBT0YsR0FDWCxNQUFNLElBQUlHLFNBQVNELHVCQUdqQixzQkFBdUJGLEVBQVNJLFFBQ3BDLE1BQU0sSUFBSUQsTUFBTSxtQ0FLWk4sbUJBQW9CUSxHQUMxQixNQUFNQyxFQUFZQyxLQUFLUCxTQUFTSSxPQUFPSSxrQkFDakNDLEVBQVVGLEtBQUtQLFNBQVNJLE9BQU9NLFVBQy9CQyxFQUFTSixLQUFLUCxTQUFTVyxPQUN2QkMsRUFBV0wsS0FBS1AsU0FBU1ksU0FDekJDLEVBQVVOLEtBQUtQLFNBQVNJLE9BQU9TLFNBQVcsSUFDMUNDLEtBR04sSUFBSUMsRUFBTXpCLFFBQVEwQixrQkFDbEIsS0FBT0YsRUFBYUcsT0FBU1osR0FBVSxDQUNyQyxHQUFLZixRQUFRMEIsa0JBQW9CRCxFQUFPRixFQUN0QyxNQUFNLElBQUlWLE1BQU0sMkJBQ1gsQ0FFTCxJQUFJZSxFQUFTWixJQUViLEtBQU0sV0FBWVksR0FBYSxhQUFjQSxHQUMzQyxNQUFNLElBQUlmLE1BQU0seUZBRWhCUSxFQUFPVixRQUFRa0IsSUFDYixLQUFNQSxLQUFTRCxFQUFPUCxRQUNwQixNQUFNLElBQUlSLE1BQU0sK0NBR3BCUyxFQUFTWCxRQUFRbUIsSUFDZixLQUFNQSxLQUFXRixFQUFPTixVQUN0QixNQUFNLElBQUlULE1BQU0sK0NBS2pCVyxFQUFhTyxLQUFLQyxHQUFhYixFQUFRYSxFQUFXSixNQUNyRDdCLElBQUlrQyxRQUFRN0IscUNBQXNDOEIsS0FBS0MsVUFBVVAsTUFDakVKLEVBQWFZLEtBQUtSLEtBTXhCLE9BREE3QixJQUFJa0MsUUFBUTdCLElBQUssa0RBQW9ESixRQUFRMEIsa0JBQW9CRCxHQUFPLGlCQUNqR0QsRUFJVGpCLG9CQUNFLE1BQU1RLEVBQVdFLEtBQUtQLFNBQVNLLFVBQVksRUFDM0MsT0FBT0UsS0FBS29CLG1CQUFtQnRCLEdBSWpDUix5QkFDRSxNQUFNUSxFQUFXRSxLQUFLUCxTQUFTNEIsZ0JBQWtCLEVBQ2pELE9BQU9yQixLQUFLb0IsbUJBQW1CdEIsSUF4RVZWLGlCQUFBa0MsV0FBYSxvQkFEdENDLFFBQUFsQyxRQUFBRCIsImZpbGUiOiJsaWIvZXhlcmNpc2VfZ2VuZXJhdG9yL2V4ZXJjaXNlX3NvbHZlcnMvYnJ1dGVmb3JjZS1zb2x2ZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJsZXQgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKVxubGV0IGxvZyA9IHJlcXVpcmUoJ25wbWxvZycpXG5cbmxldCBVdGlsaXR5ID0gcmVxdWlyZShwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vdXRpbHMvdXRpbGl0eScpKVxuaW1wb3J0ICogYXMgUHJvbWlzZSBmcm9tICdibHVlYmlyZCdcbmltcG9ydCBFeGVyY2lzZVNvbHZlciBmcm9tICcuL2V4ZXJjaXNlLXNvbHZlcidcblxuY29uc3QgVEFHID0gJ0JydXRlZm9yY2VTb2x2ZXInXG5cbmV4cG9ydCBpbnRlcmZhY2UgR2VuZXJhdGVkUXVlc3Rpb25EYXRhIHtcbiAga25vd25zOiB7IFtrZXk6IHN0cmluZ106IGFueX0sXG4gIHVua25vd25zOiB7IFtrZXk6IHN0cmluZ106IGFueX1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBCcnV0ZWZvcmNlUXVlc3Rpb24ge1xuICBxdWFudGl0eTogbnVtYmVyXG4gIGlkZWFsVGltZVBlclF1ZXN0aW9uOiBudW1iZXJcbiAgcmV2aWV3UXVhbnRpdHk6IG51bWJlclxuICBjb21wZXRlbmN5UXVhbnRpdHk/OiBudW1iZXJcbiAgc29sdmVyOiB7XG4gICAgdHlwZTogJ2JydXRlZm9yY2Vfc29sdmVyJyxcbiAgICByYW5kb21HZW5lcmF0b3JGbjogKCkgPT4gR2VuZXJhdGVkUXVlc3Rpb25EYXRhLFxuICAgIGlzRXF1YWxGbjogKHVua25vd25zMSwgdW5rbm93bnMyKSA9PiBib29sZWFuLFxuICAgIHRpbWVvdXQ/OiBudW1iZXJcbiAgfVxuICBrbm93bnM6IHN0cmluZ1tdXG4gIHVua25vd25zOiBzdHJpbmdbXVxuICBpc0Fuc3dlckZuOiAoa25vd25zLCB1bmtub3ducykgPT4gYm9vbGVhblxuICBwcmludEZuOiAoa25vd25zKSA9PiBzdHJpbmcgfCBQcm9taXNlPHN0cmluZz5cbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQnJ1dGVmb3JjZVNvbHZlciBleHRlbmRzIEV4ZXJjaXNlU29sdmVyIHtcbiAgcHVibGljIHN0YXRpYyByZWFkb25seSBzb2x2ZXJOYW1lID0gJ2JydXRlZm9yY2Vfc29sdmVyJ1xuICBwcm90ZWN0ZWQgcXVlc3Rpb246IEJydXRlZm9yY2VRdWVzdGlvblxuXG4gIGNvbnN0cnVjdG9yIChxdWVzdGlvbkRhdGEpIHtcbiAgICBzdXBlcihxdWVzdGlvbkRhdGEpXG4gIH1cbiAgLy8gQ2hlY2sgaWYgdGhlIGdpdmVuIHF1ZXN0aW9uIHJlYWxseSBtYXRjaGVzIHRoZSBjcml0ZXJpYVxuICBzdHJ1Y3R1cmFsQ2hlY2sgKHF1ZXN0aW9uOiBCcnV0ZWZvcmNlUXVlc3Rpb24pIHtcbiAgICBjb25zdCByZXF1aXJlZEtleXMgPSBbJ3F1YW50aXR5JywgJ3NvbHZlcicsICdrbm93bnMnLCAndW5rbm93bnMnLCAnaXNBbnN3ZXJGbicsICdwcmludEZuJ11cbiAgICByZXF1aXJlZEtleXMuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgaWYgKCEoa2V5IGluIHF1ZXN0aW9uKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7a2V5fSBpcyBub3QgZm91bmQhYClcbiAgICAgIH1cbiAgICB9KVxuICAgIGlmICghKCdyYW5kb21HZW5lcmF0b3JGbicgaW4gcXVlc3Rpb24uc29sdmVyKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdyYW5kb21HZW5lcmF0b3JGbiBpcyBub3QgZm91bmQhJylcbiAgICB9XG4gICAgLy8gVE9ETzogQ2hlY2sgdGhlIHR5cGVzIG9mIGVhY2ggb2YgdGhlIHZhbHVlc1xuICB9XG5cbiAgcHJpdmF0ZSBfZ2VuZXJhdGVRdWVzdGlvbnMgKHF1YW50aXR5KTogR2VuZXJhdGVkUXVlc3Rpb25EYXRhW10ge1xuICAgIGNvbnN0IGdldFJhbmRvbSA9IHRoaXMucXVlc3Rpb24uc29sdmVyLnJhbmRvbUdlbmVyYXRvckZuXG4gICAgY29uc3QgaXNFcXVhbCA9IHRoaXMucXVlc3Rpb24uc29sdmVyLmlzRXF1YWxGblxuICAgIGNvbnN0IGtub3ducyA9IHRoaXMucXVlc3Rpb24ua25vd25zXG4gICAgY29uc3QgdW5rbm93bnMgPSB0aGlzLnF1ZXN0aW9uLnVua25vd25zXG4gICAgY29uc3QgdGltZW91dCA9IHRoaXMucXVlc3Rpb24uc29sdmVyLnRpbWVvdXQgfHwgMTAwMCAvLyBEZWZhdWx0IGV4ZXJjaXNlIGdlbmVyYXRpb24gdGltZW91dFxuICAgIGNvbnN0IGdlbmVyYXRlZFNldDogR2VuZXJhdGVkUXVlc3Rpb25EYXRhW10gPSBbXVxuXG4gICAgLy8gVGltZW91dCBjaGVja2VyXG4gICAgbGV0IHRzMSA9IFV0aWxpdHkuZ2V0VGltZUluTWlsbGlzKClcbiAgICB3aGlsZSAoZ2VuZXJhdGVkU2V0Lmxlbmd0aCA8IHF1YW50aXR5KSB7XG4gICAgICBpZiAoKFV0aWxpdHkuZ2V0VGltZUluTWlsbGlzKCkgLSB0czEpID4gdGltZW91dCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RpbWVvdXQgbGltaXQgZXhjZWVkZWQhJylcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEdlbmVyYXRlZCByYW5kb20ga25vd25zXG4gICAgICAgIGxldCByYW5kb20gPSBnZXRSYW5kb20oKVxuICAgICAgICAvLyBNYWtlIHN1cmUgd2hhdCdzIGdlbmVyYXRlZCBpcyBjb3JyZWN0XG4gICAgICAgIGlmICghKCdrbm93bnMnIGluIHJhbmRvbSkgfHwgISgndW5rbm93bnMnIGluIHJhbmRvbSkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1JhbmRvbSBnZW5lcmF0b3IgZnVuY3Rpb24gaXMgbm90IGNvcnJlY3QhIEVpdGhlciBrbm93bnMgb3IgdW5rbm93bnMgYXJlIG5vdCBnZW5lcmF0ZWQnKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGtub3ducy5mb3JFYWNoKGtub3duID0+IHtcbiAgICAgICAgICAgIGlmICghKGtub3duIGluIHJhbmRvbS5rbm93bnMpKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgUmFuZG9tIGdlbmVyYXRvciBmdW5jdGlvbiBpcyBub3QgY29ycmVjdCFgKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pXG4gICAgICAgICAgdW5rbm93bnMuZm9yRWFjaCh1bmtub3duID0+IHtcbiAgICAgICAgICAgIGlmICghKHVua25vd24gaW4gcmFuZG9tLnVua25vd25zKSkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFJhbmRvbSBnZW5lcmF0b3IgZnVuY3Rpb24gaXMgbm90IGNvcnJlY3QhYClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFnZW5lcmF0ZWRTZXQuZmluZChnZW5lcmF0ZWQgPT4gaXNFcXVhbChnZW5lcmF0ZWQsIHJhbmRvbSkpKSB7XG4gICAgICAgICAgbG9nLnZlcmJvc2UoVEFHLCBgX2dlbmVyYXRlZFF1ZXN0aW9ucygpOiByYW5kb209JHtKU09OLnN0cmluZ2lmeShyYW5kb20pfWApXG4gICAgICAgICAgZ2VuZXJhdGVkU2V0LnB1c2gocmFuZG9tKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgbG9nLnZlcmJvc2UoVEFHLCAnX2dlbmVyYXRlUXVlc3Rpb25zKCk6IHF1ZXN0aW9ucyBnZW5lcmF0ZWQgaW46ICcgKyAoVXRpbGl0eS5nZXRUaW1lSW5NaWxsaXMoKSAtIHRzMSkgKyAnIG1pbGxpc2Vjb25kcycpXG4gICAgcmV0dXJuIGdlbmVyYXRlZFNldFxuICB9XG5cbiAgLy8gR2VuZXJhdGUgcXVlc3Rpb24gZm9yIHN1Yi10b3BpYyBleGVyY2lzZVxuICBnZW5lcmF0ZVF1ZXN0aW9ucyAoKTogR2VuZXJhdGVkUXVlc3Rpb25EYXRhW10ge1xuICAgIGNvbnN0IHF1YW50aXR5ID0gdGhpcy5xdWVzdGlvbi5xdWFudGl0eSB8fCAwXG4gICAgcmV0dXJuIHRoaXMuX2dlbmVyYXRlUXVlc3Rpb25zKHF1YW50aXR5KVxuICB9XG5cbiAgLy8gR2VuZXJhdGUgcXVlc3Rpb24gZm9yIHRvcGljIGV4ZXJjaXNlXG4gIGdlbmVyYXRlVG9waWNRdWVzdGlvbnMgKCk6IEdlbmVyYXRlZFF1ZXN0aW9uRGF0YVtdIHtcbiAgICBjb25zdCBxdWFudGl0eSA9IHRoaXMucXVlc3Rpb24ucmV2aWV3UXVhbnRpdHkgfHwgMFxuICAgIHJldHVybiB0aGlzLl9nZW5lcmF0ZVF1ZXN0aW9ucyhxdWFudGl0eSlcbiAgfVxufVxuIl19
