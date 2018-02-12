var videojs = require('video.js')
var $ = require('jquery')

$(document).ready(function () {
  var video = videojs('#video-player')
  video.videoJsResolutionSwitcher({
    default: 'low',
    dynamicLabel: true
  })

  video.on('pause', function (e) {
    console.log('onVideoPaused()')
    clearInterval(viewTimer)
    viewTimer = null
  })

  // Used to keep track video duration
  var viewTimer = null
  const TIMER_INTERVAL = 30 // seconds

  video.on('play', function (e) {
    console.log('onVideoPlay()')
    if (viewTimer) {
      clearInterval(viewTimer)
    }
    const videoId = $('#video-player').data('id')
    viewTimer = setInterval(() => {
      console.log('onVideoBeingViewed()')
      addViewDuration(videoId)
    }, TIMER_INTERVAL * 1000)
  })

  // Used to keep track of skipped video
  var videoPlayed = false
  video.one('play', function () {
    videoPlayed = true
    console.log('onVideoViewed()')
    const videoId = $('#video-player').data('id')
    addView(videoId)
  })

  $('.exerciseButton').click(function () {
    var hrefData = $(this).data('href')
    var videoId = $('#video-player').data('id')
    console.log('onExerciseClicked(): hrefData=' + hrefData)
    if (!videoPlayed) {
      addSkippedVideo(videoId, () => {
        window.location.href = hrefData
      })
    } else {
      window.location.href = hrefData
    }
  })

  // Show smiley/sad face at the end of video
  // TODO: Change width and height to use @media in CSS
  video.endcapCTA({
    html: `<section class="endcapCallToActionContent" style="top:33%; left:35%; position: absolute;"><button id="cta_good"><img src="/assets/img/good_smiley.jpg" width="100" height="100"/></button><button id="cta_bad"><img src="/assets/img/bad_smiley.jpg" width="100" height="100"/></button></section>`,
    run: function () {
      // This runs upon creation of endcapCTA, just after video starts playing

      // Avoid the callback from getting hook multiple time
      $('#cta_good').off('click')
      $('#cta_bad').off('click')

      const videoId = $('#video-player').data('id')
      $('#cta_good').on('click', function (e) {
        addFeedback(1, videoId)
        $(this).parent().parent().removeClass('is-active')
      })
      $('#cta_bad').on('click', function (e) {
        addFeedback(-1, videoId)
        $(this).parent().parent().removeClass('is-active')
      })
    }
  })

  // -----------------------------
  // Video Analytics
  // -----------------------------

  /*
    Feedback:
    Value: 1 -> Like the video
    Value: 0 -> Dislike the video
  */
  function addFeedback (value, videoId) {
    $.ajax({
      method: 'POST',
      url: '/video/analytics',
      data: {
        videoId,
        value,
        key: 'feedback'
      }
    }).done(function (resp) {
      if (!resp.status) {
        console.error(JSON.stringify(resp.errMessage))
      }
    }).fail(function (jqXHR, textStatus) {
      console.error(textStatus)
    })
  }

  function addView (videoId) {
    $.ajax({
      method: 'POST',
      url: '/video/analytics',
      data: {
        videoId,
        value: 1,
        key: 'view'
      }
    }).done(function (resp) {
      if (!resp.status) {
        console.error(JSON.stringify(resp.errMessage))
      }
    }).fail(function (jqXHR, textStatus) {
      console.error(textStatus)
    })
  }

  // Triggers every 'TIMER_INTERVAL' when video is playing
  function addViewDuration (videoId) {
    $.ajax({
      method: 'POST',
      url: '/video/analytics',
      data: {
        videoId,
        value: TIMER_INTERVAL,
        key: 'viewDuration'
      }
    }).done(function (resp) {
      if (!resp.status) {
        console.error(JSON.stringify(resp.errMessage))
      }
    }).fail(function (jqXHR, textStatus) {
      console.error(textStatus)
    })
  }

  function addSkippedVideo (videoId, callback) {
    $.ajax({
      method: 'POST',
      url: '/video/analytics',
      timeout: 700, // This codepath potentially blocks exercise, so we have to have a reasonable timeout here to avoid bad user-experience
      data: {
        videoId,
        value: 1,
        key: 'skip'
      }
    }).done(function (resp) {
      if (!resp.status) {
        console.error(JSON.stringify(resp.errMessage))
      }
      callback()
    }).fail(function (jqXHR, textStatus) {
      console.error(textStatus)
      callback()
    })
  }
})
