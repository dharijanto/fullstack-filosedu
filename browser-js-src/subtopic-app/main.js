var videojs = require('video.js')
var $ = require('jquery')

$(document).ready(function () {
  var video = videojs('#video-player')
  video.videoJsResolutionSwitcher({
    default: 'low',
    dynamicLabel: true
  })

  video.on('pause', function (e) {
  })

  // Add Feedback After Video Ends
  // TODO: Change width and height to use @media in CSS
  video.endcapCTA({
    html: `<section class="endcapCallToActionContent" style="top:33%; left:35%; position: absolute;"><button id="cta_good"><img src="/assets/img/good_smiley.jpg" width="100" height="100"/></button><button id="cta_bad"><img src="/assets/img/bad_smiley.jpg" width="100" height="100"/></button></section>`,
    run: function () {
      // This runs upon creation of endcapCTA, just after video starts playing

      // Avoid the callback from getting hook multiple time
      $('#cta_good').off('click')
      $('#cta_bad').off('click')

      var videoId = $('#video-player').data('id')
      $('#cta_good').on('click', function (e) {
        submitFeedback(true, videoId)
        $(this).parent().parent().removeClass('is-active')
      })
      $('#cta_bad').on('click', function (e) {
        submitFeedback(false, videoId)
        $(this).parent().parent().removeClass('is-active')
      })
    }
  })

  function submitFeedback (positive, videoId) {
    $.ajax({
      method: 'POST',
      url: '/video/feedback',
      data: {
        videoId,
        value: positive ? 1 : 0
      }
    }).done(function (data) {
      if (!data.status) {
        console.error(JSON.stringify(data))
      }
    }).fail(function (jqXHR, textStatus) {
      console.error(textStatus)
    })
  }
})
