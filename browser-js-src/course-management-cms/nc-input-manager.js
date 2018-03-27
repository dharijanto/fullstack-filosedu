var $ = require('jquery')
var rootPath = require('cmsRootPath')
var toastr = require('toastr')

var selectedIds = {}
var NCInputs = {}

// -----------------------------------------
// Where to GET the data from
// -----------------------------------------
function getModelURL (model) {
  return rootPath + 'get/' + model
}

function getSubjectURL () {
  return getModelURL('Subject')
}

function getTopicURL () {
  return getModelURL('Topic?subjectId=') + selectedIds.subject
}

function getTopicDependencyURL () {
  return getModelURL('TopicDependency?topicId=') + selectedIds.topic
}

function getSubtopicURL () {
  return getModelURL('Subtopic?topicId=') + selectedIds.topic
}
// -----------------------------------------

// -----------------------------------------
// Where to POST the data into
// -----------------------------------------
const postTo = {
  subject: {
    add: function () {
      return rootPath + 'add/Subject'
    },
    edit: function () {
      return rootPath + 'edit/Subject'
    },
    delete: function () {
      return rootPath + 'delete/Subject'
    }
  },
  topic: {
    add: function () {
      const topicAddURL = rootPath + 'add/Topic?subjectId=' + selectedIds.subject
      console.log('topicAddURL=' + topicAddURL)
      return topicAddURL
    },
    edit: function () {
      return rootPath + 'edit/Topic'
    },
    delete: function () {
      return rootPath + 'delete/Topic'
    }
  },
  topicDependency: {
    add: function () {
      return rootPath + 'add/TopicDependency?topicId=' + selectedIds.topic
    },
    edit: function () {
      return rootPath + 'edit/TopicDependency?topicId=' + selectedIds.topic
    },
    delete: function () {
      return rootPath + 'delete/TopicDependency?topicId=' + selectedIds.topic
    }
  },
  subtopic: {
    add: function () {
      return rootPath + 'add/Subtopic?topicId=' + selectedIds.topic
    },
    edit: function () {
      return rootPath + 'edit/Subtopic'
    },
    delete: function () {
      return rootPath + 'delete/Subtopic'
    }
  }
}
// -----------------------------------------

// -----------------------------------------
// What should happen when the table is sclicked
// -----------------------------------------
function onSubjectClicked (data) {
  // console.log('onSubjectClicked(): ' + JSON.stringify(data))
  selectedIds.subject = data.id
  NCInputs.topicNcInput.reloadTable()
}

function onTopicClicked (data) {
  // console.log('onTopicClicked(): ' + JSON.stringify(data))
  selectedIds.topic = data.id
  NCInputs.topicDependencyInput.reloadTable()
  NCInputs.subtopicNcInput.reloadTable()
}

function onTopicDependencyClicked (data) {
  console.warn('NOT IMPLEMENTED!')
}

function onSubtopicClicked (data) {
  toastr.info('Click on highlighted row to open subtopic-management page')
  // When highlighted row is clicked, open management page
  if (selectedIds.subtopic === data.id) {
    // window.location = rootPath + 'subtopic/' + data.id
    window.open(rootPath + 'subtopic/' + data.id + '/')
  }
  // console.log('onSubtopicClicked(): ' + JSON.stringify(data))
  selectedIds.subtopic = data.id
}
// -----------------------------------------

// -----------------------------------------
// NC-Input-Library configuration
// -----------------------------------------

const tableConfig = {
  subjectHeader: {
    design: {
      title: 'Subject',
      panelColor: 'green'
    },
    table: {
      ui: [
        {id: 'id', desc: 'ID', dataTable: true, input: 'text', disabled: true},
        {id: 'subject', desc: 'Subject', dataTable: true, input: 'text', disabled: false},
        {id: 'updatedAt', desc: 'Last Modified', dataTable: true, input: 'date'},
        {id: 'description', desc: 'Description', dataTable: true, input: 'textArea'}
      ],
      conf: {
        orderBy: 'updatedAt',
        getURL: getSubjectURL,
        onRowClicked: onSubjectClicked
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
  },
  topicHeader: {
    design: {
      title: 'Topic'
    },
    table: {
      ui: [
        {id: 'id', desc: 'ID', dataTable: true, input: 'text', disabled: true},
        {id: 'topic', desc: 'Topic', dataTable: true, input: 'text', disabled: false},
        {id: 'topicNo', desc: 'Topic No', dataTable: true, input: 'text', disabled: false},
        {id: 'description', desc: 'Description', dataTable: true, input: 'textArea'},
        {id: 'updatedAt', desc: 'Last Modified', dataTable: true, input: 'date'}
      ],
      conf: {
        orderType: 'asc',
        orderBy: 'topicNo',
        getURL: getTopicURL,
        onRowClicked: onTopicClicked
      }
    },
    buttons: {
      conf: {
        networkTimeOut: 2000
      },
      ui: [
        {id: 'add', desc: 'Add', postTo: postTo.topic.add},
        {id: 'edit', desc: 'Edit', postTo: postTo.topic.edit},
        {id: 'delete', desc: 'Delete', postTo: postTo.topic.delete}
      ]
    }
  },
  topicDependencyHeader: {
    design: {
      title: 'Topic Dependency'
    },
    table: {
      ui: [
        {id: 'id', desc: 'ID', dataTable: true, input: 'text', disabled: true},
        {id: 'dependencyName', desc: 'Dependency Name', dataTable: true, input: 'text', disabled: false},
        {id: 'description', desc: 'Description', dataTable: true, input: 'textArea'},
        {id: 'updatedAt', desc: 'Last Modified', dataTable: true, input: 'date'}
      ],
      conf: {
        orderBy: 'updatedAt',
        getURL: getTopicDependencyURL,
        onRowClicked: onTopicDependencyClicked
      }
    },
    buttons: {
      conf: {
        networkTimeOut: 2000
      },
      ui: [
        {id: 'add', desc: 'Add', postTo: postTo.topicDependency.add},
        {id: 'edit', desc: 'Edit', postTo: postTo.topicDependency.edit},
        {id: 'delete', desc: 'Delete', postTo: postTo.topicDependency.delete}
      ]
    }
  },
  subtopicHeader: {
    design: {
      title: 'Subtopic'
    },
    table: {
      ui: [
        {id: 'id', desc: 'ID', dataTable: true, input: 'text', disabled: true},
        {id: 'subtopic', desc: 'Subtopic', dataTable: true, input: 'text', disabled: false},
        {id: 'subtopicNo', desc: 'Subtopic No', dataTable: true, input: 'text', disabled: false},
        {id: 'description', desc: 'Description', dataTable: true, input: 'textArea'},
        {id: 'updatedAt', desc: 'Last Modified', dataTable: true, input: 'date'}
      ],
      conf: {
        orderType: 'asc',
        orderBy: 'subtopicNo',
        getURL: getSubtopicURL,
        onRowClicked: onSubtopicClicked
      }
    },
    buttons: {
      conf: {
        networkTimeOut: 2000
      },
      ui: [
        {id: 'add', desc: 'Add', postTo: postTo.subtopic.add},
        {id: 'edit', desc: 'Edit', postTo: postTo.subtopic.edit},
        {id: 'delete', desc: 'Delete', postTo: postTo.subtopic.delete}
      ]
    }
  }
}
// -----------------------------------------

function initializeEditors (subjectEditorId, topicEditorId, dependencyEditorId, subtopicEditorId) {
  NCInputs.subjectNcInput = $(subjectEditorId).NCInputLibrary(tableConfig.subjectHeader)
  NCInputs.topicNcInput = $(topicEditorId).NCInputLibrary(tableConfig.topicHeader)
  NCInputs.topicDependencyInput = $(dependencyEditorId).NCInputLibrary(tableConfig.topicDependencyHeader)
  NCInputs.subtopicNcInput = $(subtopicEditorId).NCInputLibrary(tableConfig.subtopicHeader)
  NCInputs.subjectNcInput.reloadTable()

  return NCInputs
}

module.exports = {initializeEditors}
