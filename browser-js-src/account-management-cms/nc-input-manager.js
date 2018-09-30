var $ = require('jquery')
var Config = require('../config')
var rootPath = require('cmsRootPath')
var axios = require('axios')
var toastr = require('toastr')

var NCInputs = {}

// -----------------------------------------
// Where to GET the data from
// -----------------------------------------
function getUserURL () {
  return rootPath + 'accountmanagement/user/get'
}
// -----------------------------------------

// -----------------------------------------
// Where to POST the data into
// -----------------------------------------
const postTo = {
  school: {
    add: function () {
      return rootPath + 'accountmanagement/user/add'
    },
    edit: function () {
      return rootPath + 'accountmanagement/user/edit'
    },
    delete: function () {
      return rootPath + 'accountmanagement/user/delete'
    }
  }
}
// -----------------------------------------

function getGrade () {
  return [1, 2, 3, 4, 5, 6]
}

function getSchoolNames () {
  return axios.get(rootPath + 'school/management/get').then(resp => {
    if (resp.data.status) {
      return resp.data.data.map((data) => {
        return data.name
      })
    } else {
      return resp
    }
  })
}

function onDataClicked (data) {
  // console.log(data)
}
// -----------------------------------------
// NC-Input-Library configuration
// -----------------------------------------

const tableConfig = {
  accountManagementHeader: {
    design: {
      title: 'Account Management',
      panelColor: 'green'
    },
    table: {
      ui: [
        {id: 'id', desc: 'ID', dataTable: true, input: 'text', disabled: true},
        {id: 'fullName', desc: 'Full Name', dataTable: true, input: 'text'},
        {id: 'username', desc: 'User Name', dataTable: true, input: 'text', disabled: false},
        {id: 'email', desc: 'E-mail', dataTable: true, input: 'text', disabled: false},
        {id: 'school.name', desc: 'School Name', dataTable: true, input: 'select', selectData: getSchoolNames},
        {id: 'grade', desc: 'Grade', dataTable: true, input: 'select', selectData: getGrade},
        {id: 'updatedAt', desc: 'Last Modified', dataTable: true, input: 'date'},
        {id: 'password', desc: 'Password', dataTable: false, input: 'password'},
        {id: 'passwordConfirm', desc: 'Password Confirm', dataTable: false, input: 'password'}
      ],
      conf: {
        orderBy: 'updatedAt',
        orderType: 'desc',
        getURL: getUserURL,
        onRowClicked: onDataClicked
      }
    },
    buttons: {
      conf: {
        networkTimeout: Config.NETWORK_TIMEOUT
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

function initializeEditors (accountEditorId) {
  NCInputs.accountNcInput = $(accountEditorId).NCInputLibrary(tableConfig.accountManagementHeader)
  NCInputs.accountNcInput.reloadTable()
  return NCInputs
}

module.exports = {initializeEditors}
