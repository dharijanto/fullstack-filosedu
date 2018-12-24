var _=require("lodash");const knowns=["a","b"],unknowns=["x"],randomGeneratorFn=()=>{const n={knowns:{},unknowns:{}};return n.knowns.b=_.random(7,20),n.knowns.a=_.random(n.knowns.b,25),n.unknowns.x=n.knowns.a+n.knowns.b,n},isAnswerFn=({a:n,b:o},{x:s})=>s-n===o,printFn=({a:n,b:o})=>{const s=[`x - ${n} = ${o}`];return _.sample(s)},isEqualFn=(n,o)=>_.isEqual(n,o);module.exports={quantity:10,solver:{type:"bruteforce_solver",randomGeneratorFn:randomGeneratorFn,isEqualFn:isEqualFn,timeout:1e3},knowns:knowns,unknowns:unknowns,isAnswerFn:isAnswerFn,printFn:printFn};
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy90ZXN0L3VuaXQtdGVzdC9kYXRhL2JydXRlZm9yY2UtcXVlc3Rpb24tMi5qcyJdLCJuYW1lcyI6WyJfIiwicmVxdWlyZSIsImtub3ducyIsInVua25vd25zIiwicmFuZG9tR2VuZXJhdG9yRm4iLCJyZXN1bHQiLCJiIiwicmFuZG9tIiwiYSIsIngiLCJpc0Fuc3dlckZuIiwicHJpbnRGbiIsImZvcm1hdHRlZCIsInNhbXBsZSIsImlzRXF1YWxGbiIsInVua25vd25zMSIsInVua25vd25zMiIsImlzRXF1YWwiLCJtb2R1bGUiLCJleHBvcnRzIiwicXVhbnRpdHkiLCJzb2x2ZXIiLCJ0eXBlIiwidGltZW91dCJdLCJtYXBwaW5ncyI6IkFBWUEsSUFBSUEsRUFBSUMsUUFBUSxVQUVoQixNQUFNQyxRQUFVLElBQUssS0FDZkMsVUFBWSxLQUVaQyxrQkFBb0IsS0FDeEIsTUFBTUMsR0FBVUgsVUFBWUMsYUFJNUIsT0FIQUUsRUFBT0gsT0FBT0ksRUFBSU4sRUFBRU8sT0FBTyxFQUFHLElBQzlCRixFQUFPSCxPQUFPTSxFQUFJUixFQUFFTyxPQUFPRixFQUFPSCxPQUFPSSxFQUFHLElBQzVDRCxFQUFPRixTQUFTTSxFQUFJSixFQUFPSCxPQUFPTSxFQUFJSCxFQUFPSCxPQUFPSSxFQUM3Q0QsR0FLSEssV0FBYSxFQUFFRixFQUFBQSxFQUFHRixFQUFBQSxJQUFLRyxFQUFBQSxLQUNwQkEsRUFBSUQsSUFBTUYsRUFJYkssUUFBVSxFQUFFSCxFQUFBQSxFQUFHRixFQUFBQSxNQUNuQixNQUFNTSxVQUFvQkosT0FBT0YsS0FDakMsT0FBT04sRUFBRWEsT0FBT0QsSUFNWkUsVUFBWSxDQUFDQyxFQUFXQyxJQUVyQmhCLEVBQUVpQixRQUFRRixFQUFXQyxHQUc5QkUsT0FBT0MsU0FDTEMsU0FBVSxHQUNWQyxRQUNFQyxLQUFNLG9CQUNObEIsa0JBQUFBLGtCQUNBVSxVQUFBQSxVQUNBUyxRQUFTLEtBRVhyQixPQUFBQSxPQUNBQyxTQUFBQSxTQUNBTyxXQUFBQSxXQUNBQyxRQUFBQSIsImZpbGUiOiJ0ZXN0L3VuaXQtdGVzdC9kYXRhL2JydXRlZm9yY2UtcXVlc3Rpb24tMi5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gIEdlbmVyYXRlIHRoZSBxdWVzdGlvbiBvZiBmb3JtYXQ6XG4gICAgWCAtIDUgPSAzXG5cbiAgR2VuZXJhbCBmb3JtOlxuICAgIFggLSBhID0gYlxuXG4gIENvbnN0cmFpbnRzOlxuICAgIDcgPCBiIDwgMjBcbiAgICBiIDwgYSA8IDI1XG4qL1xuXG52YXIgXyA9IHJlcXVpcmUoJ2xvZGFzaCcpXG5cbmNvbnN0IGtub3ducyA9IFsnYScsICdiJ11cbmNvbnN0IHVua25vd25zID0gWyd4J11cblxuY29uc3QgcmFuZG9tR2VuZXJhdG9yRm4gPSAoKSA9PiB7XG4gIGNvbnN0IHJlc3VsdCA9IHtrbm93bnM6IHt9LCB1bmtub3duczoge319XG4gIHJlc3VsdC5rbm93bnMuYiA9IF8ucmFuZG9tKDcsIDIwKVxuICByZXN1bHQua25vd25zLmEgPSBfLnJhbmRvbShyZXN1bHQua25vd25zLmIsIDI1KVxuICByZXN1bHQudW5rbm93bnMueCA9IHJlc3VsdC5rbm93bnMuYSArIHJlc3VsdC5rbm93bnMuYlxuICByZXR1cm4gcmVzdWx0XG59XG5cbi8vIHBhcmFtMToga25vd25zXG4vLyBwYXJhbTI6IHVua25vd25zXG5jb25zdCBpc0Fuc3dlckZuID0gKHthLCBifSwge3h9KSA9PiB7XG4gIHJldHVybiB4IC0gYSA9PT0gYlxufVxuXG4vLyBEZXNjcmliZSBob3cgdGhlIHF1ZXN0aW9uIHdpbGwgYmUgcHJpbnRlZFxuY29uc3QgcHJpbnRGbiA9ICh7YSwgYn0pID0+IHtcbiAgY29uc3QgZm9ybWF0dGVkID0gW2B4IC0gJHthfSA9ICR7Yn1gXVxuICByZXR1cm4gXy5zYW1wbGUoZm9ybWF0dGVkKVxufVxuXG4vLyBJbiBhZGRpdGlvbiB0byBleGFjdCBtYXRjaGVzLCB0aGlzIGRlc2NyaWJlIHRoZSBvdGhlciBtYXRjaGVzXG4vLyB1bmtub3duczEgPSB7YSwgYn1cbi8vIHVua25vd25zMiA9IHthLCBifVxuY29uc3QgaXNFcXVhbEZuID0gKHVua25vd25zMSwgdW5rbm93bnMyKSA9PiB7XG4gIC8vIEZvciB0aGlzIGV4YW1wbGUsIGV4YWN0IG1hdGNoIGlzIHRoZSBvbmx5IG1hdGNoXG4gIHJldHVybiBfLmlzRXF1YWwodW5rbm93bnMxLCB1bmtub3duczIpXG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBxdWFudGl0eTogMTAsIC8vIFRoZSBudW1iZXIgb2YgcXVlc3Rpb25zIHRvIGJlIGdlbmVyYXRlZFxuICBzb2x2ZXI6IHtcbiAgICB0eXBlOiAnYnJ1dGVmb3JjZV9zb2x2ZXInLCAvLyBUaGUgcXVlc3Rpb25zIGFyZSBnZW5lcmF0ZWQgdXNpbmcgYnJ1dGVmb3JjZVxuICAgIHJhbmRvbUdlbmVyYXRvckZuLCAvLyAnYnJ1dGVmb3JjZV9zb2x2ZXInIHVzZXMgcmFuZG9tIGdlbmVyYXRvciB0byBnZW5lcmF0ZSBlYWNoIG9mIHRoZSB2YXJpYWJsZXNcbiAgICBpc0VxdWFsRm4sIC8vIFJldHVybiB0cnVlIGlmIDIgZXF1YXRpb25zIGFyZSB0aGUgc2FtZVxuICAgIHRpbWVvdXQ6IDEwMDAgLy8gTWF4aW11bSB0aW1lIHRvIGdlbmVyYXRlIGFsbCBvZiB0aGUgcXVlc3Rpb25zXG4gIH0sXG4gIGtub3ducywgLy8gJ0dpdmVuJyB2YXJpYWJsZXNcbiAgdW5rbm93bnMsIC8vICdRdWVzdGlvbicgdmFyaWFibGVzXG4gIGlzQW5zd2VyRm4sIC8vIFJldHVybiB0cnVlIGlmIHRoZSBjb21iaW5hdGlvbiBvZiAna25vd25zJyBhbmQgJ3Vua25vd25zJyBzb2x2ZSB0aGUgcHJvYmxlbVxuICBwcmludEZuIC8vIFByaW50IHRoZSBxdWVzdGlvblxufSJdfQ==