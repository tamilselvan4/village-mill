/**
 * VILLAGE MILL — Cart Management (js/cart.js)
 */

document.addEventListener('DOMContentLoaded', () => {
  const cartContainer = document.getElementById('cart-items-list');
  const subtotalEl = document.getElementById('cart-subtotal');
  const totalEl = document.getElementById('cart-total');
  const checkoutBtn = document.getElementById('btn-checkout');
  const cartAlert = document.getElementById('cart-alert');

  function showAlert(msg) {
    if (!cartAlert) return;
    cartAlert.textContent = msg;
    cartAlert.className = 'ecom-alert ecom-alert-error';
    cartAlert.classList.remove('hidden');
  }

  async function loadCart() {
    if (!isLoggedIn()) {
      if (cartContainer) {
        cartContainer.innerHTML = `
          <div style="text-align: center; padding: 3rem 1rem;">
            <p class="ecom-subtitle" style="margin-bottom: 1.5rem;">Please log in to view your cart items.</p>
            <a href="login.html?redirect=cart.html" class="btn-primary"><span>Login / Register</span></a>
          </div>
        `;
      }
      return;
    }

    if (!cartContainer) return;
    cartContainer.innerHTML = '<p class="ecom-subtitle">Loading your cart...</p>';

    try {
      const response = await api.get('/api/cart');
      
      let items = [];
      let subtotal = 0;
      let total = 0;

      if (response) {
        if (Array.isArray(response.items)) {
          items = response.items;
          subtotal = response.subtotal || response.totalAmount || 0;
          total = response.total || response.totalAmount || subtotal;
        } else if (Array.isArray(response)) {
          items = response;
        }
      }

      if (!items.length) {
        cartContainer.innerHTML = `
          <div style="text-align: center; padding: 3rem 1rem;">
            <p class="ecom-subtitle" style="margin-bottom: 1.5rem;">Your cart is currently empty.</p>
            <a href="index.html#our-oils" class="btn-primary"><span>Explore Our Oils</span></a>
          </div>
        `;
        if (subtotalEl) subtotalEl.textContent = '₹0';
        if (totalEl) totalEl.textContent = '₹0';
        if (checkoutBtn) checkoutBtn.disabled = true;
        updateCartBadge();
        return;
      }

      // Calculate totals if backend returns items list without subtotal
      if (!subtotal) {
        subtotal = items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
        total = subtotal;
      }

      cartContainer.innerHTML = items.map(item => {
        const pId = item.productId || item.id;
        const name = item.productName || item.name || 'Cold Pressed Oil';
        const price = item.price || 0;
        const qty = item.quantity || 1;
        const itemTotal = price * qty;
        const img = item.imageUrl || 'village-mill-logo.png';

        return `
          <div class="cart-item-row" data-id="${pId}">
            <img src="${img}" alt="${escapeHtml(name)}" class="cart-img-thumb" onError="this.src='village-mill-logo.png'" />
            <div>
              <h4 class="cart-item-title">${escapeHtml(name)}</h4>
              <span class="cart-item-price">₹${price}</span>
            </div>
            <div class="cart-item-price">₹${price}</div>
            <div class="qty-control">
              <button type="button" class="qty-btn btn-qty-dec" data-id="${pId}" data-qty="${qty}">-</button>
              <span class="qty-val">${qty}</span>
              <button type="button" class="qty-btn btn-qty-inc" data-id="${pId}" data-qty="${qty}">+</button>
            </div>
            <button type="button" class="btn-ghost btn-remove-item" data-id="${pId}" style="border: none; color: #ff8888; font-size: 1.2rem; cursor: pointer;">
              ✕
            </button>
          </div>
        `;
      }).join('');

      if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toLocaleString('en-IN')}`;
      if (totalEl) totalEl.textContent = `₹${total.toLocaleString('en-IN')}`;
      if (checkoutBtn) checkoutBtn.disabled = false;

      attachCartEvents();
      updateCartBadge();
    } catch (err) {
      showAlert(err.message || 'Failed to load cart.');
      cartContainer.innerHTML = `<p style="color: #ff8888;">${err.message}</p>`;
    }
  }

  function attachCartEvents() {
    // Quantity decrease
    document.querySelectorAll('.btn-qty-dec').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
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
        const id = e.currentTarget.dataset.id;
        const currentQty = parseInt(e.currentTarget.dataset.qty, 10);
        updateQuantity(id, currentQty + 1);
      });
    });

    // Remove item
    document.querySelectorAll('.btn-remove-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        removeItem(id);
      });
    });
  }

  async function updateQuantity(productId, newQty) {
    try {
      await api.put(`/api/cart/items/${productId}?quantity=${newQty}`);
      showToast('Cart updated', 'success');
      loadCart();
    } catch (err) {
      showAlert(err.message || 'Failed to update quantity.');
    }
  }

  async function removeItem(productId) {
    try {
      await api.delete(`/api/cart/items/${productId}`);
      showToast('Item removed from cart', 'info');
      loadCart();
    } catch (err) {
      showAlert(err.message || 'Failed to remove item.');
    }
  }

  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      window.location.href = 'checkout.html';
    });
  }

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  loadCart();
});
