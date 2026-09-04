/**
 * VILLAGE MILL — Admin Dashboard Management (js/admin.js)
 */

document.addEventListener('DOMContentLoaded', () => {
  const user = getUser();

  if (!isLoggedIn() || !user || user.role !== 'ADMIN') {
    showToast('Admin authorization required.', 'error');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1200);
    return;
  }

  const tabBtns = document.querySelectorAll('.admin-tab-btn');
  const tabPanes = document.querySelectorAll('.admin-tab-pane');
  const alertBox = document.getElementById('admin-alert');

  function showAlert(msg, isSuccess = false) {
    if (!alertBox) return;
    alertBox.textContent = msg;
    alertBox.className = `ecom-alert ${isSuccess ? 'ecom-alert-success' : 'ecom-alert-error'}`;
    alertBox.classList.remove('hidden');
    setTimeout(() => alertBox.classList.add('hidden'), 4000);
  }

  // TAB SWITCHING
  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetTab = e.currentTarget.dataset.tab;
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.add('hidden'));

      e.currentTarget.classList.add('active');
      document.getElementById(`tab-${targetTab}`).classList.remove('hidden');

      if (targetTab === 'customers') loadCustomers();
      else if (targetTab === 'orders') loadAdminOrders();
      else if (targetTab === 'products') loadAdminProducts();
    });
  });

  // 1. CUSTOMERS MANAGEMENT
  async function loadCustomers() {
    const container = document.getElementById('admin-customers-container');
    if (!container) return;
    container.innerHTML = '<p class="ecom-subtitle">Loading customers...</p>';

    try {
      const customers = await api.get('/api/admin/customers');

      if (!customers || !customers.length) {
        container.innerHTML = '<p style="color: var(--text-muted);">No customers registered yet.</p>';
        return;
      }

      container.innerHTML = `
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Joined Date</th>
              </tr>
            </thead>
            <tbody>
              ${customers.map(c => `
                <tr>
                  <td style="color: var(--gold); font-weight: 500;">${escapeHtml(c.name || 'N/A')}</td>
                  <td>${escapeHtml(c.email || 'N/A')}</td>
                  <td>${escapeHtml(c.phone || 'N/A')}</td>
                  <td style="color: var(--cream-dim);">${c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<p style="color: #ff8888;">${err.message || 'Failed to load customers.'}</p>`;
    }
  }

  // 2. ORDERS MANAGEMENT
  async function loadAdminOrders() {
    const container = document.getElementById('admin-orders-container');
    if (!container) return;
    container.innerHTML = '<p class="ecom-subtitle">Loading all orders...</p>';

    try {
      const orders = await api.get('/api/admin/orders');

      if (!orders || !orders.length) {
        container.innerHTML = '<p style="color: var(--text-muted);">No orders placed yet.</p>';
        return;
      }

      const statusOptions = ['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

      container.innerHTML = `
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map(o => {
                const orderNum = o.orderNumber || o.id;
                const currentStatus = o.status || 'PROCESSING';

                return `
                  <tr>
                    <td style="color: var(--gold); font-weight: 600;">
                      <a href="order-details.html?order=${encodeURIComponent(orderNum)}" style="text-decoration: underline;">#${escapeHtml(orderNum)}</a>
                    </td>
                    <td>
                      <div>${escapeHtml(o.customerName || o.shipping?.name || 'Customer')}</div>
                      <small style="color: var(--text-muted);">${escapeHtml(o.customerPhone || o.shipping?.phone || '')}</small>
                    </td>
                    <td style="color: var(--cream); font-weight: bold;">₹${(o.totalAmount || o.total || 0).toLocaleString('en-IN')}</td>
                    <td>
                      <span class="status-badge ${o.paymentStatus === 'PAID' ? 'badge-paid' : 'badge-pending'}">
                        ${escapeHtml(o.paymentStatus || 'PAID')}
                      </span>
                    </td>
                    <td style="color: var(--cream-dim); font-size: 0.8rem;">
                      ${o.createdAt || o.orderDate ? new Date(o.createdAt || o.orderDate).toLocaleDateString('en-IN') : 'N/A'}
                    </td>
                    <td>
                      <select class="ecom-select order-status-select" data-order="${escapeHtml(orderNum)}" style="padding: 0.4rem 0.6rem; font-size: 0.8rem; width: auto;">
                        ${statusOptions.map(st => `
                          <option value="${st}" ${st === currentStatus ? 'selected' : ''}>${st.replace('_', ' ')}</option>
                        `).join('')}
                      </select>
                    </td>
                    <td>
                      <button type="button" class="btn-primary btn-update-status" data-order="${escapeHtml(orderNum)}" style="padding: 0.4rem 0.8rem; font-size: 0.7rem;">
                        <span>Save</span>
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;

      // Status update event handlers
      document.querySelectorAll('.btn-update-status').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const orderNum = e.currentTarget.dataset.order;
          const select = document.querySelector(`.order-status-select[data-order="${orderNum}"]`);
          const newStatus = select ? select.value : '';

          if (!newStatus) return;

          e.currentTarget.disabled = true;
          e.currentTarget.innerHTML = '<span>Saving...</span>';

          try {
            await api.put(`/api/admin/orders/${encodeURIComponent(orderNum)}/status`, {
              status: newStatus,
              note: `Status updated by Admin to ${newStatus}`
            });

            showAlert(`Order #${orderNum} status updated to ${newStatus}!`, true);
            showToast('Order status updated!', 'success');
            loadAdminOrders();
          } catch (err) {
            showAlert(err.message || 'Failed to update order status.');
            e.currentTarget.disabled = false;
            e.currentTarget.innerHTML = '<span>Save</span>';
          }
        });
      });

    } catch (err) {
      container.innerHTML = `<p style="color: #ff8888;">${err.message || 'Failed to load orders.'}</p>`;
    }
  }

  // 3. PRODUCTS MANAGEMENT
  async function loadAdminProducts() {
    const container = document.getElementById('admin-products-container');
    if (!container) return;
    container.innerHTML = '<p class="ecom-subtitle">Loading catalog products...</p>';

    try {
      const products = await api.get('/api/admin/products');

      if (!products || !products.length) {
        container.innerHTML = '<p style="color: var(--text-muted);">No products found in catalog.</p>';
        return;
      }

      container.innerHTML = `
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${products.map(p => `
                <tr>
                  <td>
                    <img src="${p.imageUrl || 'village-mill-logo.png'}" alt="${escapeHtml(p.name)}" style="width: 45px; height: 45px; object-fit: cover; border-radius: 4px;" onError="this.src='village-mill-logo.png'" />
                  </td>
                  <td style="color: var(--gold); font-weight: 500;">${escapeHtml(p.name)}</td>
                  <td>₹${p.price}</td>
                  <td>${p.stock} units</td>
                  <td>
                    <span class="status-badge ${p.active !== false ? 'badge-paid' : 'badge-cancelled'}">
                      ${p.active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button type="button" class="btn-ghost btn-edit-product" data-id="${p.id}" data-name="${escapeHtml(p.name)}" data-price="${p.price}" data-stock="${p.stock}" data-desc="${escapeHtml(p.description || '')}" data-img="${escapeHtml(p.imageUrl || '')}" data-active="${p.active !== false}" style="padding: 0.35rem 0.7rem; font-size: 0.7rem;">
                      Edit
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      // Attach edit handler
      document.querySelectorAll('.btn-edit-product').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const ds = e.currentTarget.dataset;
          document.getElementById('edit-prod-id').value = ds.id;
          document.getElementById('edit-prod-name').value = ds.name;
          document.getElementById('edit-prod-price').value = ds.price;
          document.getElementById('edit-prod-stock').value = ds.stock;
          document.getElementById('edit-prod-desc').value = ds.desc;
          document.getElementById('edit-prod-img').value = ds.img;
          document.getElementById('edit-prod-active').checked = ds.active === 'true';

          document.getElementById('product-edit-modal').classList.remove('hidden');
        });
      });

    } catch (err) {
      container.innerHTML = `<p style="color: #ff8888;">${err.message || 'Failed to load products.'}</p>`;
    }
  }

  // PRODUCT EDIT FORM SUBMISSION
  const prodForm = document.getElementById('admin-product-form');
  if (prodForm) {
    prodForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = document.getElementById('edit-prod-id').value;
      const name = document.getElementById('edit-prod-name').value.trim();
      const price = parseFloat(document.getElementById('edit-prod-price').value);
      const stock = parseInt(document.getElementById('edit-prod-stock').value, 10);
      const description = document.getElementById('edit-prod-desc').value.trim();
      const imageUrl = document.getElementById('edit-prod-img').value.trim();
      const active = document.getElementById('edit-prod-active').checked;

      const submitBtn = prodForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;

      try {
        if (id) {
          await api.put(`/api/admin/products/${id}`, { name, price, stock, description, imageUrl, active });
          showAlert('Product updated successfully!', true);
          showToast('Product details saved!', 'success');
        } else {
          await api.post('/api/admin/products', { name, price, stock, description, imageUrl, active });
          showAlert('New product added successfully!', true);
          showToast('Product added!', 'success');
        }

        document.getElementById('product-edit-modal').classList.add('hidden');
        loadAdminProducts();
      } catch (err) {
        showAlert(err.message || 'Failed to save product.');
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  const cancelProdBtn = document.getElementById('btn-cancel-edit-prod');
  if (cancelProdBtn) {
    cancelProdBtn.addEventListener('click', () => {
      document.getElementById('product-edit-modal').classList.add('hidden');
    });
  }

  const addProdBtn = document.getElementById('btn-add-new-product');
  if (addProdBtn) {
    addProdBtn.addEventListener('click', () => {
      if (prodForm) prodForm.reset();
      document.getElementById('edit-prod-id').value = '';
      document.getElementById('edit-prod-active').checked = true;
      document.getElementById('product-edit-modal').classList.remove('hidden');
    });
  }

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Load default tab
  loadCustomers();
});
