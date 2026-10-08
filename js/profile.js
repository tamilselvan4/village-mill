/**
 * VILLAGE MILL — Profile & Address Management (js/profile.js)
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!isLoggedIn()) {
    window.location.href = 'login.html?redirect=profile.html';
    return;
  }

  const profileForm = document.getElementById('profile-form');
  const addressForm = document.getElementById('address-form');
  const addressListContainer = document.getElementById('saved-addresses-list');
  const alertBox = document.getElementById('profile-alert');

  function showAlert(msg, isSuccess = false) {
    if (!alertBox) return;
    alertBox.textContent = msg;
    alertBox.className = `ecom-alert ${isSuccess ? 'ecom-alert-success' : 'ecom-alert-error'}`;
    alertBox.classList.remove('hidden');
    setTimeout(() => alertBox.classList.add('hidden'), 4000);
  }

  // 1. LOAD PROFILE
  async function loadProfile() {
    try {
      const data = await api.get('/api/profile');
      if (data) {
        document.getElementById('profile-name').value = data.name || '';
        document.getElementById('profile-email').value = data.email || '';
        document.getElementById('profile-phone').value = data.phone || '';

        // Update local user reference
        const currentUser = getUser() || {};
        localStorage.setItem('vm_user', JSON.stringify({ ...currentUser, name: data.name, email: data.email, phone: data.phone }));
        initHeaderNav();
      }
    } catch (err) {
      showAlert(err.message || 'Failed to load profile details.');
    }
  }

  // SAVE PROFILE CHANGES
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('profile-name').value.trim();
      const phone = document.getElementById('profile-phone').value.trim();
      const submitBtn = profileForm.querySelector('button[type="submit"]');

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Saving...</span>';

      try {
        await api.put('/api/profile', { name, phone });
        showAlert('Profile updated successfully!', true);
        showToast('Profile updated!', 'success');

        const currentUser = getUser() || {};
        localStorage.setItem('vm_user', JSON.stringify({ ...currentUser, name, phone }));
        initHeaderNav();
      } catch (err) {
        showAlert(err.message || 'Failed to update profile.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Save Changes</span>';
      }
    });
  }

  // 2. LOAD SAVED ADDRESSES
  async function loadAddresses() {
    if (!addressListContainer) return;
    addressListContainer.innerHTML = '<p class="ecom-subtitle">Loading saved addresses...</p>';

    try {
      const addresses = await api.get('/api/profile/addresses');
      if (!addresses || !addresses.length) {
        addressListContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">No saved addresses yet.</p>';
        return;
      }

      addressListContainer.innerHTML = addresses.map(addr => `
        <div class="address-option-card" style="cursor: default; justify-content: space-between;">
          <div>
            <strong style="color: var(--gold); display: block; margin-bottom: 0.25rem;">${escapeHtml(addr.name)} (${escapeHtml(addr.phone)})</strong>
            <p style="color: var(--cream); font-size: 0.9rem; margin-bottom: 0.25rem;">${escapeHtml(addr.address)}</p>
            <p style="color: var(--cream-dim); font-size: 0.8rem;">${escapeHtml(addr.city)}, ${escapeHtml(addr.state)} - ${escapeHtml(addr.pincode)}</p>
          </div>
          <button type="button" class="btn-ghost btn-delete-address" data-id="${addr.id}" style="padding: 0.4rem 0.8rem; font-size: 0.7rem; border-color: rgba(220,60,60,0.5); color: #ff8888;">
            Delete
          </button>
        </div>
      `).join('');

      document.querySelectorAll('.btn-delete-address').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.currentTarget.dataset.id;
          if (confirm('Are you sure you want to delete this address?')) {
            try {
              await api.delete(`/api/profile/addresses/${id}`);
              showToast('Address deleted', 'info');
              loadAddresses();
            } catch (err) {
              showAlert(err.message || 'Failed to delete address.');
            }
          }
        });
      });
    } catch (err) {
      addressListContainer.innerHTML = '<p style="color: #ff8888; font-size: 0.9rem;">Failed to load addresses.</p>';
    }
  }

  // ADD ADDRESS FORM
  if (addressForm) {
    addressForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('addr-name').value.trim();
      const phone = document.getElementById('addr-phone').value.trim();
      const address = document.getElementById('addr-address').value.trim();
      const city = document.getElementById('addr-city').value.trim();
      const state = document.getElementById('addr-state').value.trim();
      const pincode = document.getElementById('addr-pincode').value.trim();

      const submitBtn = addressForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Adding...</span>';

      try {
        await api.post('/api/profile/addresses', { name, phone, address, city, state, pincode });
        showAlert('Address added successfully!', true);
        showToast('New address saved!', 'success');
        addressForm.reset();
        loadAddresses();
      } catch (err) {
        showAlert(err.message || 'Failed to add address.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Add Address</span>';
      }
    });
  }

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  loadProfile();
  loadAddresses();
});
