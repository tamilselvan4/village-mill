/**
 * VILLAGE MILL — Authentication JavaScript (js/auth.js)
 * Supports Email/Password Login, Google OAuth Sign-In, and Free OTP Login.
 */

// Global Google OAuth Credential Handler
async function handleGoogleCredentialResponse(googleResponse) {
  const alertBox = document.getElementById('auth-alert');
  function showAlert(msg) {
    if (!alertBox) return;
    alertBox.textContent = msg;
    alertBox.className = 'ecom-alert ecom-alert-error';
    alertBox.classList.remove('hidden');
  }

  try {
    const idToken = googleResponse.credential;
    if (!idToken) throw new Error("Google credential failed.");

    const res = await api.post('/api/auth/google', { idToken });
    const { user } = saveSession(res);

    showToast(`Welcome ${user.name || 'Back'}! Logged in with Google.`, 'success');

    const params = new URLSearchParams(window.location.search);
    const redirectUrl = params.get('redirect') || 'profile.html';
    setTimeout(() => {
      window.location.href = redirectUrl;
    }, 500);
  } catch (err) {
    showAlert(err.message || "Google Login failed. Please try again.");
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const otpForm = document.getElementById('otp-form');
  const registerForm = document.getElementById('register-form');
  const alertBox = document.getElementById('auth-alert');

  const tabBtnPassword = document.getElementById('tab-btn-password');
  const tabBtnOtp = document.getElementById('tab-btn-otp');

  const btnSendOtp = document.getElementById('btn-send-otp');
  const btnResendOtp = document.getElementById('btn-resend-otp');
  const btnCustomGoogle = document.getElementById('btn-custom-google');

  const otpSendSection = document.getElementById('otp-send-section');
  const otpVerifySection = document.getElementById('otp-verify-section');
  const otpDevHintContainer = document.getElementById('otp-dev-hint-container');

  function showAlert(msg, isSuccess = false) {
    if (!alertBox) return;
    alertBox.textContent = msg;
    alertBox.className = `ecom-alert ${isSuccess ? 'ecom-alert-success' : 'ecom-alert-error'}`;
    alertBox.classList.remove('hidden');
  }

  function hideAlert() {
    if (alertBox) alertBox.classList.add('hidden');
  }

  // ─── AUTH TABS (PASSWORD vs OTP) ─────────────────────────
  if (tabBtnPassword && tabBtnOtp) {
    tabBtnPassword.addEventListener('click', () => {
      tabBtnPassword.classList.add('active');
      tabBtnOtp.classList.remove('active');
      if (loginForm) loginForm.classList.remove('hidden');
      if (otpForm) otpForm.classList.add('hidden');
      hideAlert();
    });

    tabBtnOtp.addEventListener('click', () => {
      tabBtnOtp.classList.add('active');
      tabBtnPassword.classList.remove('active');
      if (otpForm) otpForm.classList.remove('hidden');
      if (loginForm) loginForm.classList.add('hidden');
      hideAlert();
    });
  }

  // ─── EMAIL / PASSWORD LOGIN FORM ─────────────────────────
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert();

      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      if (!email || !password) {
        showAlert('Please fill in both email and password.');
        return;
      }

      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Logging in...</span>';

      try {
        const res = await api.post('/api/auth/login', { email, password });
        const { user } = saveSession(res);

        showToast(`Login successful! Welcome ${user.name || ''}.`, 'success');

        const params = new URLSearchParams(window.location.search);
        const redirectUrl = params.get('redirect') || 'profile.html';
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 500);
      } catch (err) {
        showAlert(err.message || 'Invalid email or password.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }

  // ─── OTP SEND & VERIFY FLOW ──────────────────────────────
  async function triggerSendOtp() {
    hideAlert();
    const identifierInput = document.getElementById('otp-identifier');
    const identifier = identifierInput ? identifierInput.value.trim() : '';

    if (!identifier) {
      showAlert('Please enter your email or phone number.');
      return;
    }

    if (btnSendOtp) {
      btnSendOtp.disabled = true;
      btnSendOtp.innerHTML = '<span>Sending Code...</span>';
    }

    try {
      const isEmail = identifier.includes('@');
      const type = isEmail ? 'EMAIL' : 'PHONE';

      const res = await api.post('/api/auth/otp/send', { identifier, type });

      showAlert(`OTP code sent successfully to ${identifier}!`, true);
      showToast('OTP code sent!', 'info');

      if (otpVerifySection) otpVerifySection.classList.remove('hidden');

      if (res.devOtp && otpDevHintContainer) {
        otpDevHintContainer.textContent = `[Dev Test Code: ${res.devOtp}]`;
        otpDevHintContainer.className = 'otp-dev-hint';
        otpDevHintContainer.classList.remove('hidden');
      }

      if (identifierInput) identifierInput.disabled = true;
    } catch (err) {
      showAlert(err.message || 'Failed to send OTP code.');
    } finally {
      if (btnSendOtp) {
        btnSendOtp.disabled = false;
        btnSendOtp.innerHTML = '<span>Send OTP Code</span>';
      }
    }
  }

  if (btnSendOtp) {
    btnSendOtp.addEventListener('click', triggerSendOtp);
  }

  if (btnResendOtp) {
    btnResendOtp.addEventListener('click', triggerSendOtp);
  }

  if (otpForm) {
    otpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert();

      const identifier = document.getElementById('otp-identifier').value.trim();
      const otp = document.getElementById('otp-code').value.trim();
      const name = document.getElementById('otp-name') ? document.getElementById('otp-name').value.trim() : '';

      if (!otp || otp.length < 6) {
        showAlert('Please enter the 6-digit OTP code.');
        return;
      }

      const submitBtn = otpForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Verifying...</span>';

      try {
        const res = await api.post('/api/auth/otp/verify', { identifier, otp, name });
        const { user } = saveSession(res);

        showToast(`OTP verified! Welcome ${user.name || ''}.`, 'success');

        const params = new URLSearchParams(window.location.search);
        const redirectUrl = params.get('redirect') || 'profile.html';
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 500);
      } catch (err) {
        showAlert(err.message || 'Invalid or expired OTP code.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }

  // ─── GOOGLE SIGN-IN BUTTON TRIGGER ────────────────────────
  if (btnCustomGoogle) {
    btnCustomGoogle.addEventListener('click', () => {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        window.google.accounts.id.prompt();
      } else {
        const devMockToken = "mock_user_" + Date.now();
        handleGoogleCredentialResponse({ credential: devMockToken });
      }
    });
  }

  // ─── REGISTER FORM ────────────────────────────────────────
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert();

      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const phone = document.getElementById('reg-phone').value.trim();
      const password = document.getElementById('reg-password').value;
      const confirmPassword = document.getElementById('reg-confirm-password').value;

      if (!email || !password) {
        showAlert('Email and Password are required.');
        return;
      }

      if (password !== confirmPassword) {
        showAlert('Passwords do not match.');
        return;
      }

      if (password.length < 8) {
        showAlert('Password must be at least 8 characters long.');
        return;
      }

      const submitBtn = registerForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Creating Account...</span>';

      try {
        const res = await api.post('/api/auth/register', { name, email, phone, password, confirmPassword });
        saveSession(res);

        showAlert('Account created successfully! Redirecting to profile...', true);
        showToast('Registration successful! Welcome.', 'success');

        setTimeout(() => {
          window.location.href = 'profile.html';
        }, 800);
      } catch (err) {
        showAlert(err.message || 'Registration failed. Please try again.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }
});
