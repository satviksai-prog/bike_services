/**
 * ==========================================================================
 * HERORIDE — FIREBASE AUTHENTICATION ENGINE
 * Email/Password Sign-Up, Login & Email Verification Gate
 * ==========================================================================
 */

'use strict';

// ---------------------------------------------------------------------------
// 1. Firebase Initialisation
// ---------------------------------------------------------------------------
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
  reload
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const firebaseConfig = {
  apiKey:            "AIzaSyAKQznO9VfxvD7lyJSUWfGPQk0TMw-fBpw",
  authDomain:        "bike-service-592b0.firebaseapp.com",
  projectId:         "bike-service-592b0",
  storageBucket:     "bike-service-592b0.firebasestorage.app",
  messagingSenderId: "775699763611",
  appId:             "1:775699763611:web:f54246d84d5a27b92a513e",
  measurementId:     "G-X0MKVBZSX7"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ---------------------------------------------------------------------------
// 2. DOM Helpers
// ---------------------------------------------------------------------------
const $  = (id) => document.getElementById(id);
const show = (el) => { if (el) el.style.display = ''; };
const hide = (el) => { if (el) el.style.display = 'none'; };

// ---------------------------------------------------------------------------
// 3. Panel Switcher
// ---------------------------------------------------------------------------
const AuthUI = {
  overlay:      null,
  loginPanel:   null,
  signupPanel:  null,
  verifyPanel:  null,
  dashboard:    null,
  userBadge:    null,
  userEmailEl:  null,
  errorEls:     {},
  verifyInterval: null,

  init() {
    this.overlay     = $('auth-overlay');
    this.loginPanel  = $('auth-login-panel');
    this.signupPanel = $('auth-signup-panel');
    this.verifyPanel = $('auth-verify-panel');
    this.dashboard   = document.querySelector('.dashboard-wrapper');
    this.userBadge   = $('auth-user-badge');
    this.userEmailEl = $('auth-user-email');
    this.errorEls    = {
      login:  $('auth-login-error'),
      signup: $('auth-signup-error'),
    };

    this._bindEvents();
    this._watchAuth();
  },

  // --- Auth State Watcher ---
  _watchAuth() {
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        this._showOverlay('login');
      } else if (!user.emailVerified) {
        this._showOverlay('verify');
        this._pollVerification(user);
      } else {
        this._showDashboard(user);
      }
    });
  },

  // --- Show auth overlay with a given panel ---
  _showOverlay(panel) {
    show(this.overlay);
    hide(this.dashboard);
    if (this.userBadge) hide(this.userBadge);
    document.body.style.overflow = 'hidden';

    hide(this.loginPanel);
    hide(this.signupPanel);
    hide(this.verifyPanel);

    if (panel === 'login')  show(this.loginPanel);
    if (panel === 'signup') show(this.signupPanel);
    if (panel === 'verify') show(this.verifyPanel);

    this._clearErrors();
  },

  // --- Show dashboard after successful auth ---
  _showDashboard(user) {
    hide(this.overlay);
    show(this.dashboard);
    document.body.style.overflow = '';
    this._stopPollVerification();

    if (this.userBadge) {
      show(this.userBadge);
      if (this.userEmailEl) {
        this.userEmailEl.textContent = user.email;
      }
    }
  },

  // --- Poll until email is verified ---
  _pollVerification(user) {
    this._stopPollVerification();
    this.verifyInterval = setInterval(async () => {
      try {
        await reload(user);
        if (auth.currentUser && auth.currentUser.emailVerified) {
          this._stopPollVerification();
          this._showDashboard(auth.currentUser);
        }
      } catch (e) { /* ignore network hiccups */ }
    }, 5000);
  },

  _stopPollVerification() {
    if (this.verifyInterval) {
      clearInterval(this.verifyInterval);
      this.verifyInterval = null;
    }
  },

  // --- Error display ---
  _showError(panel, msg) {
    const el = this.errorEls[panel];
    if (el) { el.textContent = msg; show(el); }
  },

  _clearErrors() {
    Object.values(this.errorEls).forEach(el => { if (el) { el.textContent = ''; hide(el); } });
  },

  // --- Friendly Firebase error messages ---
  _friendlyError(code) {
    const map = {
      'auth/user-not-found':       'No account found with this email.',
      'auth/wrong-password':       'Incorrect password. Please try again.',
      'auth/invalid-credential':   'Invalid email or password.',
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/weak-password':        'Password must be at least 6 characters.',
      'auth/invalid-email':        'Please enter a valid email address.',
      'auth/too-many-requests':    'Too many attempts. Please wait a moment.',
      'auth/network-request-failed': 'Network error. Check your connection.',
    };
    return map[code] || 'Something went wrong. Please try again.';
  },

  // ---------------------------------------------------------------------------
  // 4. Event Bindings
  // ---------------------------------------------------------------------------
  _bindEvents() {
    // --- Login form ---
    const loginForm = $('auth-login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        this._clearErrors();
        const email    = $('auth-login-email').value.trim();
        const password = $('auth-login-password').value;
        const btn      = $('auth-login-btn');

        btn.disabled = true;
        btn.textContent = 'Signing in…';

        try {
          const cred = await signInWithEmailAndPassword(auth, email, password);
          if (!cred.user.emailVerified) {
            this._showOverlay('verify');
            this._pollVerification(cred.user);
          }
          // onAuthStateChanged will handle verified user → dashboard
        } catch (err) {
          this._showError('login', this._friendlyError(err.code));
        } finally {
          btn.disabled = false;
          btn.textContent = 'Sign In';
        }
      });
    }

    // Switch to sign-up
    const toSignup = $('auth-to-signup');
    if (toSignup) toSignup.addEventListener('click', () => this._showOverlay('signup'));

    // --- Sign-up form ---
    const signupForm = $('auth-signup-form');
    if (signupForm) {
      signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        this._clearErrors();
        const email    = $('auth-signup-email').value.trim();
        const password = $('auth-signup-password').value;
        const confirm  = $('auth-signup-confirm').value;
        const btn      = $('auth-signup-btn');

        if (password !== confirm) {
          this._showError('signup', 'Passwords do not match.');
          return;
        }

        btn.disabled = true;
        btn.textContent = 'Creating account…';

        try {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          await sendEmailVerification(cred.user);
          this._showOverlay('verify');
          this._pollVerification(cred.user);
        } catch (err) {
          this._showError('signup', this._friendlyError(err.code));
        } finally {
          btn.disabled = false;
          btn.textContent = 'Create Account';
        }
      });
    }

    // Switch back to login
    const toLogin = $('auth-to-login');
    if (toLogin) toLogin.addEventListener('click', () => this._showOverlay('login'));

    // --- Verify screen: Resend ---
    const resendBtn = $('auth-resend-btn');
    if (resendBtn) {
      resendBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (user) {
          try {
            await sendEmailVerification(user);
            resendBtn.textContent = '✓ Sent!';
            setTimeout(() => { resendBtn.textContent = 'Resend Email'; }, 3000);
          } catch (err) {
            alert('Could not resend. Please wait a moment and try again.');
          }
        }
      });
    }

    // --- Verify screen: Wrong account / Logout ---
    const verifyLogout = $('auth-verify-logout');
    if (verifyLogout) {
      verifyLogout.addEventListener('click', async () => {
        this._stopPollVerification();
        await signOut(auth);
        this._showOverlay('login');
      });
    }

    // --- Navbar: Logout button ---
    const logoutBtn = $('auth-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        this._stopPollVerification();
        await signOut(auth);
      });
    }
  }
};

// ---------------------------------------------------------------------------
// 5. Boot
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => AuthUI.init());
