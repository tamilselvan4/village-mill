/**
 * VILLAGE MILL — Checkout & Razorpay Integration (js/checkout.js)
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!isLoggedIn()) {
    window.location.href = 'login.html?redirect=checkout.html';
    return;
  }

  const savedAddressesContainer = document.getElementById('saved-addresses-options');
  const summaryItemsContainer = document.getElementById('summary-items-list');
  const subtotalEl = document.getElementById('checkout-subtotal');
  const deliveryEl = document.getElementById('checkout-delivery');
  const totalEl = document.getElementById('checkout-total');
  const payBtn = document.getElementById('btn-pay-now');
  const alertBox = document.getElementById('checkout-alert');

  const DELIVERY_CHARGE = 45;

  let selectedAddress = null;
  let cartData = null;
  let calculatedSubtotal = 0;
  let calculatedTotal = 0;
  let isProcessingPayment = false;

  function showAlert(msg) {
    if (!alertBox) return;
    alertBox.textContent = msg;
    alertBox.className = 'ecom-alert ecom-alert-error';
    alertBox.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function hideAlert() {
    if (alertBox) alertBox.classList.add('hidden');
  }

  // 0. PREFILL USER PROFILE DATA
  function prefillUserData() {
    const user = getUser();
    if (!user) return;

    const nameEl = document.getElementById('ship-name');
    const phoneEl = document.getElementById('ship-phone');

    if (nameEl && !nameEl.value && user.name) {
      nameEl.value = user.name;
    }
    if (phoneEl && !phoneEl.value && user.phone) {
      phoneEl.value = user.phone;
    }
  }

  // 1. LOAD SAVED ADDRESSES
  async function loadAddresses() {
    if (!savedAddressesContainer) return;

    try {
      const addresses = await api.get('/api/profile/addresses');
      if (addresses && addresses.length) {
        savedAddressesContainer.innerHTML = addresses.map((addr, idx) => `
          <label class="address-option-card ${idx === 0 ? 'selected' : ''}">
            <input type="radio" name="selected_address" value="${addr.id}" ${idx === 0 ? 'checked' : ''} style="margin-top: 3px;" />
            <div>
              <strong style="color: var(--gold);">${escapeHtml(addr.name)} (${escapeHtml(addr.phone)})</strong>
              <p style="color: var(--cream); font-size: 0.85rem; margin-top: 0.2rem;">${escapeHtml(addr.address)}, ${escapeHtml(addr.city)}, ${escapeHtml(addr.state)} - ${escapeHtml(addr.pincode)}</p>
            </div>
          </label>
        `).join('');

        selectedAddress = addresses[0];

        savedAddressesContainer.querySelectorAll('input[name="selected_address"]').forEach(input => {
          input.addEventListener('change', (e) => {
            const chosenId = e.target.value;
            selectedAddress = addresses.find(a => String(a.id) === String(chosenId));
            document.querySelectorAll('.address-option-card').forEach(card => card.classList.remove('selected'));
            e.target.closest('.address-option-card').classList.add('selected');
          });
        });
      } else {
        savedAddressesContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">No saved address found. Please enter details below.</p>';
      }
    } catch (e) {
      // Ignore address load error and fall back to manual form
    }
  }

  // 2. LOAD CART & SUMMARY
  async function loadCheckoutCart() {
    try {
      cartData = await api.get('/api/cart');
      let items = [];
      let subtotal = 0;

      if (cartData) {
        if (Array.isArray(cartData.items)) {
          items = cartData.items;
          subtotal = cartData.subtotal || cartData.totalAmount || 0;
        } else if (Array.isArray(cartData)) {
          items = cartData;
        }
      }

      if (!items.length) {
        showToast('Your cart is empty.', 'error');
        setTimeout(() => { window.location.href = 'cart.html'; }, 1000);
        return;
      }

      if (!subtotal) {
        subtotal = items.reduce((sum, i) => sum + ((i.price || 0) * (i.quantity || 1)), 0);
      }

      calculatedSubtotal = subtotal;
      calculatedTotal = subtotal + DELIVERY_CHARGE;

      if (summaryItemsContainer) {
        summaryItemsContainer.innerHTML = items.map(i => `
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem; font-size: 0.9rem;">
            <span style="color: var(--cream);">${escapeHtml(i.productName || i.name)} × ${i.quantity || 1}</span>
            <span style="color: var(--gold);">₹${((i.price || 0) * (i.quantity || 1)).toLocaleString('en-IN')}</span>
          </div>
        `).join('');
      }

      if (subtotalEl) subtotalEl.textContent = `₹${calculatedSubtotal.toLocaleString('en-IN')}`;
      if (deliveryEl) deliveryEl.textContent = `₹${DELIVERY_CHARGE}`;
      if (totalEl) totalEl.textContent = `₹${calculatedTotal.toLocaleString('en-IN')}`;
      if (payBtn) payBtn.querySelector('.pay-amount-text').textContent = `Pay ₹${calculatedTotal.toLocaleString('en-IN')}`;
    } catch (err) {
      showAlert(err.message || 'Failed to load order summary.');
    }
  }

  // 3. PAYMENT & ORDER CREATION FLOW
  if (payBtn) {
    payBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (isProcessingPayment) return;

      hideAlert();

      // Determine shipping address
      let shippingInfo = null;

      const useManual = document.getElementById('chk-new-address') && document.getElementById('chk-new-address').checked;
      
      if (useManual || !selectedAddress) {
        const name = document.getElementById('ship-name').value.trim();
        const phone = document.getElementById('ship-phone').value.trim();
        const address = document.getElementById('ship-address').value.trim();
        const city = document.getElementById('ship-city').value.trim();
        const state = document.getElementById('ship-state').value.trim();
        const pincode = document.getElementById('ship-pincode').value.trim();

        if (!name || !phone || !address || !city || !state || !pincode) {
          showAlert('Please fill in all delivery address fields.');
          return;
        }
        shippingInfo = { name, phone, address, city, state, pincode };
      } else {
        shippingInfo = {
          name: selectedAddress.name,
          phone: selectedAddress.phone,
          address: selectedAddress.address,
          city: selectedAddress.city,
          state: selectedAddress.state,
          pincode: selectedAddress.pincode
        };
      }

      isProcessingPayment = true;
      payBtn.disabled = true;
      payBtn.querySelector('.pay-amount-text').textContent = 'Processing Payment...';

      try {
        // Step A: Request payment creation from backend with amount & receipt
        const receiptId = "rcpt_" + Date.now();
        const paymentRes = await api.post('/api/payments/create', {
          amount: calculatedTotal,
          receipt: receiptId
        });
        const razorpayOrderId = paymentRes.razorpayOrderId || paymentRes.orderId || paymentRes.id;
        const razorpayKey = paymentRes.keyId || paymentRes.key || 'rzp_test_villagemill';
        const amountInPaise = calculatedTotal * 100;

        if (!razorpayOrderId) {
          throw new Error('Could not initiate payment order with server.');
        }

        // Step B: Load Razorpay Checkout Script if not present
        if (typeof Razorpay === 'undefined') {
          await loadRazorpayScript();
        }

        // Step C: Trigger Razorpay Modal
        const user = getUser() || {};
        const options = {
          key: razorpayKey,
          amount: amountInPaise,
          currency: 'INR',
          name: 'The Village Mill',
          description: 'Pure Cold Pressed Oils Order',
          image: 'village-mill-logo.png',
          order_id: razorpayOrderId,
          prefill: {
            name: shippingInfo.name || user.name || '',
            email: user.email || '',
            contact: shippingInfo.phone || user.phone || ''
          },
          theme: {
            color: '#c9a84c'
          },
          handler: async function (response) {
            try {
              // Step D: Verify payment with backend
              payBtn.querySelector('.pay-amount-text').textContent = 'Verifying Payment...';
              
              await api.post('/api/payments/verify', {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature
              });

              // Step E: Create order on backend
              payBtn.querySelector('.pay-amount-text').textContent = 'Placing Order...';

              const orderRes = await api.post('/api/orders', {
                shipping: shippingInfo,
                razorpayOrderId: response.razorpay_order_id
              });

              showToast('Payment successful! Order placed.', 'success');
              const orderNum = orderRes.orderNumber || orderRes.id || 'SUCCESS';

              setTimeout(() => {
                window.location.href = `order-details.html?order=${orderNum}`;
              }, 600);
            } catch (verErr) {
              showAlert(verErr.message || 'Payment verification failed. Please contact support if debited.');
              isProcessingPayment = false;
              payBtn.disabled = false;
              payBtn.querySelector('.pay-amount-text').textContent = 'Try Payment Again';
            }
          },
          modal: {
            ondismiss: function () {
              isProcessingPayment = false;
              payBtn.disabled = false;
              loadCheckoutCart();
              showToast('Payment cancelled.', 'info');
            }
          }
        };

        const rzp = new Razorpay(options);
        rzp.open();
      } catch (err) {
        showAlert(err.message || 'Failed to initiate payment.');
        isProcessingPayment = false;
        payBtn.disabled = false;
        loadCheckoutCart();
      }
    });
  }

  function loadRazorpayScript() {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) return resolve();
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
      document.head.appendChild(script);
    });
  }

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  prefillUserData();
  loadAddresses();
  loadCheckoutCart();
});

