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

function saveSession(data) {
  if (!data) throw new Error("Invalid server authentication response.");
  const token = data.token || data.jwt || data.accessToken;
  if (!token) throw new Error("No authentication token received from server.");
  
  const user = {
    id: data.userId || data.id || (data.user && (data.user.id || data.user.userId)),
    name: data.name || (data.user && data.user.name) || (data.email ? data.email.split('@')[0] : 'User'),
    email: data.email || (data.user && data.user.email) || '',
    phone: data.phone || (data.user && data.user.phone) || '',
    role: data.role || (data.user && data.user.role) || 'CUSTOMER'
  };

  localStorage.setItem("vm_token", token);
  localStorage.setItem("vm_user", JSON.stringify(user));
  return { token, user };
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

/* Product Metadata Map */
const PRODUCT_MAP = {
  1: { id: 1, name: 'Groundnut Oil 500ml', price: 220, size: '500 ml', group: 'Groundnut Oil' },
  2: { id: 2, name: 'Groundnut Oil 1L', price: 420, size: '1 L', group: 'Groundnut Oil' },
  3: { id: 3, name: 'Sesame Oil 500ml', price: 280, size: '500 ml', group: 'Sesame Oil' },
  4: { id: 4, name: 'Sesame Oil 1L', price: 540, size: '1 L', group: 'Sesame Oil' },
  5: { id: 5, name: 'Coconut Oil 500ml', price: 240, size: '500 ml', group: 'Coconut Oil' },
  6: { id: 6, name: 'Coconut Oil 1L', price: 460, size: '1 L', group: 'Coconut Oil' }
};

/* Guest Local Storage Cart Helpers */
function getGuestCart() {
  try {
    const raw = localStorage.getItem("vm_guest_cart");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function setGuestCart(cartItems) {
  localStorage.setItem("vm_guest_cart", JSON.stringify(cartItems));
}

function clearGuestCart() {
  localStorage.removeItem("vm_guest_cart");
}

async function syncGuestCart() {
  if (!isLoggedIn()) return;
  const guestItems = getGuestCart();
  if (!guestItems.length) return;

  for (const item of guestItems) {
    try {
      await api.post('/api/cart/items', { productId: item.productId, quantity: item.quantity });
    } catch (e) {
      // Ignore individual sync errors
    }
  }
  clearGuestCart();
  updateCartBadge();
}

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
  const stickyCart = document.getElementById('mobile-sticky-cart');
  const stickyCount = stickyCart?.querySelector('.sticky-cart-count');
  const stickyTotal = stickyCart?.querySelector('.sticky-cart-total');

  let items = [];
  let count = 0;
  let total = 0;

  if (isLoggedIn()) {
    try {
      const response = await api.get('/api/cart');
      if (response) {
        if (Array.isArray(response.items)) {
          items = response.items;
        } else if (Array.isArray(response)) {
          items = response;
        }
      }
    } catch (e) {
      // Fallback
    }
  } else {
    const guestCart = getGuestCart();
    items = guestCart.map(i => ({
      productId: i.productId,
      quantity: i.quantity,
      price: i.price || (PRODUCT_MAP[i.productId] ? PRODUCT_MAP[i.productId].price : 0)
    }));
  }

  count = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  total = items.reduce((sum, item) => sum + ((item.price || (PRODUCT_MAP[item.productId] ? PRODUCT_MAP[item.productId].price : 0)) * (item.quantity || 1)), 0);

  if (badgeEls.length) {
    badgeEls.forEach(el => el.textContent = count);
  }

  if (stickyCart) {
    if (count > 0) {
      stickyCart.classList.remove('hidden');
      if (stickyCount) stickyCount.textContent = `${count} ${count === 1 ? 'item' : 'items'}`;
      if (stickyTotal) stickyTotal.textContent = `₹${total.toLocaleString('en-IN')}`;
    } else {
      stickyCart.classList.add('hidden');
    }
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

  syncGuestCart();
  updateCartBadge();
}

/* Global Product Purchase & Size Selector Interceptor */
document.addEventListener('click', async (e) => {
  // 1. Size Chip Switcher
  const sizeChip = e.target.closest('.size-chip');
  if (sizeChip) {
    const parentBox = sizeChip.closest('.product-purchase-box');
    if (parentBox) {
      parentBox.querySelectorAll('.size-chip').forEach(c => c.classList.remove('active'));
      sizeChip.classList.add('active');

      const addBtn = parentBox.querySelector('.btn-add-to-cart');
      if (addBtn) {
        addBtn.dataset.activeProductId = sizeChip.dataset.productId;
      }
    }
    return;
  }

  // 2. Card Quantity Incrementor / Decrementor
  const qtyIncBtn = e.target.closest('.btn-card-qty-inc');
  const qtyDecBtn = e.target.closest('.btn-card-qty-dec');
  if (qtyIncBtn || qtyDecBtn) {
    const parentRow = (qtyIncBtn || qtyDecBtn).closest('.card-action-row');
    if (parentRow) {
      const valEl = parentRow.querySelector('.card-qty-val');
      if (valEl) {
        let currentVal = parseInt(valEl.textContent, 10) || 1;
        if (qtyIncBtn) currentVal += 1;
        if (qtyDecBtn && currentVal > 1) currentVal -= 1;
        valEl.textContent = currentVal;
      }
    }
    return;
  }

  // 3. Add to Cart Button Click
  const btn = e.target.closest('.btn-add-to-cart, .order-now-btn, [data-add-cart-id]');
  if (btn) {
    e.preventDefault();
    e.stopPropagation();

    const parentBox = btn.closest('.product-purchase-box');
    const activeChip = parentBox ? parentBox.querySelector('.size-chip.active') : null;
    const qtyValEl = parentBox ? parentBox.querySelector('.card-qty-val') : null;

    const productId = Number(btn.dataset.activeProductId || (activeChip ? activeChip.dataset.productId : (btn.dataset.addCartId || btn.dataset.productId || 1)));
    const quantity = qtyValEl ? parseInt(qtyValEl.textContent, 10) || 1 : 1;
    const meta = PRODUCT_MAP[productId] || { name: 'Cold Pressed Oil', price: 220, size: '500 ml' };

    btn.disabled = true;

    try {
      if (isLoggedIn()) {
        await api.post('/api/cart/items', { productId: productId, quantity: quantity });
      } else {
        const guestCart = getGuestCart();
        const existingIndex = guestCart.findIndex(item => item.productId === productId);
        if (existingIndex > -1) {
          guestCart[existingIndex].quantity += quantity;
        } else {
          guestCart.push({
            productId: productId,
            quantity: quantity,
            name: meta.name,
            price: meta.price,
            size: meta.size
          });
        }
        setGuestCart(guestCart);
      }

      showToast(`✓ Added ${quantity} × ${meta.name} to cart!`, 'success');
      updateCartBadge();
    } catch (err) {
      showToast(err.message || 'Failed to add item to cart.', 'error');
    } finally {
      btn.disabled = false;
    }
  }
});

document.addEventListener('DOMContentLoaded', initHeaderNav);

