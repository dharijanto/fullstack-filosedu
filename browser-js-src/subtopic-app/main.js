var videojs = require('video.js')
var $ = require('jquery')

const TAG = 'Subtopic-App'
var log = require('../libs/logger')

$(document).ready(function () {
  var video = videojs('#video-player')
  video.videoJsResolutionSwitcher({
    default: 'low',
    dynamicLabel: true
  })

  video.on('pause', function (e) {
    log.verbose(TAG, 'onVideoPaused()')
    clearInterval(viewTimer)
    viewTimer = null
  })

  // Used to keep track video duration
  var viewTimer = null
  const VIEW_TIMER_INTERVAL = 10 // seconds
  video.on('play', function (e) {
    log.verbose(TAG, 'onVideoPlay()')
    if (viewTimer) {
      clearInterval(viewTimer)
    }
    const videoId = $('#video-player').data('id')
    viewTimer = setInterval(() => {
      log.verbose(TAG, 'onVideoBeingViewed()')
      addViewDuration(videoId)
    }, VIEW_TIMER_INTERVAL * 1000)
  })

  // Used to keep track of skipped video
  var videoPlayed = false
  video.one('play', function () {
    videoPlayed = true
    log.verbose(TAG, 'onVideoViewedOnce()')
    const videoId = $('#video-player').data('id')
    addView(videoId)
  })

  $('.exerciseButton').click(function () {
    var hrefData = $(this).data('href')
    var videoId = $('#video-player').data('id')
    log.verbose(TAG, 'onExerciseClicked(): hrefData=' + hrefData)
    if (!videoPlayed) {
      log.verbose(TAG, 'onVideoSkipped()')
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
    html:
`<section class="endcapCallToActionContent" id="video-feedback-cta">
  <h2> Rate this video: </h2>
  </br>
  <button id="video-feedback-good">
    <img class="video-feedback-image" src="/img/good_smiley.jpg"/>
  </button>
  <button id="video-feedback-bad">
    <img class="video-feedback-image" src="/img/bad_smiley.jpg"/>
  </button>
</section>`,
    run: function () {
      // This runs upon creation of endcapCTA, just after video starts playing

      // Avoid the callback from getting hook multiple time
      $('#video-feedback-good').off('click')
      $('#video-feedback-bad').off('click')

      const videoId = $('#video-player').data('id')
      $('#video-feedback-good').on('click', function (e) {
        addFeedback(1, videoId)
        $(this).parent().parent().removeClass('is-active')
      })
      $('#video-feedback-bad').on('click', function (e) {
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

  // Triggers every 'VIEW_TIMER_INTERVAL' when video is playing
  function addViewDuration (videoId) {
    $.ajax({
      method: 'POST',
      url: '/video/analytics',
      data: {
        videoId,
        value: VIEW_TIMER_INTERVAL,
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
