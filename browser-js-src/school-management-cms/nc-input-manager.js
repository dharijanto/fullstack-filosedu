var $ = require('jquery')
var rootPath = require('cmsRootPath')
var toastr = require('toastr')

var selectedIds = {}
var NCInputs = {}

// -----------------------------------------
// Where to GET the data from
// -----------------------------------------
function getModelURL (model) {
  return rootPath + model + '/get'
}

function getSchoolURL () {
  return getModelURL('school/management')
}
// -----------------------------------------

// -----------------------------------------
// Where to POST the data into
// -----------------------------------------
const postTo = {
  school: {
    add: function () {
      return rootPath + 'school/management/add'
    },
    edit: function () {
      return rootPath + 'school/management/edit'
    },
    delete: function () {
      return rootPath + 'school/management/delete'
    }
  }
}
// -----------------------------------------

// -----------------------------------------
// What should happen when the table is sclicked
// -----------------------------------------
function onschoolClicked (data) {
  // console.log('onschoolClicked(): ' + JSON.stringify(data))
  selectedIds.school = data.id
}

// -----------------------------------------
// NC-Input-Library configuration
// -----------------------------------------

const tableConfig = {
  schoolHeader: {
    design: {
      title: 'School',
      panelColor: 'green'
    },
    table: {
      ui: [
        {id: 'id', desc: 'ID', dataTable: true, input: 'text', disabled: true},
        {id: 'identifier', desc: 'Identifier', dataTable: true, input: 'text', disabled: false},
        {id: 'name', desc: 'School Name', dataTable: true, input: 'text'},
        {id: 'logo', desc: 'Logo', dataTable: true, input: 'text'},
        {id: 'address', desc: 'Address', dataTable: true, input: 'text'},
        {id: 'phone', desc: 'Phone', dataTable: true, input: 'text'},
        {id: 'updatedAt', desc: 'Updated At', dataTable: true, input: 'date', disabled: true}
      ],
      conf: {
        orderBy: 'updatedAt',
        orderType: 'DESC',
        getURL: getSchoolURL,
        onRowClicked: onschoolClicked
      }
    },
    buttons: {
      conf: {
        networkTimeOut: 2000
      },
      ui: [
        {id: 'add', desc: 'Add', postTo: postTo.school.add},
        {id: 'edit', desc: 'Edit', postTo: postTo.school.edit},
        {id: 'delete', desc: 'Delete', postTo: postTo.school.delete}
      ]
    }
  }
}
// -----------------------------------------

function initializeEditors (schoolEditorId) {
  NCInputs.schoolNcInput = $(schoolEditorId).NCInputLibrary(tableConfig.schoolHeader)
  NCInputs.schoolNcInput.reloadTable()
  return NCInputs
}

module.exports = {initializeEditors}
