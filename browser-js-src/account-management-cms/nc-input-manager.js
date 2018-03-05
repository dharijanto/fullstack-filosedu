var $ = require('jquery')
var rootPath = require('cmsRootPath')
var toastr = require('toastr')

var NCInputs = {}

// -----------------------------------------
// Where to GET the data from
// -----------------------------------------
function getUserURL () {
  return rootPath + 'get/user/accountmanagement'
}
// -----------------------------------------

// -----------------------------------------
// Where to POST the data into
// -----------------------------------------
const postTo = {
  subject: {
    add: function () {
      return rootPath + 'add/user/accountmanagement'
    },
    edit: function () {
      return rootPath + 'edit/user/accountmanagement'
    },
    delete: function () {
      return rootPath + 'delete/user/accountmanagement'
    }
  }
}
// -----------------------------------------

function onAccountClicked () {

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
        {id: 'updatedAt', desc: 'Last Modified', dataTable: true, input: 'date'},
        {id: 'password', desc: 'Password', dataTable: false, input: 'password'},
        {id: 'passwordConfirm', desc: 'Password Confirm', dataTable: false, input: 'password'}
      ],
      conf: {
        orderBy: 'updatedAt',
        getURL: getUserURL,
        onRowClicked: onAccountClicked
      }
    },
    buttons: {
      conf: {
        networkTimeOut: 2000
      },
      ui: [
        {id: 'add', desc: 'Add', postTo: postTo.subject.add},
        {id: 'edit', desc: 'Edit', postTo: postTo.subject.edit},
        {id: 'delete', desc: 'Delete', postTo: postTo.subject.delete}
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
