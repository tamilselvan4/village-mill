/**
 * VILLAGE MILL — Central API Helper (js/api.js)
 */

const API_BASE_URL = "http://localhost:8080";

function getToken() {
  return localStorage.getItem("vm_token");
}

function getUser() {
  const user = localStorage.getItem("vm_user");
  try {
    return user ? JSON.parse(user) : null;
  } catch (e) {
    return null;
  }
}

function isLoggedIn() {
  return !!getToken();
}

function logoutUser() {
  localStorage.removeItem("vm_token");
  localStorage.removeItem("vm_user");
  window.location.href = "index.html";
}

async function apiRequest(endpoint, options = {}) {
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    if (response.status === 401) {
      localStorage.removeItem("vm_token");
      localStorage.removeItem("vm_user");
      if (!window.location.pathname.endsWith("login.html") && !window.location.pathname.endsWith("register.html")) {
        window.location.href = "login.html";
      }
      throw new Error("Please login again.");
    }

    if (response.status === 403) {
      throw new Error("You don't have permission to access this resource.");
    }

    const contentType = response.headers.get("content-type");
    const data = contentType && contentType.includes("application/json")
      ? await response.json()
      : null;

    if (!response.ok) {
      const errorMsg = data?.message || data?.error || (response.status === 404 ? "Item or endpoint not found." : "Something went wrong. Please try again.");
      throw new Error(errorMsg);
    }

    return data;
  } catch (err) {
    if (err.name === "TypeError" || err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
      throw new Error("Unable to connect to server. Please ensure the Spring Boot backend is running at " + API_BASE_URL);
    }
    throw err;
  }
}

const api = {
  get: (endpoint) => apiRequest(endpoint, { method: "GET" }),
  post: (endpoint, body) => apiRequest(endpoint, { method: "POST", body: JSON.stringify(body) }),
  put: (endpoint, body) => apiRequest(endpoint, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  delete: (endpoint) => apiRequest(endpoint, { method: "DELETE" })
};

/* Toast Notification Utility */
function showToast(message, type = 'info') {
  let toast = document.getElementById('vm-global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'vm-global-toast';
    toast.className = 'vm-toast';
    document.body.appendChild(toast);
  }
  
  const icon = type === 'error' ? '⚠️' : type === 'success' ? '✦' : '🌿';
  toast.innerHTML = `<span class="vm-toast-icon">${icon}</span><span>${message}</span>`;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

/* Header Navigation & Cart Badge Sync */
async function updateCartBadge() {
  const badgeEls = document.querySelectorAll('.nav-cart-badge-count');
  if (!badgeEls.length) return;

  if (!isLoggedIn()) {
    badgeEls.forEach(el => el.textContent = '0');
    return;
  }

  try {
    const cart = await api.get('/api/cart');
    let count = 0;
    if (cart) {
      if (Array.isArray(cart.items)) {
        count = cart.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
      } else if (Array.isArray(cart)) {
        count = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
      } else if (typeof cart.totalItems === 'number') {
        count = cart.totalItems;
      }
    }
    badgeEls.forEach(el => el.textContent = count);
  } catch (e) {
    // Silent catch for badge fetch error
  }
}

function initHeaderNav() {
  const user = getUser();
  const accountNavContainers = document.querySelectorAll('.nav-account-slot');

  accountNavContainers.forEach(container => {
    if (!user) {
      container.innerHTML = `<a href="login.html" class="nav-account-btn">👤 Account</a>`;
    } else {
      const isAdmin = user.role === 'ADMIN';
      const adminLink = isAdmin ? `<li><a href="admin.html">Admin</a></li>` : '';
      container.innerHTML = `
        <div class="nav-user-dropdown">
          <a href="profile.html" class="nav-account-btn">👤 Hi, ${user.name ? user.name.split(' ')[0] : 'User'}</a>
          <div class="nav-user-menu">
            ${adminLink}
            <a href="profile.html">My Profile</a>
            <a href="orders.html">My Orders</a>
            <a href="track-order.html">Track Order</a>
            <button type="button" id="btn-header-logout">Logout</button>
          </div>
        </div>
      `;
    }
  });

  document.addEventListener('click', (e) => {
    if (e.target && (e.target.id === 'btn-header-logout' || e.target.closest('#btn-header-logout'))) {
      logoutUser();
    }
  });

  updateCartBadge();
}

/* Global Product Add-To-Cart Click Interceptor */
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.order-now-btn, [data-add-cart-id]');
  if (btn) {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn()) {
      showToast('Please log in to add items to your cart.', 'info');
      setTimeout(() => {
        window.location.href = 'login.html?redirect=cart.html';
      }, 800);
      return;
    }

    const productId = Number(btn.dataset.addCartId || btn.dataset.productId || 1);

    try {
      btn.disabled = true;
      await api.post('/api/cart/items', { productId: productId, quantity: 1 });
      showToast('Added to cart!', 'success');
      updateCartBadge();
    } catch (err) {
      showToast(err.message || 'Failed to add item to cart.', 'error');
    } finally {
      btn.disabled = false;
    }
  }
});

document.addEventListener('DOMContentLoaded', initHeaderNav);
