'use strict';

const adminState = {
  supabase: null,
  session: null,
  orders: [],
};

const $ = (selector, root = document) => root.querySelector(selector);
const money = amount => `Rs. ${Number(amount || 0).toLocaleString('en-IN')}`;

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.add('hidden'), 3200);
}

function authHeaders() {
  return adminState.session?.access_token
    ? { Authorization: `Bearer ${adminState.session.access_token}` }
    : {};
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Request failed');
  }

  return payload;
}

async function loadConfig() {
  const config = await api('/api/config');
  if (config.supabaseUrl && config.supabaseAnonKey && window.supabase) {
    adminState.supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    const { data } = await adminState.supabase.auth.getSession();
    adminState.session = data.session;
    adminState.supabase.auth.onAuthStateChange((_event, session) => {
      adminState.session = session;
      renderAuth();
      loadOrders();
    });
  }
}

function renderAuth() {
  const button = $('#admin-auth-button');
  if (!button) return;

  if (adminState.session?.user) {
    button.textContent = 'Sign out';
    button.onclick = async () => adminState.supabase.auth.signOut();
    return;
  }

  button.textContent = 'Sign in with Google';
  button.onclick = async () => {
    if (!adminState.supabase) {
      showToast('Add Supabase environment variables before login.');
      return;
    }
    await adminState.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/admin.html` },
    });
  };
}

function renderOrders() {
  const wrap = $('#admin-orders');
  if (!wrap) return;

  if (!adminState.session) {
    wrap.innerHTML = '<p class="fine-print">Sign in as an admin to manage orders.</p>';
    return;
  }

  if (!adminState.orders.length) {
    wrap.innerHTML = '<p class="fine-print">No orders found.</p>';
    return;
  }

  wrap.innerHTML = adminState.orders.map(order => `
    <article class="order-card">
      <div class="admin-order-top">
        <div>
          <strong>Order ${String(order.id).slice(0, 8)}</strong>
          <p>${order.customer?.full_name || 'Customer'} · ${order.customer?.phone || ''}</p>
          <p>${order.customer?.address || ''} ${order.customer?.pincode || ''}</p>
        </div>
        <span class="status-pill">${order.status}</span>
      </div>
      <div class="admin-order-items">
        ${order.items.map(item => `${item.name} ${item.size || ''} x ${item.quantity}`).join('<br>')}
      </div>
      <p><strong>${money(order.total_inr)}</strong> · Payment ${order.payment_status}</p>
      <div class="admin-actions">
        ${['placed', 'paid', 'shipped', 'delivered'].map(status => `
          <button class="btn btn-line" type="button" data-order="${order.id}" data-status="${status}">
            ${status}
          </button>
        `).join('')}
      </div>
    </article>
  `).join('');

  wrap.querySelectorAll('[data-order]').forEach(button => {
    button.addEventListener('click', () => updateOrderStatus(button.dataset.order, button.dataset.status));
  });
}

async function loadOrders() {
  if (!adminState.session) {
    adminState.orders = [];
    renderOrders();
    return;
  }

  try {
    const payload = await api('/api/orders');
    adminState.orders = payload.orders || [];
  } catch (error) {
    adminState.orders = [];
    showToast(error.message);
  }
  renderOrders();
}

async function updateOrderStatus(id, status) {
  try {
    await api('/api/orders', {
      method: 'PATCH',
      body: JSON.stringify({ id, status }),
    });
    showToast('Order updated');
    await loadOrders();
  } catch (error) {
    showToast(error.message);
  }
}

function bindProductForm() {
  $('#product-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    body.price_inr = Number(body.price_inr);
    body.stock = Number(body.stock);

    try {
      await api('/api/products', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      form.reset();
      showToast('Product added');
    } catch (error) {
      showToast(error.message);
    }
  });
}

async function init() {
  bindProductForm();
  await loadConfig().catch(error => showToast(error.message));
  renderAuth();
  await loadOrders();
}

init();
