(function (global) {
  var AUTH_KEY = 'suplymate_auth';
  var USER_KEY = 'suplymate_user';
  var USERS_KEY = 'suplymate_users';

  var DEMO = {
    email: 'demo@suplymate.com',
    password: 'demo123',
    name: 'Karim Alaoui',
    initials: 'KA',
    plan: 'Plan Pro · CasaSteel'
  };

  function initialsFromName(name) {
    var parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length >= 2) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return '??';
  }

  function getRegisteredUsers() {
    try {
      var list = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function saveRegisteredUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function findRegisteredUser(email) {
    var e = (email || '').trim().toLowerCase();
    var users = getRegisteredUsers();
    for (var i = 0; i < users.length; i++) {
      if (users[i].email === e) return users[i];
    }
    return null;
  }

  function setSession(user) {
    sessionStorage.setItem(AUTH_KEY, 'true');
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function isAuthenticated() {
    return sessionStorage.getItem(AUTH_KEY) === 'true';
  }

  function getUser() {
    try {
      return JSON.parse(sessionStorage.getItem(USER_KEY) || 'null');
    } catch (e) {
      return null;
    }
  }

  function login(email, password) {
    var e = (email || '').trim().toLowerCase();
    var p = password || '';

    if (e === DEMO.email && p === DEMO.password) {
      setSession({
        name: DEMO.name,
        email: e,
        initials: DEMO.initials,
        plan: DEMO.plan
      });
      return { ok: true };
    }

    var registered = findRegisteredUser(e);
    if (registered && registered.password === p) {
      setSession({
        name: registered.name,
        email: registered.email,
        initials: registered.initials,
        plan: registered.plan || 'Plan Essai · 14 jours'
      });
      return { ok: true };
    }

    return { ok: false, message: 'E-mail ou mot de passe incorrect.' };
  }

  function signup(name, email, password, confirmPassword, company) {
    var n = (name || '').trim();
    var e = (email || '').trim().toLowerCase();
    var p = password || '';
    var c = confirmPassword || '';

    if (!n) {
      return { ok: false, message: 'Veuillez indiquer votre nom.' };
    }
    if (!e || e.indexOf('@') === -1) {
      return { ok: false, message: 'Veuillez entrer une adresse e-mail valide.' };
    }
    if (p.length < 6) {
      return { ok: false, message: 'Le mot de passe doit contenir au moins 6 caractères.' };
    }
    if (p !== c) {
      return { ok: false, message: 'Les mots de passe ne correspondent pas.' };
    }
    if (e === DEMO.email) {
      return { ok: false, message: 'Cette adresse e-mail est déjà utilisée.' };
    }
    if (findRegisteredUser(e)) {
      return { ok: false, message: 'Un compte existe déjà avec cette adresse e-mail.' };
    }

    var users = getRegisteredUsers();
    users.push({
      name: n,
      email: e,
      password: p,
      company: (company || '').trim(),
      initials: initialsFromName(n),
      plan: 'Plan Essai · 14 jours'
    });
    saveRegisteredUsers(users);

    setSession({
      name: n,
      email: e,
      initials: initialsFromName(n),
      plan: 'Plan Essai · 14 jours'
    });

    return { ok: true };
  }

  function requestPasswordReset(email) {
    var e = (email || '').trim().toLowerCase();
    if (!e || e.indexOf('@') === -1) {
      return { ok: false, message: 'Veuillez entrer une adresse e-mail valide.' };
    }

    var exists = e === DEMO.email || !!findRegisteredUser(e);
    if (!exists) {
      return {
        ok: true,
        message:
          'Si un compte est associé à cette adresse, vous recevrez un lien de réinitialisation (démo).'
      };
    }

    return {
      ok: true,
      message:
        'Un e-mail de réinitialisation a été envoyé (démo). Vérifiez votre boîte de réception.'
    };
  }

  function logout() {
    sessionStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(USER_KEY);
    window.location.href = 'login.html';
  }

  function requireAuth() {
    if (!isAuthenticated()) {
      var path = window.location.pathname.split('/').pop() || 'dashboard.html';
      var qs = window.location.search;
      var redirect = path + (qs || '');
      window.location.replace(
        'login.html?redirect=' + encodeURIComponent(redirect)
      );
    }
  }

  function goToLogin(redirect) {
    var url = 'login.html';
    if (redirect) {
      url += '?redirect=' + encodeURIComponent(redirect);
    }
    window.location.href = url;
  }

  function authPageUrl(page, extraQuery) {
    var params = new URLSearchParams(window.location.search);
    var redirect = params.get('redirect');
    var url = page;
    var qs = [];
    if (redirect) qs.push('redirect=' + encodeURIComponent(redirect));
    if (extraQuery) qs.push(extraQuery);
    if (qs.length) url += '?' + qs.join('&');
    return url;
  }

  function getRedirectTarget() {
    var params = new URLSearchParams(window.location.search);
    var target = params.get('redirect') || 'dashboard.html';
    var blocked = ['login.html', 'signup.html', 'forgot-password.html'];
    for (var i = 0; i < blocked.length; i++) {
      if (target.indexOf(blocked[i]) !== -1) return 'dashboard.html';
    }
    return target;
  }

  function applyUserToDashboard() {
    var user = getUser();
    if (!user) return;
    var avatar = document.querySelector('.user-avatar');
    var nameEl = document.querySelector('.user-name');
    var planEl = document.querySelector('.user-plan');
    if (avatar && user.initials) avatar.textContent = user.initials;
    if (nameEl && user.name) nameEl.textContent = user.name;
    if (planEl && user.plan) planEl.textContent = user.plan;
  }

  global.SuplymateAuth = {
    isAuthenticated: isAuthenticated,
    getUser: getUser,
    login: login,
    signup: signup,
    requestPasswordReset: requestPasswordReset,
    logout: logout,
    requireAuth: requireAuth,
    goToLogin: goToLogin,
    authPageUrl: authPageUrl,
    getRedirectTarget: getRedirectTarget,
    applyUserToDashboard: applyUserToDashboard,
    DEMO_EMAIL: DEMO.email,
    DEMO_PASSWORD: DEMO.password
  };
})(window);
