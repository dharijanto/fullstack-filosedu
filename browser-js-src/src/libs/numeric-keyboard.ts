import * as $ from 'jquery'

const BUTTON_COLOR = '#0089ba'
const BUTTON_HOVER_COLOR = '#008f7a'

$.fn['NumericKeyboard'] = function ({ targetInput }) {
  const rootElement = $(this)
  let currentElement = $(`<div class="keyboard" />`).appendTo(rootElement)
  currentElement = $(`<div class="easy-numpad-container" />`).css(
    {
      position: 'relative',
      margin: '0 auto',
      width: '100%',
      'max-width': '310px',
      '-webkit-box-shadow': '0px 0px 5px 0px rgba(0,0,0,0.5)',
      '-moz-box-shadow': '0px 0px 5px 0px rgba(0,0,0,0.5)',
      'box-shadow': '0px 0px 5px 0px rgba(0,0,0,0.5)',
      'background-color': 'lightgray',
      padding: '10px'
    }).appendTo(rootElement)
  currentElement = $(`<div class="easy-numpad-number-container" />`).appendTo(currentElement)
  currentElement = $(`<table />`).css({
    width: 'calc(100% + 6px)',
    position: 'relative',
    left: '-3px',
    'margin-top': '10px'
  }).appendTo(currentElement)
  const tbody = $(`<tbody />`).appendTo(currentElement)
  for (let row = 2; row >= 0; row--) {
    let currentRow = $(`<tr />`).appendTo(tbody)
    for (let index = 1; index <= 4; index++) {
      let value
      if (index < 4) {
        value = row * 3 + index
      } else {
        value = ['<', 'C', '0'][row]
      }
      const td = $(`<td></td>`).css(
        {
          padding: '1.5px'
        }
      ).appendTo(currentRow)
      const numButton = $(`<a>${value}</a>`).css(
        {
          display: 'block',
          padding: '16px 10px',
          'background-color': BUTTON_COLOR,
          color: '#fff',
          'text-align': 'center',
          'border-radius': '6px'
        }).hover(function () {
          $(this).css(
            {
              'background-color': BUTTON_HOVER_COLOR
            })
        }).mouseout(function () {
          $(this).css(
            {
              'background-color': BUTTON_COLOR
            }
          )
        }).appendTo(td)
      numButton.css('text-decoration', 'none')
      numButton.click(function () {
        const pressedValue = $(this).text()
        const currentValue = $(targetInput).val().toString()
        let newValue
        if (pressedValue === '<') {
          if (currentValue.length > 0) {
            newValue = currentValue.substring(0, currentValue.length - 1)
          }
        } else if (pressedValue === 'C') {
          newValue = ''
        } else {
          newValue = currentValue + pressedValue
        }
        $(targetInput).val(newValue)
      })
    }
  }
}
