/**
 * VILLAGE MILL — Authentication JavaScript (js/auth.js)
 */

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const alertBox = document.getElementById('auth-alert');

  function showAlert(msg, isSuccess = false) {
    if (!alertBox) return;
    alertBox.textContent = msg;
    alertBox.className = `ecom-alert ${isSuccess ? 'ecom-alert-success' : 'ecom-alert-error'}`;
    alertBox.classList.remove('hidden');
  }

  function hideAlert() {
    if (alertBox) alertBox.classList.add('hidden');
  }

  // LOGIN FORM
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert();

      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Logging in...</span>';

      try {
        const res = await api.post('/api/auth/login', { email, password });
        
        const token = res.token || res.jwt || res.accessToken;
        const user = res.user || { name: res.name || email.split('@')[0], email: email, role: res.role || 'CUSTOMER' };

        if (!token) {
          throw new Error('No authentication token received from server.');
        }

        localStorage.setItem('vm_token', token);
        localStorage.setItem('vm_user', JSON.stringify(user));

        showToast('Login successful! Welcome back.', 'success');

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

  // REGISTER FORM
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert();

      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const phone = document.getElementById('reg-phone').value.trim();
      const password = document.getElementById('reg-password').value;
      const confirmPassword = document.getElementById('reg-confirm-password').value;

      if (password !== confirmPassword) {
        showAlert('Passwords do not match.');
        return;
      }

      const submitBtn = registerForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Creating Account...</span>';

      try {
        await api.post('/api/auth/register', { name, email, phone, password });
        
        showAlert('Account created successfully! Redirecting to login...', true);
        showToast('Registration successful! Please login.', 'success');

        setTimeout(() => {
          window.location.href = 'login.html';
        }, 1200);
      } catch (err) {
        showAlert(err.message || 'Registration failed. Please try again.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }
});
