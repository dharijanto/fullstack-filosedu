class PassportHelper {
  // Adapted from Jared Hanson's connect-ensure-login
  // The difference is that this waits until session is saved before redirecting
  static ensureLoggedIn (options) {
    if (typeof options === 'string') {
      options = { redirectTo: options }
    }
    options = options || {}

    var url = options.redirectTo || '/login'
    var setReturnTo = (options.setReturnTo === undefined) ? true : options.setReturnTo

    return function (req, res, next) {
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        if (setReturnTo && req.session) {
          req.session.returnTo = req.originalUrl || req.url
          req.session.save(() => {
            res.redirect(url)
          })
        } else {
          return res.redirect(url)
        }
      } else {
        next()
      }
    }
  }

  static logOut () {
    return function (req, res, next) {
      req.session.returnTo = '/'
      req.logout()
      req.session.save(() => {
        res.redirect('/login')
      })
    }
  }
}

module.exports = PassportHelper
