"use strict";Object.defineProperty(exports,"__esModule",{value:!0});const path=require("path"),exercise_solvers_1=require("./exercise_solvers");let log=require("npmlog"),Crypto=require(path.join(__dirname,"../crypto"));const TAG="ExerciseGenerator";class ExerciseGenerator{static getHash(e){return Crypto.md5(e)}static getExerciseSolver(questionData){try{const parsedQuestion="object"==typeof questionData?questionData:eval(questionData),SolverClass=exercise_solvers_1.default.find(e=>e.solverName===parsedQuestion.solver.type);if(!SolverClass)throw new Error(`No exercise solver with name=${parsedQuestion.solver.type}!`);return new SolverClass(parsedQuestion)}catch(e){throw e}}}exports.default=ExerciseGenerator;
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9saWIvZXhlcmNpc2VfZ2VuZXJhdG9yL2V4ZXJjaXNlLWdlbmVyYXRvci50cyJdLCJuYW1lcyI6WyJwYXRoIiwicmVxdWlyZSIsImV4ZXJjaXNlX3NvbHZlcnNfMSIsImxvZyIsIkNyeXB0byIsImpvaW4iLCJfX2Rpcm5hbWUiLCJUQUciLCJFeGVyY2lzZUdlbmVyYXRvciIsIltvYmplY3QgT2JqZWN0XSIsInF1ZXN0aW9uRGF0YSIsIm1kNSIsInBhcnNlZFF1ZXN0aW9uIiwiZXZhbCIsIlNvbHZlckNsYXNzIiwiZGVmYXVsdCIsImZpbmQiLCJzb2x2ZXIiLCJzb2x2ZXJOYW1lIiwidHlwZSIsIkVycm9yIiwiZXJyIiwiZXhwb3J0cyJdLCJtYXBwaW5ncyI6Im9FQUFBLE1BQUFBLEtBQUFDLFFBQUEsUUFDQUMsbUJBQUFELFFBQUEsc0JBR0EsSUFBSUUsSUFBTUYsUUFBUSxVQUNkRyxPQUFTSCxRQUFRRCxLQUFLSyxLQUFLQyxVQUFXLGNBRTFDLE1BQU1DLElBQU0sMEJBQ1pDLGtCQUNFQyxlQUFnQkMsR0FLZCxPQUFPTixPQUFPTyxJQUFJRCxHQUdwQkQseUJBQTBCQyxjQUN4QixJQUdFLE1BQU1FLGVBQXlDLGlCQUFqQkYsYUFBNEJBLGFBQWVHLEtBQUtILGNBQ3hFSSxZQUFjWixtQkFBQWEsUUFBUUMsS0FBS0MsR0FBVUEsRUFBT0MsYUFBZU4sZUFBZUssT0FBT0UsTUFDdkYsSUFBS0wsWUFDSCxNQUFNLElBQUlNLHNDQUFzQ1IsZUFBZUssT0FBT0UsU0FFeEUsT0FBTyxJQUFJTCxZQUFZRixnQkFDdkIsTUFBT1MsR0FDUCxNQUFNQSxJQXBCWkMsUUFBQVAsUUFBQVAiLCJmaWxlIjoibGliL2V4ZXJjaXNlX2dlbmVyYXRvci9leGVyY2lzZS1nZW5lcmF0b3IuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnXG5pbXBvcnQgU29sdmVycyBmcm9tICcuL2V4ZXJjaXNlX3NvbHZlcnMnXG5pbXBvcnQgRXhlcmNpc2VTb2x2ZXIgZnJvbSAnLi9leGVyY2lzZV9zb2x2ZXJzL2V4ZXJjaXNlLXNvbHZlcic7XG5cbmxldCBsb2cgPSByZXF1aXJlKCducG1sb2cnKVxubGV0IENyeXB0byA9IHJlcXVpcmUocGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2NyeXB0bycpKVxuXG5jb25zdCBUQUcgPSAnRXhlcmNpc2VHZW5lcmF0b3InXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBFeGVyY2lzZUdlbmVyYXRvciB7XG4gIHN0YXRpYyBnZXRIYXNoIChxdWVzdGlvbkRhdGEpOiBzdHJpbmcge1xuICAgIC8vIFRPRE86XG4gICAgLy8gRG8gc29tZXRoaW5nIHNvIHRoYXQgaXJyZWxldmFudCBjaGFuZ2VzIGRvbid0IGNoYW5nZSB0aGUgaGFzaFxuICAgIC8vIDEuIFRyaW0gdHJhaWxpbmcgc3BhY2VzXG4gICAgLy8gMi4gUmVtb3ZlIGNvbW1lbnRzXG4gICAgcmV0dXJuIENyeXB0by5tZDUocXVlc3Rpb25EYXRhKVxuICB9XG5cbiAgc3RhdGljIGdldEV4ZXJjaXNlU29sdmVyIChxdWVzdGlvbkRhdGEpOiBFeGVyY2lzZVNvbHZlciB7XG4gICAgdHJ5IHtcbiAgICAgIC8vIElmIHF1ZXN0aW9uRGF0YSBpcyBhbHJlYWR5IHBhcnNlZCwgdXNlIGl0LCBvdGhlcndpc2UsIGl0J3MgcmV0cmlldmVkXG4gICAgICAvLyBmcm9tIGRhdGFiYXNlIGFuZCBuZWVkcyB0byBiZSBldmFsLWVkXG4gICAgICBjb25zdCBwYXJzZWRRdWVzdGlvbiA9IHR5cGVvZiBxdWVzdGlvbkRhdGEgPT09ICdvYmplY3QnID8gcXVlc3Rpb25EYXRhIDogZXZhbChxdWVzdGlvbkRhdGEpXG4gICAgICBjb25zdCBTb2x2ZXJDbGFzcyA9IFNvbHZlcnMuZmluZChzb2x2ZXIgPT4gc29sdmVyLnNvbHZlck5hbWUgPT09IHBhcnNlZFF1ZXN0aW9uLnNvbHZlci50eXBlKVxuICAgICAgaWYgKCFTb2x2ZXJDbGFzcykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIGV4ZXJjaXNlIHNvbHZlciB3aXRoIG5hbWU9JHtwYXJzZWRRdWVzdGlvbi5zb2x2ZXIudHlwZX0hYClcbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXcgU29sdmVyQ2xhc3MocGFyc2VkUXVlc3Rpb24pXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aHJvdyBlcnJcbiAgICB9XG4gIH1cbn1cbiJdfQ==
