/*
  Width is on percentage value
*/
function convertToTagHTML (URL, width = 100) {
  return "<img src='" + URL + "' width='" + width + "%' />"
}

function repeat (URL, width = 100, row = 1, column = 1) {
  var table = '<table>'
  var tableBody = '<tbody>'
  for (var i = 0; i < row; i++) {
    var tableContent = '<tr>'
    for (var j = 0; j < column; j++) {
      tableContent += '<td style="padding:5px;"><img src="' + URL + '" width="' + width + '%"/></td>'
    }
    tableContent += '</tr>'
    tableBody += tableContent
  }
  tableBody += '</tbody>'
  table += tableBody
  table += '</table>'
  return table
}

module.exports = {
  convertToTagHTML,
  repeat
}
