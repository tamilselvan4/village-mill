/**
 * VILLAGE MILL — Customer Orders List (js/orders.js)
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!isLoggedIn()) {
    window.location.href = 'login.html?redirect=orders.html';
    return;
  }

  const ordersContainer = document.getElementById('orders-list-container');
  const alertBox = document.getElementById('orders-alert');

  function showAlert(msg) {
    if (!alertBox) return;
    alertBox.textContent = msg;
    alertBox.className = 'ecom-alert ecom-alert-error';
    alertBox.classList.remove('hidden');
  }

  async function loadOrders() {
    if (!ordersContainer) return;
    ordersContainer.innerHTML = '<p class="ecom-subtitle">Loading your orders...</p>';

    try {
      const orders = await api.get('/api/orders');

      if (!orders || !orders.length) {
        ordersContainer.innerHTML = `
          <div style="text-align: center; padding: 3rem 1rem;">
            <p class="ecom-subtitle" style="margin-bottom: 1.5rem;">You haven't placed any orders yet.</p>
            <a href="index.html#our-oils" class="btn-primary"><span>Start Shopping</span></a>
          </div>
        `;
        return;
      }

      ordersContainer.innerHTML = orders.map(order => {
        const orderNum = order.orderNumber || order.id || 'N/A';
        const dateStr = order.createdAt || order.orderDate ? new Date(order.createdAt || order.orderDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent';
        const itemCount = order.itemsCount || order.items?.length || 1;
        const total = order.totalAmount || order.total || 0;
        const payStatus = (order.paymentStatus || 'PAID').toUpperCase();
        const orderStatus = (order.status || 'PROCESSING').toUpperCase();

        const statusBadgeClass = orderStatus === 'DELIVERED' ? 'badge-delivered' :
                                 orderStatus === 'SHIPPED' ? 'badge-shipped' :
                                 orderStatus === 'CANCELLED' ? 'badge-cancelled' : 'badge-processing';

        const payBadgeClass = payStatus === 'PAID' ? 'badge-paid' : 'badge-pending';

        return `
          <div class="ecom-card order-card">
            <div class="order-card-header">
              <div>
                <strong style="color: var(--gold); font-family: var(--ff-serif); font-size: 1.2rem; display: block;">Order #${escapeHtml(orderNum)}</strong>
                <span style="color: var(--cream-dim); font-size: 0.8rem;">Placed on ${dateStr} • ${itemCount} ${itemCount === 1 ? 'item' : 'items'}</span>
              </div>
              <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <span class="status-badge ${payBadgeClass}">${payStatus}</span>
                <span class="status-badge ${statusBadgeClass}">${orderStatus.replace('_', ' ')}</span>
              </div>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-top: 1rem;">
              <div>
                <span style="color: var(--text-muted); font-size: 0.8rem; display: block;">Total Amount</span>
                <strong style="color: var(--cream); font-size: 1.25rem;">₹${total.toLocaleString('en-IN')}</strong>
              </div>
              <div style="display: flex; gap: 0.75rem;">
                <a href="order-details.html?order=${encodeURIComponent(orderNum)}" class="btn-ghost" style="padding: 0.5rem 1rem; font-size: 0.75rem;">
                  View Order
                </a>
                <a href="track-order.html?order=${encodeURIComponent(orderNum)}" class="btn-primary" style="padding: 0.5rem 1rem; font-size: 0.75rem;">
                  <span>Track Order</span>
                </a>
              </div>
            </div>
          </div>
        `;
      }).join('');

    } catch (err) {
      showAlert(err.message || 'Failed to load orders.');
      ordersContainer.innerHTML = `<p style="color: #ff8888;">${err.message}</p>`;
    }
  }

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  loadOrders();
});
