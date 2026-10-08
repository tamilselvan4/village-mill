/**
 * VILLAGE MILL — Cart Management (js/cart.js)
 */

document.addEventListener('DOMContentLoaded', () => {
  const cartContainer = document.getElementById('cart-items-list');
  const subtotalEl = document.getElementById('cart-subtotal');
  const shippingEl = document.getElementById('cart-shipping');
  const totalEl = document.getElementById('cart-total');
  const checkoutBtn = document.getElementById('btn-checkout');
  const cartAlert = document.getElementById('cart-alert');

  const DELIVERY_CHARGE = 45;

  function showAlert(msg) {
    if (!cartAlert) return;
    cartAlert.textContent = msg;
    cartAlert.className = 'ecom-alert ecom-alert-error';
    cartAlert.classList.remove('hidden');
  }

  async function loadCart() {
    if (!cartContainer) return;
    cartContainer.innerHTML = '<p class="ecom-subtitle">Loading your cart...</p>';

    let items = [];
    let subtotal = 0;

    if (isLoggedIn()) {
      try {
        const response = await api.get('/api/cart');
        if (response) {
          if (Array.isArray(response.items)) {
            items = response.items;
            subtotal = response.subtotal || response.totalAmount || 0;
          } else if (Array.isArray(response)) {
            items = response;
          }
        }
      } catch (err) {
        showAlert(err.message || 'Failed to load cart from server.');
      }
    } else {
      const guestItems = getGuestCart();
      items = guestItems.map(i => ({
        productId: i.productId,
        productName: i.name || (PRODUCT_MAP[i.productId] ? PRODUCT_MAP[i.productId].name : 'Cold Pressed Oil'),
        price: i.price || (PRODUCT_MAP[i.productId] ? PRODUCT_MAP[i.productId].price : 0),
        quantity: i.quantity || 1
      }));
    }

    if (!items.length) {
      cartContainer.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem;">
          <p class="ecom-subtitle" style="margin-bottom: 1.5rem;">Your cart is currently empty.</p>
          <a href="index.html#our-oils" class="btn-primary"><span>Explore Our Oils</span></a>
        </div>
      `;
      if (subtotalEl) subtotalEl.textContent = '₹0';
      if (shippingEl) shippingEl.textContent = '₹0';
      if (totalEl) totalEl.textContent = '₹0';
      if (checkoutBtn) checkoutBtn.disabled = true;
      updateCartBadge();
      return;
    }

    if (!subtotal) {
      subtotal = items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
    }

    const total = subtotal + DELIVERY_CHARGE;

    cartContainer.innerHTML = items.map(item => {
      const pId = item.productId || item.id;
      const meta = PRODUCT_MAP[pId] || {};
      const name = item.productName || item.name || meta.name || 'Cold Pressed Oil';
      const price = item.price || meta.price || 0;
      const qty = item.quantity || 1;
      const itemTotal = price * qty;
      const img = item.imageUrl || 'village-mill-logo.png';

      return `
        <div class="cart-item-row" data-id="${pId}">
          <img src="${img}" alt="${escapeHtml(name)}" class="cart-img-thumb" onError="this.src='village-mill-logo.png'" />
          <div>
            <h4 class="cart-item-title">${escapeHtml(name)}</h4>
            <span style="display: block; font-size: 0.8rem; color: var(--gold); margin-top: 2px;">₹${price} / bottle</span>
          </div>
          <div class="cart-item-price">₹${itemTotal.toLocaleString('en-IN')}</div>
          <div class="qty-control">
            <button type="button" class="qty-btn btn-qty-dec" data-id="${pId}" data-qty="${qty}">-</button>
            <span class="qty-val">${qty}</span>
            <button type="button" class="qty-btn btn-qty-inc" data-id="${pId}" data-qty="${qty}">+</button>
          </div>
          <button type="button" class="btn-ghost btn-remove-item" data-id="${pId}" style="border: none; color: #ff8888; font-size: 1.2rem; cursor: pointer;" aria-label="Remove item">
            ✕
          </button>
        </div>
      `;
    }).join('');

    if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toLocaleString('en-IN')}`;
    if (shippingEl) shippingEl.textContent = `₹${DELIVERY_CHARGE}`;
    if (totalEl) totalEl.textContent = `₹${total.toLocaleString('en-IN')}`;
    if (checkoutBtn) checkoutBtn.disabled = false;

    attachCartEvents();
    updateCartBadge();
  }

  function attachCartEvents() {
    // Quantity decrease
    document.querySelectorAll('.btn-qty-dec').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = Number(e.currentTarget.dataset.id);
        const currentQty = parseInt(e.currentTarget.dataset.qty, 10);
        if (currentQty <= 1) {
          removeItem(id);
        } else {
          updateQuantity(id, currentQty - 1);
        }
      });
    });

    // Quantity increase
    document.querySelectorAll('.btn-qty-inc').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = Number(e.currentTarget.dataset.id);
        const currentQty = parseInt(e.currentTarget.dataset.qty, 10);
        updateQuantity(id, currentQty + 1);
      });
    });

    // Remove item
    document.querySelectorAll('.btn-remove-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = Number(e.currentTarget.dataset.id);
        removeItem(id);
      });
    });
  }

  async function updateQuantity(productId, newQty) {
    if (isLoggedIn()) {
      try {
        await api.put(`/api/cart/items/${productId}?quantity=${newQty}`);
        showToast('Cart updated', 'success');
        loadCart();
      } catch (err) {
        showAlert(err.message || 'Failed to update quantity.');
      }
    } else {
      const guestCart = getGuestCart();
      const idx = guestCart.findIndex(i => i.productId === productId);
      if (idx > -1) {
        guestCart[idx].quantity = newQty;
        setGuestCart(guestCart);
        showToast('Cart updated', 'success');
        loadCart();
      }
    }
  }

  async function removeItem(productId) {
    if (isLoggedIn()) {
      try {
        await api.delete(`/api/cart/items/${productId}`);
        showToast('Item removed from cart', 'info');
        loadCart();
      } catch (err) {
        showAlert(err.message || 'Failed to remove item.');
      }
    } else {
      let guestCart = getGuestCart();
      guestCart = guestCart.filter(i => i.productId !== productId);
      setGuestCart(guestCart);
      showToast('Item removed from cart', 'info');
      loadCart();
    }
  }

  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (!isLoggedIn()) {
        showToast('Please log in or register to complete your order.', 'info');
        setTimeout(() => {
          window.location.href = 'login.html?redirect=checkout.html';
        }, 800);
      } else {
        window.location.href = 'checkout.html';
      }
    });
  }

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  loadCart();
});

