(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var logLevelOrders = ['debug', 'verbose', 'info', 'error'];

var logLevel = 'debug';
var log = {};

function doLog(level, tag, message) {
  var settingLevel = logLevelOrders.indexOf(logLevel);
  var currentLevel = logLevelOrders.indexOf(level);
  // console.log('doLog(): currentLevel=' + currentLevel + ' settingLevel=' + settingLevel)
  if (currentLevel >= settingLevel) {
    // In some older browsers, console.log has to be called within the context of console.
    // Without binding to console, it's called with global context
    var logger = level === 'error' ? console.error.bind(console) : console.log.bind(console);
    logger('[' + tag + '] ' + message);
  }
}

log.debug = function (tag, message) {
  doLog('debug', tag, message);
};

log.verbose = function (tag, message) {
  doLog('verbose', tag, message);
};

log.info = function (tag, message) {
  doLog('info', tag, message);
};

log.error = function (tag, message) {
  doLog('error', tag, message);
};

log.setLogLevel = function (level) {
  logLevel = level;
};

module.exports = log;

},{}],2:[function(require,module,exports){
(function (global){
'use strict';

var videojs = (typeof window !== "undefined" ? window['videojs'] : typeof global !== "undefined" ? global['videojs'] : null);
var $ = (typeof window !== "undefined" ? window['$'] : typeof global !== "undefined" ? global['$'] : null);

var TAG = 'Subtopic-App';
var log = require('../libs/logger');

$(document).ready(function () {
  var video = videojs('#video-player');
  video.videoJsResolutionSwitcher({
    default: 'low',
    dynamicLabel: true
  });

  video.on('pause', function (e) {
    log.verbose(TAG, 'onVideoPaused()');
    clearInterval(viewTimer);
    viewTimer = null;
  });

  // Used to keep track video duration
  var viewTimer = null;
  var VIEW_TIMER_INTERVAL = 10; // seconds
  video.on('play', function (e) {
    log.verbose(TAG, 'onVideoPlay()');
    if (viewTimer) {
      clearInterval(viewTimer);
    }
    var videoId = $('#video-player').data('id');
    viewTimer = setInterval(function () {
      log.verbose(TAG, 'onVideoBeingViewed()');
      addViewDuration(videoId);
    }, VIEW_TIMER_INTERVAL * 1000);
  });

  // Used to keep track of skipped video
  var videoPlayed = false;
  video.one('play', function () {
    videoPlayed = true;
    log.verbose(TAG, 'onVideoViewedOnce()');
    var videoId = $('#video-player').data('id');
    addView(videoId);
  });

  $('.exerciseButton').click(function () {
    var hrefData = $(this).data('href');
    var videoId = $('#video-player').data('id');
    log.verbose(TAG, 'onExerciseClicked(): hrefData=' + hrefData);
    if (!videoPlayed) {
      log.verbose(TAG, 'onVideoSkipped()');
      addSkippedVideo(videoId, function () {
        window.location.href = hrefData;
      });
    } else {
      window.location.href = hrefData;
    }
  });

  // Show smiley/sad face at the end of video
  // TODO: Change width and height to use @media in CSS
  video.endcapCTA({
    html: '<section class="endcapCallToActionContent" id="video-feedback-cta">\n  <h2> Rate this video: </h2>\n  </br>\n  <button id="video-feedback-good">\n    <img class="video-feedback-image" src="/assets/img/good_smiley.jpg"/>\n  </button>\n  <button id="video-feedback-bad">\n    <img class="video-feedback-image" src="/assets/img/bad_smiley.jpg"/>\n  </button>\n</section>',
    run: function run() {
      console.log('TODO: Add video badge code here..');
      // This runs upon creation of endcapCTA, just after video starts playing

      // Avoid the callback from getting hook multiple time
      $('#video-feedback-good').off('click');
      $('#video-feedback-bad').off('click');

      var videoId = $('#video-player').data('id');
      $('#video-feedback-good').on('click', function (e) {
        addFeedback(1, videoId);
        $(this).parent().parent().removeClass('is-active');
      });
      $('#video-feedback-bad').on('click', function (e) {
        addFeedback(-1, videoId);
        $(this).parent().parent().removeClass('is-active');
      });
    }
  });

  // -----------------------------
  // Video Analytics
  // -----------------------------

  /*
    Feedback:
    Value: 1 -> Like the video
    Value: 0 -> Dislike the video
  */
  function addFeedback(value, videoId) {
    $.ajax({
      method: 'POST',
      url: '/video/analytics',
      data: {
        videoId: videoId,
        value: value,
        key: 'feedback'
      }
    }).done(function (resp) {
      if (!resp.status) {
        console.error(JSON.stringify(resp.errMessage));
      }
    }).fail(function (jqXHR, textStatus) {
      console.error(textStatus);
    });
  }

  function addView(videoId) {
    $.ajax({
      method: 'POST',
      url: '/video/analytics',
      data: {
        videoId: videoId,
        value: 1,
        key: 'view'
      }
    }).done(function (resp) {
      if (!resp.status) {
        console.error(JSON.stringify(resp.errMessage));
      }
    }).fail(function (jqXHR, textStatus) {
      console.error(textStatus);
    });
  }

  // Triggers every 'VIEW_TIMER_INTERVAL' when video is playing
  function addViewDuration(videoId) {
    $.ajax({
      method: 'POST',
      url: '/video/analytics',
      data: {
        videoId: videoId,
        value: VIEW_TIMER_INTERVAL,
        key: 'viewDuration'
      }
    }).done(function (resp) {
      if (!resp.status) {
        console.error(JSON.stringify(resp.errMessage));
      }
    }).fail(function (jqXHR, textStatus) {
      console.error(textStatus);
    });
  }

  function addSkippedVideo(videoId, callback) {
    $.ajax({
      method: 'POST',
      url: '/video/analytics',
      timeout: 700, // This codepath potentially blocks exercise, so we have to have a reasonable timeout here to avoid bad user-experience
      data: {
        videoId: videoId,
        value: 1,
        key: 'skip'
      }
    }).done(function (resp) {
      if (!resp.status) {
        console.error(JSON.stringify(resp.errMessage));
      }
      callback();
    }).fail(function (jqXHR, textStatus) {
      console.error(textStatus);
      callback();
    });
  }
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../libs/logger":1}]},{},[2]);
