/**
 * VILLAGE MILL — Track Order JavaScript (js/track-order.js)
 */

document.addEventListener('DOMContentLoaded', () => {
  const trackForm = document.getElementById('track-order-form');
  const orderInput = document.getElementById('track-order-input');
  const resultContainer = document.getElementById('tracking-result-container');
  const alertBox = document.getElementById('track-alert');

  function showAlert(msg) {
    if (!alertBox) return;
    alertBox.textContent = msg;
    alertBox.className = 'ecom-alert ecom-alert-error';
    alertBox.classList.remove('hidden');
  }

  function hideAlert() {
    if (alertBox) alertBox.classList.add('hidden');
  }

  async function trackOrder(orderNumber) {
    if (!orderNumber) return;
    hideAlert();

    if (resultContainer) {
      resultContainer.innerHTML = '<p class="ecom-subtitle" style="text-align: center;">Fetching tracking details...</p>';
    }

    try {
      let trackingData = null;
      try {
        trackingData = await api.get(`/api/orders/${encodeURIComponent(orderNumber)}/tracking`);
      } catch (e) {
        // Fallback to main order endpoint if /tracking endpoint is not separately defined
        trackingData = await api.get(`/api/orders/${encodeURIComponent(orderNumber)}`);
      }

      if (!trackingData) {
        throw new Error('Order not found.');
      }

      renderTrackingTimeline(trackingData);
    } catch (err) {
      showAlert(err.message || 'Order not found. Please verify your order number.');
      if (resultContainer) resultContainer.innerHTML = '';
    }
  }

  function renderTrackingTimeline(data) {
    if (!resultContainer) return;

    const orderNum = data.orderNumber || data.id || orderInput.value.trim();
    const status = (data.status || 'PROCESSING').toUpperCase();
    const dateStr = data.createdAt || data.orderDate ? new Date(data.createdAt || data.orderDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    const note = data.note || data.courierInfo || '';

    // Step Status Map
    const steps = [
      { key: 'CREATED', label: 'Order Created' },
      { key: 'PAID', label: 'Payment Confirmed' },
      { key: 'PROCESSING', label: 'Processing' },
      { key: 'SHIPPED', label: 'Shipped' },
      { key: 'DELIVERED', label: 'Delivered' }
    ];

    let currentStepIndex = 1; // Default
    if (status === 'PENDING_PAYMENT') currentStepIndex = 0;
    else if (status === 'PAID') currentStepIndex = 1;
    else if (status === 'PROCESSING') currentStepIndex = 2;
    else if (status === 'SHIPPED') currentStepIndex = 3;
    else if (status === 'DELIVERED') currentStepIndex = 4;
    else if (status === 'CANCELLED') currentStepIndex = -1;

    let timelineHtml = '';

    if (status === 'CANCELLED') {
      timelineHtml = `
        <div class="ecom-alert ecom-alert-error" style="text-align: center; margin-top: 2rem;">
          <h4 style="font-family: var(--ff-serif); font-size: 1.2rem; margin-bottom: 0.5rem;">Order Cancelled</h4>
          <p>This order #${escapeHtml(orderNum)} has been cancelled.</p>
        </div>
      `;
    } else {
      timelineHtml = `
        <div class="tracking-timeline">
          ${steps.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isActive = idx === currentStepIndex;
            const stateClass = isCompleted ? 'completed' : isActive ? 'active' : '';
            const symbol = isCompleted ? '✓' : idx + 1;

            return `
              <div class="tracking-step ${stateClass}">
                <div class="step-circle">${symbol}</div>
                <div class="step-label">${step.label}</div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    resultContainer.innerHTML = `
      <div class="ecom-card" style="margin-top: 2rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(201,168,76,0.15); padding-bottom: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <h3 style="font-family: var(--ff-serif); color: var(--gold); font-size: 1.3rem;">Order #${escapeHtml(orderNum)}</h3>
            ${dateStr ? `<span style="color: var(--cream-dim); font-size: 0.8rem;">Placed on ${dateStr}</span>` : ''}
          </div>
          <span class="status-badge ${status === 'DELIVERED' ? 'badge-delivered' : 'badge-processing'}">
            ${status.replace('_', ' ')}
          </span>
        </div>

        ${timelineHtml}

        ${note ? `
          <div style="background: rgba(13,8,4,0.6); padding: 1rem; border-radius: 4px; margin-top: 1.5rem; border: 1px solid rgba(201,168,76,0.2);">
            <strong style="color: var(--gold); font-size: 0.85rem; display: block; margin-bottom: 0.25rem;">Courier & Dispatch Notes:</strong>
            <p style="color: var(--cream); font-size: 0.85rem;">${escapeHtml(note)}</p>
          </div>
        ` : ''}

        <div style="text-align: right; margin-top: 1.5rem;">
          <a href="order-details.html?order=${encodeURIComponent(orderNum)}" class="btn-ghost" style="font-size: 0.75rem; padding: 0.5rem 1rem;">
            Full Order Details
          </a>
        </div>
      </div>
    `;
  }

  // URL query param check
  const params = new URLSearchParams(window.location.search);
  const qOrder = params.get('order');
  if (qOrder) {
    if (orderInput) orderInput.value = qOrder;
    trackOrder(qOrder);
  }

  if (trackForm) {
    trackForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = orderInput.value.trim();
      if (!val) {
        showAlert('Please enter an order number.');
        return;
      }
      trackOrder(val);
    });
  }

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
});
