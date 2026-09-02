'use strict';

const FALLBACK_PRODUCTS = [
  {
    id: 1,
    name: 'Groundnut Oil',
    slug: 'groundnut-oil',
    size: '1 L',
    description: 'Aromatic cold pressed groundnut oil for everyday Indian cooking.',
    price_inr: 399,
    image_label: 'Groundnut',
    stock: 50,
  },
  {
    id: 2,
    name: 'Coconut Oil',
    slug: 'coconut-oil',
    size: '1 L',
    description: 'Fresh coconut oil for cooking, hair care, and traditional home use.',
    price_inr: 449,
    image_label: 'Coconut',
    stock: 40,
  },
  {
    id: 3,
    name: 'Sesame Oil',
    slug: 'sesame-oil',
    size: '1 L',
    description: 'Nutty sesame oil pressed slowly from quality seeds.',
    price_inr: 499,
    image_label: 'Sesame',
    stock: 40,
  },
];

const state = {
  config: null,
  supabase: null,
  session: null,
  products: [],
  cart: [],
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

function getCartKey() {
  return `vm_cart_${state.session?.user?.id || 'guest'}`;
}

function authHeaders() {
  return state.session?.access_token
    ? { Authorization: `Bearer ${state.session.access_token}` }
    : {};
}

async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...authHeaders(),
    ...(options.headers || {}),
  };
  const response = await fetch(path, { ...options, headers });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Request failed');
  }

  return payload;
}

async function loadConfig() {
  state.config = await api('/api/config');

  if (state.config.supabaseUrl && state.config.supabaseAnonKey && window.supabase) {
    state.supabase = window.supabase.createClient(
      state.config.supabaseUrl,
      state.config.supabaseAnonKey
    );
    const { data } = await state.supabase.auth.getSession();
    state.session = data.session;
    state.supabase.auth.onAuthStateChange((_event, session) => {
      state.session = session;
      afterAuthChange();
    });
  }
}

function renderAuth() {
  const button = $('#auth-button');
  if (!button) return;

  if (state.session?.user) {
    button.textContent = 'Sign out';
    button.onclick = async () => {
      await state.supabase.auth.signOut();
      showToast('Signed out');
    };
    return;
  }

  button.textContent = 'Sign in with Google';
  button.onclick = async () => {
    if (!state.supabase) {
      showToast('Add Supabase environment variables before login.');
      return;
    }
    await state.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  };
}

function renderProducts() {
  const grid = $('#product-grid');
  if (!grid) return;

  grid.innerHTML = state.products.map(product => `
    <article class="product-card">
      <div class="product-art">${product.image_label || product.name}</div>
      <div>
        <h3>${product.name}</h3>
        <p>${product.description || ''}</p>
      </div>
      <div class="price-row">
        <span>${product.size || '1 L'}</span>
        <strong>${money(product.price_inr)}</strong>
      </div>
      <button class="btn btn-primary" type="button" data-add-product="${product.id}">Add to cart</button>
    </article>
  `).join('');

  grid.querySelectorAll('[data-add-product]').forEach(button => {
    button.addEventListener('click', () => addToCart(Number(button.dataset.addProduct)));
  });
}

function productById(id) {
  return state.products.find(product => Number(product.id) === Number(id));
}

function cartTotal() {
  return state.cart.reduce((total, item) => {
    const product = productById(item.product_id);
    return total + (product ? product.price_inr * item.quantity : 0);
  }, 0);
}

function renderCart() {
  const wrap = $('#cart-items');
  const total = $('#cart-total');
  if (!wrap || !total) return;

  if (!state.cart.length) {
    wrap.innerHTML = '<p class="fine-print">Your cart is empty.</p>';
  } else {
    wrap.innerHTML = state.cart.map(item => {
      const product = productById(item.product_id);
      if (!product) return '';

      return `
        <div class="cart-row">
          <div>
            <strong>${product.name}</strong>
            <p class="fine-print">${product.size || '1 L'} · ${money(product.price_inr)}</p>
          </div>
          <div class="quantity">
            <button type="button" data-cart-change="${product.id}" data-delta="-1">-</button>
            <input value="${item.quantity}" inputmode="numeric" aria-label="${product.name} quantity" readonly />
            <button type="button" data-cart-change="${product.id}" data-delta="1">+</button>
          </div>
        </div>
      `;
    }).join('');
  }

  total.textContent = money(cartTotal());
  wrap.querySelectorAll('[data-cart-change]').forEach(button => {
    button.addEventListener('click', () => {
      changeCart(Number(button.dataset.cartChange), Number(button.dataset.delta));
    });
  });
}

async function persistCart() {
  localStorage.setItem(getCartKey(), JSON.stringify(state.cart));
  if (state.session) {
    await api('/api/cart', {
      method: 'PUT',
      body: JSON.stringify({ items: state.cart }),
    });
  }
}

async function addToCart(productId) {
  const existing = state.cart.find(item => Number(item.product_id) === Number(productId));
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({ product_id: productId, quantity: 1 });
  }
  renderCart();
  await persistCart().catch(error => showToast(error.message));
  showToast('Added to cart');
}

async function changeCart(productId, delta) {
  state.cart = state.cart
    .map(item => Number(item.product_id) === Number(productId)
      ? { ...item, quantity: Math.max(0, item.quantity + delta) }
      : item)
    .filter(item => item.quantity > 0);

  renderCart();
  await persistCart().catch(error => showToast(error.message));
}

async function loadProducts() {
  try {
    const payload = await api('/api/products');
    state.products = payload.products?.length ? payload.products : FALLBACK_PRODUCTS;
  } catch (error) {
    state.products = FALLBACK_PRODUCTS;
    showToast('Using sample products until Supabase is connected.');
  }
  renderProducts();
}

async function loadCart() {
  if (!state.session) {
    state.cart = JSON.parse(localStorage.getItem(getCartKey()) || '[]');
    renderCart();
    return;
  }

  try {
    const payload = await api('/api/cart');
    const localCart = JSON.parse(localStorage.getItem('vm_cart_guest') || '[]');
    state.cart = payload.cart?.items?.length ? payload.cart.items : localCart;
    await persistCart();
  } catch (error) {
    state.cart = JSON.parse(localStorage.getItem(getCartKey()) || '[]');
  }
  renderCart();
}

async function loadProfile() {
  const form = $('#profile-form');
  if (!form || !state.session) return;

  try {
    const payload = await api('/api/profile');
    $('#profile-name').value = payload.profile?.full_name || state.session.user.user_metadata?.full_name || '';
    $('#profile-phone').value = payload.profile?.phone || '';
    $('#profile-address').value = payload.profile?.address || '';
    $('#profile-pincode').value = payload.profile?.pincode || '';
  } catch (error) {
    showToast(error.message);
  }
}

async function saveProfile() {
  const body = {
    full_name: $('#profile-name').value.trim(),
    phone: $('#profile-phone').value.trim(),
    address: $('#profile-address').value.trim(),
    pincode: $('#profile-pincode').value.trim(),
  };

  if (!body.full_name || !body.phone || !body.address || !body.pincode) {
    throw new Error('Please fill all profile details.');
  }

  await api('/api/profile', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

function orderSteps(status) {
  const steps = ['placed', 'paid', 'shipped', 'delivered'];
  const activeIndex = Math.max(0, steps.indexOf(status));
  return steps.map((step, index) => `
    <span class="${index <= activeIndex ? 'active' : ''}">${step}</span>
  `).join('');
}

function renderOrders() {
  const wrap = $('#orders-list');
  if (!wrap) return;

  if (!state.session) {
    wrap.innerHTML = '<p class="fine-print">Sign in to see your orders.</p>';
    return;
  }

  if (!state.orders.length) {
    wrap.innerHTML = '<p class="fine-print">No orders yet.</p>';
    return;
  }

  wrap.innerHTML = state.orders.map(order => `
    <article class="order-card">
      <div class="order-top">
        <div>
          <strong>Order ${String(order.id).slice(0, 8)}</strong>
          <p>${new Date(order.created_at).toLocaleString()}</p>
        </div>
        <span class="status-pill">${order.status}</span>
      </div>
      <p>${order.items.map(item => `${item.name} x ${item.quantity}`).join(', ')}</p>
      <strong>${money(order.total_inr)}</strong>
      <div class="track">${orderSteps(order.status)}</div>
    </article>
  `).join('');
}

async function loadOrders() {
  if (!state.session) {
    state.orders = [];
    renderOrders();
    return;
  }

  try {
    const payload = await api('/api/orders');
    state.orders = payload.orders || [];
  } catch (error) {
    showToast(error.message);
  }
  renderOrders();
}

async function checkout() {
  if (!state.session) {
    showToast('Please sign in with Google before checkout.');
    return;
  }
  if (!state.cart.length) {
    showToast('Add at least one oil to cart.');
    return;
  }

  try {
    await saveProfile();
    await persistCart();

    const customer = {
      full_name: $('#profile-name').value.trim(),
      phone: $('#profile-phone').value.trim(),
      address: $('#profile-address').value.trim(),
      pincode: $('#profile-pincode').value.trim(),
      email: state.session.user.email,
    };

    const payload = await api('/api/orders', {
      method: 'POST',
      body: JSON.stringify({ items: state.cart, customer }),
    });

    if (!window.Razorpay || !payload.razorpayOrder?.id || !payload.razorpayKeyId) {
      throw new Error('Razorpay is not configured yet.');
    }

    const checkoutOptions = {
      key: payload.razorpayKeyId,
      amount: payload.razorpayOrder.amount,
      currency: payload.razorpayOrder.currency,
      name: 'The Village Mill',
      description: 'Cold pressed oils',
      order_id: payload.razorpayOrder.id,
      prefill: {
        name: customer.full_name,
        email: customer.email,
        contact: customer.phone,
      },
      theme: { color: '#a66a28' },
      handler: async response => {
        await api('/api/payments/verify', {
          method: 'POST',
          body: JSON.stringify(response),
        });
        state.cart = [];
        await persistCart();
        renderCart();
        await loadOrders();
        showToast('Payment verified. Order placed.');
      },
    };

    new window.Razorpay(checkoutOptions).open();
  } catch (error) {
    showToast(error.message);
  }
}

function bindForms() {
  $('#profile-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    if (!state.session) {
      showToast('Please sign in before saving profile.');
      return;
    }
    try {
      await saveProfile();
      showToast('Profile saved');
    } catch (error) {
      showToast(error.message);
    }
  });

  $('#checkout-button')?.addEventListener('click', checkout);
}

async function afterAuthChange() {
  renderAuth();
  await Promise.all([loadCart(), loadProfile(), loadOrders()]);
}

async function init() {
  bindForms();
  await loadConfig().catch(error => showToast(error.message));
  renderAuth();
  await loadProducts();
  await afterAuthChange();
}

init();
