function requireCsrf(request, response, next) {
  if (!request.session.csrfToken || !request.body || request.body._csrf !== request.session.csrfToken) {
    if (request.path === '/admin/login' || request.path === '/administrator-login' || request.path === '/student/login' || request.path === '/student-login' || request.path === '/admin/register' || request.path === '/student/register' || request.path === '/student/reports') {
      const loginPath = request.path === '/administrator-login' ? '/administrator-login' : request.path === '/student-login' ? '/student-login' : request.path;
      return response.redirect(`${loginPath}?error=expired`);
    }

    return response.status(403).render('error', { message: 'This form has expired. Please go back and try again.' });
  }

  return next();
}

function requireAuth(request, response, next) {
  if (!request.session.user) {
    return response.redirect('/');
  }

  return next();
}

function requireRole(role) {
  return (request, response, next) => {
    if (!request.session.user || request.session.user.role !== role) {
      return response.status(403).render('error', { message: 'You do not have permission to access this page.' });
    }

    return next();
  };
}

module.exports = { requireAuth, requireRole, requireCsrf };
