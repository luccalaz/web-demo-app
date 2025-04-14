// Authentication middleware (very basic with no proper logging)
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
}

module.exports = { isAuthenticated };