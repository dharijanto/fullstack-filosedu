$('.select2').select2()
$(document).ready(function (e) {
  $('select[name=schoolId]').on('change', function (e) {
    changeLogoImage($(this).find(':selected').data('logo'))
  })
  var dataLogoURL = $('select[name=schoolId]').find(':selected').data('logo')
  changeLogoImage(dataLogoURL)
})

function changeLogoImage (logoURL) {
  $('#logoSchool').empty()
  $('#logoSchool').append(`<img src="${logoURL}" class="img-responsive" style="margin:0 auto;height:300px;"/>`)
}
