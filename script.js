/**
 * THE VILLAGE MILL — script.js
 * Site interactions
 */

'use strict';

/* ═══════════════════════════════════════════════════════════
   UTILITY
   ═══════════════════════════════════════════════════════════ */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const lerp = (a, b, t) => a + (b - a) * t;

const WAITLIST_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxCPjALV8_ouQUm2Om1IQjOLIsqpgWv7DChlPW-0xjwCE2rMldUrJszVKVfqvXsPXlo/exec';
const PRODUCT_CATALOG = {
  'Groundnut Oil': {
    skuPrefix: 'GN',
    variants: {
      '500ml': 210,
      '1000ml': 399,
    },
  },
  'Coconut Oil': {
    skuPrefix: 'CO',
    variants: {
      '500ml': 0,
      '1000ml': 0,
    },
  },
  'Sesame Oil': {
    skuPrefix: 'SO',
    variants: {
      '500ml': 0,
      '1000ml': 0,
    },
  },
};
const DELIVERY_FEE = 45;
const DEFAULT_ORDER_PRODUCT = 'Groundnut Oil';
const UPI_CONFIG = {
  payeeName: 'The Village Mill',
  payeeVpa: 'village.mill@axl',
  merchantCode: '',
};

/* ═══════════════════════════════════════════════════════════
   1. CUSTOM CURSOR
   ═══════════════════════════════════════════════════════════ */
(function initCursor() {
  const glow = $('#cursor-glow');
  const dot  = $('#cursor-dot');
  if (!glow || !dot) return;

  let mx = 0, my = 0, gx = 0, gy = 0;

  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';
  });

  // Smooth glow follow
  (function animGlow() {
    gx = lerp(gx, mx, 0.08);
    gy = lerp(gy, my, 0.08);
    glow.style.left = gx + 'px';
    glow.style.top  = gy + 'px';
    requestAnimationFrame(animGlow);
  })();

  // Cursor scale on interactive elements
  document.querySelectorAll('a, button, .oil-card, .benefit-card').forEach(el => {
    el.addEventListener('mouseenter', () => {
      dot.style.width  = '20px';
      dot.style.height = '20px';
      dot.style.background = 'transparent';
      dot.style.border = '1.5px solid var(--gold)';
    });
    el.addEventListener('mouseleave', () => {
      dot.style.width  = '8px';
      dot.style.height = '8px';
      dot.style.background = 'var(--gold)';
      dot.style.border = 'none';
    });
  });
})();

/* ═══════════════════════════════════════════════════════════
   2. FLOATING PARTICLES
   ═══════════════════════════════════════════════════════════ */
(function initParticles() {
  const container = $('#particles');
  if (!container) return;

  const count = 28;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 3 + 1;
    p.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 80 + 20}%;
      --dur: ${Math.random() * 8 + 6}s;
      --delay: ${Math.random() * 8}s;
      --op: ${Math.random() * 0.35 + 0.1};
      --rise: ${-(Math.random() * 100 + 40)}px;
    `;
    container.appendChild(p);
  }
})();

/* ═══════════════════════════════════════════════════════════
   3. NAVIGATION
   ═══════════════════════════════════════════════════════════ */
(function initNav() {
  const nav       = $('#main-nav');
  const hamburger = $('#nav-hamburger');
  const mobileMenu = $('#mobile-menu');

  // Scroll effect
  window.addEventListener('scroll', () => {
    if (window.scrollY > 80) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }, { passive: true });

  // Hamburger
  hamburger?.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
    const spans = hamburger.querySelectorAll('span');
    if (mobileMenu.classList.contains('open')) {
      spans[0].style.transform = 'rotate(45deg) translate(4px, 4px)';
      spans[1].style.opacity = '0';
      spans[2].style.transform = 'rotate(-45deg) translate(4px, -4px)';
    } else {
      spans[0].style.transform = '';
      spans[1].style.opacity = '';
      spans[2].style.transform = '';
    }
  });

  // Close on link click
  $$('#mobile-menu a').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      hamburger.querySelectorAll('span').forEach(s => {
        s.style.transform = '';
        s.style.opacity = '';
      });
    });
  });
})();

/* ═══════════════════════════════════════════════════════════
   4. SCROLL REVEAL (Intersection Observer)
   ═══════════════════════════════════════════════════════════ */
(function initScrollReveal() {
  const targets = $$('.reveal-up, .reveal-left, .reveal-right, .section-label-top, .section-subtitle');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const delay = el.style.getPropertyValue('--delay') || '0s';
        const delayMs = parseFloat(delay) * 1000;

        setTimeout(() => {
          el.classList.add('revealed');
        }, delayMs);

        // For non-classed elements (section-label, subtitle)
        if (!el.classList.contains('reveal-up') &&
            !el.classList.contains('reveal-left') &&
            !el.classList.contains('reveal-right')) {
          el.style.opacity = '0';
          el.style.transform = 'translateY(20px)';
          el.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
          setTimeout(() => {
            el.style.opacity = '';
            el.style.transform = '';
          }, delayMs);
        }

        observer.unobserve(el);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  });

  targets.forEach(el => observer.observe(el));
})();

/* ═══════════════════════════════════════════════════════════
   5. PARALLAX EFFECTS
   ═══════════════════════════════════════════════════════════ */
(function initParallax() {
  const trees  = $$('.tree');
  const sunrise = $('.bg-sunrise');

  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrollY = window.scrollY;

        trees.forEach((tree, i) => {
          const speed = i % 2 === 0 ? 0.08 : 0.05;
          tree.style.transform = `translateY(${scrollY * speed}px)`;
        });

        if (sunrise) {
          sunrise.style.transform = `translateX(-50%) translateY(${scrollY * 0.15}px)`;
        }

        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
})();

/* ═══════════════════════════════════════════════════════════
   6. EMAIL FORM
   ═══════════════════════════════════════════════════════════ */
(function initForm() {
  const btn     = $('#submit-btn');
  const input   = $('#email-input');
  const success = $('#form-success');
  const formInner = $('.form-inner');
  const note = $('.form-note');
  if (!btn || !input) return;

  const defaultNote = note?.textContent || '';
  const defaultButtonText = btn.textContent;

  function showFormMessage(message) {
    if (!note) return;
    note.textContent = message;
    setTimeout(() => {
      note.textContent = defaultNote;
    }, 3000);
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async function saveWaitlistEmail(email) {
    if (!WAITLIST_ENDPOINT) {
      throw new Error('Waitlist storage is not connected yet.');
    }

    await fetch(WAITLIST_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        email,
        source: 'coming-soon',
        page: window.location.href,
        userAgent: navigator.userAgent,
      }),
    });
  }

  btn.addEventListener('click', async () => {
    const email = input.value.trim().toLowerCase();
    if (!isValidEmail(email)) {
      input.style.borderLeft = '3px solid #c06050';
      input.placeholder = 'Please enter a valid email';
      setTimeout(() => {
        input.style.borderLeft = '';
        input.placeholder = 'your@email.com';
      }, 2000);
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      await saveWaitlistEmail(email);

      btn.textContent = '✓';
      btn.style.background = '#4a8a4a';
      formInner.style.opacity = '0';
      formInner.style.transition = 'opacity 0.4s ease';

      setTimeout(() => {
        formInner.style.display = 'none';
        success.classList.remove('hidden');
      }, 500);
    } catch (error) {
      btn.disabled = false;
      btn.textContent = defaultButtonText;
      input.style.borderLeft = '3px solid #c06050';
      showFormMessage(error.message || 'Something went wrong. Please try again.');
      setTimeout(() => {
        input.style.borderLeft = '';
      }, 3000);
    }
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') btn.click();
  });
})();

/* ═══════════════════════════════════════════════════════════
   7. GROUNDNUT ORDER MODAL
   ═══════════════════════════════════════════════════════════ */
(function initOrderModal() {
  const openButtons = $$('[data-open-order-modal]');
  const backdrop = $('#order-modal-backdrop');
  const closeBtn = $('#order-modal-close');
  const modalTitle = $('#order-modal-title');
  const form = $('#order-form');
  const sizeInputs = {
    '1000ml': $('#order-qty-1000'),
    '500ml': $('#order-qty-500'),
  };
  const qtyButtons = $$('[data-qty-action]', form);
  const addressGroup = $('#address-group');
  const pincodeGroup = $('#customer-pincode')?.closest('.order-field-group');
  const paymentPanel = $('#payment-panel');
  const paymentCopy = $('#payment-copy');
  const paymentLink = $('#upi-pay-link');
  const paymentQrWrap = $('#payment-qr-wrap');
  const paymentQrImage = $('#payment-qr-image');
  const paymentConfirmed = $('#payment-confirmed');
  const userTypeCard = $('#user-type-card');
  const newUserCheckbox = $('#new-user-checkbox');
  const submitBtn = $('#order-submit-btn');
  const confirmBtn = $('#order-confirm-btn');
  const submitTitle = $('#order-submit-title');
  const submitNote = $('#order-submit-note');
  const summaryCompactTotal = $('#summary-compact-total');
  const statusElements = $$('.order-status');
  const summarySizeQty = $('#summary-size-qty');
  const summarySubtotal = $('#summary-subtotal');
  const summaryDelivery = $('#summary-delivery');
  const summaryTotal = $('#summary-total');
  const formTrack = $('#order-form-track');
  const backBtn = $('#order-back-btn');
  if (!openButtons.length || !backdrop || !form) return;

  const sizeOrder = ['1000ml', '500ml'];

  let paymentStepActive = false;
  let latestOrderSnapshot = null;
  let activeProduct = DEFAULT_ORDER_PRODUCT;

  function getProductConfig(productName = DEFAULT_ORDER_PRODUCT) {
    return PRODUCT_CATALOG[productName] || PRODUCT_CATALOG[DEFAULT_ORDER_PRODUCT];
  }

  function getSku(productName, variant) {
    const config = getProductConfig(productName);
    const numericVariant = String(variant || '').replace(/[^\d]/g, '');

    if (!config?.skuPrefix || !numericVariant) {
      return '';
    }

    return `${config.skuPrefix}${numericVariant}`;
  }

  function setSubmitState(title, note = '') {
    if (submitTitle) submitTitle.textContent = title;
    if (submitNote) submitNote.textContent = note;
  }

  function showStep(step) {
    paymentStepActive = step === 1;
    if (formTrack) {
      formTrack.style.transform = step === 0 ? 'translateX(0%)' : 'translateX(-50%)';
    }
    if (paymentPanel) {
      paymentPanel.classList.toggle('hidden', step !== 1);
    }

    if (step === 0) {
      setSubmitState('Pay Now');
    } else {
      setSubmitState('Place Order');
    }
  }

  function isPlaceholderVpa() {
    return !UPI_CONFIG.payeeVpa || /villagemill@upi/i.test(UPI_CONFIG.payeeVpa);
  }

  function setStatus(message = '', type = '') {
    statusElements.forEach(status => {
      status.textContent = message;
      status.className = 'order-status';
      if (!message) {
        status.classList.add('hidden');
        return;
      }
      status.classList.remove('hidden');
      if (type) status.classList.add(type);
    });
  }

  function getSelectedValue(name) {
    return $(`input[name="${name}"]:checked`, form)?.value;
  }

  function isNewUser() {
    return Boolean(newUserCheckbox?.checked);
  }

  function getSizeQuantity(size) {
    const input = sizeInputs[size];
    const parsed = Number.parseInt(input?.value || '0', 10);
    return Math.min(20, Math.max(0, Number.isNaN(parsed) ? 0 : parsed));
  }

  function setSizeQuantity(size, value) {
    const input = sizeInputs[size];
    if (!input) return;
    input.value = String(Math.min(20, Math.max(0, value)));
  }

  function formatCurrency(amount) {
    return `₹${amount}`;
  }

  function getVariantPrice(productName, variant) {
    const config = getProductConfig(productName);
    return config?.variants?.[variant] || 0;
  }

  function buildOrderItems(productName = activeProduct) {
    return sizeOrder
      .map(variant => {
        const quantity = getSizeQuantity(variant);
        const unitPrice = getVariantPrice(productName, variant);

        return {
          sku: getSku(productName, variant),
          product: productName,
          variant,
          quantity,
          unitPrice,
          lineTotal: unitPrice * quantity,
        };
      })
      .filter(item => item.quantity > 0);
  }

  function buildPaymentDescription(items) {
    return items
      .map(item => `${item.product} ${item.variant} × ${item.quantity}`)
      .join(' + ');
  }

  function calculateTotals(items, deliveryFee = 0, discount = 0) {
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const total = Math.max(0, subtotal + deliveryFee - discount);

    return {
      subtotal,
      discount,
      total,
    };
  }

  function getCustomerDetails() {
    return {
      name: $('#customer-name')?.value.trim() || '',
      phone: $('#phone-number')?.value.trim() || '',
      address: $('#customer-address')?.value.trim() || '',
      pincode: $('#customer-pincode')?.value.trim() || '',
    };
  }

  function buildOrder(orderId = generateOrderId()) {
    const items = buildOrderItems();
    const deliveryMode = getSelectedValue('delivery') || 'pickup';
    const deliveryFee = deliveryMode === 'home' ? DELIVERY_FEE : 0;
    const pricing = calculateTotals(items, deliveryFee, 0);

    return {
      orderId,
      createdAt: new Date().toISOString(),
      customer: getCustomerDetails(),
      delivery: {
        mode: deliveryMode,
        fee: deliveryFee,
      },
      payment: {
        status: 'paid',
        method: 'UPI',
      },
      pricing,
      source: {
        source: 'order-modal',
        page: window.location.href,
        userAgent: navigator.userAgent,
      },
      items,
    };
  }

  function buildOrderState() {
    const order = buildOrder(latestOrderSnapshot?.orderId || generateOrderId());

    return {
      ...order,
    };
  }

  function updateSummary() {
    const state = buildOrderState();

    if (state.items.length) {
      summarySizeQty.innerHTML = state.items
        .map(item => `<span>${item.variant} × ${item.quantity}</span><strong>${formatCurrency(item.lineTotal)}</strong>`)
        .join('');
    } else {
      summarySizeQty.innerHTML = '<span>No size selected yet</span><strong>Rs. 0</strong>';
    }

    summarySubtotal.textContent = `Subtotal = ${formatCurrency(state.pricing.subtotal)}`;
    summaryDelivery.textContent = state.delivery.mode === 'home'
      ? `Home delivery = ${formatCurrency(state.delivery.fee)}`
      : 'Pickup = Free';
    summaryTotal.textContent = `Total = ${formatCurrency(state.pricing.total)}`;
    summaryCompactTotal.textContent = `Rs. ${state.pricing.total}`;

    if (paymentStepActive) {
      refreshPaymentUi();
    }
  }

  function updateDeliveryFields() {
    const deliveryMode = getSelectedValue('delivery') || 'pickup';
    const isHomeDelivery = deliveryMode === 'home';
    const requireAddressFields = isHomeDelivery && isNewUser();
    const showDeliveryFields = isHomeDelivery && isNewUser();

    userTypeCard?.classList.toggle('hidden', !isHomeDelivery);
    if (!isHomeDelivery && newUserCheckbox) {
      newUserCheckbox.checked = false;
    }

    addressGroup?.classList.toggle('delivery-dependent', true);
    pincodeGroup?.classList.toggle('delivery-dependent', true);
    addressGroup?.classList.toggle('hidden', !showDeliveryFields);
    pincodeGroup?.classList.toggle('hidden', !showDeliveryFields);

    const addressInput = $('#customer-address');
    const pincodeInput = $('#customer-pincode');
    if (addressInput) addressInput.required = requireAddressFields;
    if (pincodeInput) pincodeInput.required = requireAddressFields;
  }

  function generateOrderId() {
    return `VM-${Date.now().toString(36).toUpperCase()}`;
  }

  function buildUpiLink(orderState) {
    const orderId = latestOrderSnapshot?.orderId || generateOrderId();
    const params = new URLSearchParams({
      pa: UPI_CONFIG.payeeVpa,
      pn: UPI_CONFIG.payeeName,
      am: String(orderState.pricing.total.toFixed(2)),
      cu: 'INR',
      tn: `${buildPaymentDescription(orderState.items)} (${orderId})`,
    });

    if (UPI_CONFIG.merchantCode) {
      params.set('mc', UPI_CONFIG.merchantCode);
    }

    return {
      orderId,
      url: `upi://pay?${params.toString()}`,
    };
  }

  function refreshPaymentUi() {
    const state = buildOrderState();
    const payment = buildUpiLink(state);
    latestOrderSnapshot = { ...state, orderId: payment.orderId };

    paymentCopy.textContent = `Scan or tap to pay ${formatCurrency(state.pricing.total)} for ${buildPaymentDescription(state.items)}.`;
    paymentLink.href = payment.url;
    paymentLink.classList.remove('hidden');

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(payment.url)}`;
    paymentQrImage.src = qrUrl;
    paymentQrWrap.style.display = 'flex';
  }

  function clampQuantity(size) {
    setSizeQuantity(size, getSizeQuantity(size));
    updateSummary();
  }

  function openModal() {
    backdrop.classList.remove('hidden');
    backdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (modalTitle) modalTitle.textContent = activeProduct;
    setStatus('');
    showStep(0);
    setSubmitState('Pay Now');
    submitBtn.disabled = false;
    confirmBtn.disabled = true;
    updateDeliveryFields();
    updateSummary();
  }

  function resetPaymentStep() {
    paymentStepActive = false;
    latestOrderSnapshot = null;
    paymentPanel.classList.add('hidden');
    paymentLink.classList.add('hidden');
    paymentQrWrap.style.display = 'none';
    paymentConfirmed.checked = false;
    showStep(0);
    setSubmitState('Pay Now', 'Generate secure UPI payment');
  }

  function closeModal() {
    backdrop.classList.add('hidden');
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    form.reset();
    setSizeQuantity('1000ml', 1);
    setSizeQuantity('500ml', 0);
    $('input[name="delivery"][value="pickup"]', form).checked = true;
    resetPaymentStep();
    setStatus('');
    updateDeliveryFields();
    updateSummary();
  }

  function validateOrderForm() {
    const customer = getCustomerDetails();
    const items = buildOrderItems();

    if (customer.name.length < 2) {
      throw new Error('Please enter the customer name.');
    }

    if (!/^[0-9+\-\s]{10,15}$/.test(customer.phone)) {
      throw new Error('Please enter a valid phone number.');
    }

    if (!items.length) {
      throw new Error('Please select at least one bottle before continuing.');
    }

    if (items.some(item => item.quantity <= 0)) {
      throw new Error('Please select valid quantities before continuing.');
    }

    const deliveryMode = getSelectedValue('delivery') || 'pickup';

    if (deliveryMode === 'home' && isNewUser()) {
      if (customer.address.length < 8) {
        throw new Error('Please enter the delivery address.');
      }

      if (!/^\d{6}$/.test(customer.pincode)) {
        throw new Error('Please enter a valid 6-digit pincode.');
      }
    }
  }

  async function submitOrder(order) {
    await fetch(WAITLIST_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'order',
        ...order,
      }),
    });
  }

  openButtons.forEach(button => {
    button.addEventListener('click', () => {
      activeProduct = button.dataset.product || DEFAULT_ORDER_PRODUCT;
      $('#mobile-menu')?.classList.remove('open');
      $('#nav-hamburger')?.querySelectorAll('span').forEach(s => {
        s.style.transform = '';
        s.style.opacity = '';
      });
      openModal();
    });
  });
  closeBtn.addEventListener('click', closeModal);

  backdrop.addEventListener('click', event => {
    if (event.target === backdrop) closeModal();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !backdrop.classList.contains('hidden')) {
      closeModal();
    }
  });

  qtyButtons.forEach(button => {
    button.addEventListener('click', () => {
      const size = button.dataset.size;
      const action = button.dataset.qtyAction;
      if (!size || !action) return;

      const nextQuantity = action === 'increase'
        ? getSizeQuantity(size) + 1
        : getSizeQuantity(size) - 1;

      setSizeQuantity(size, nextQuantity);
      updateSummary();
    });
  });

  Object.entries(sizeInputs).forEach(([size, input]) => {
    input?.addEventListener('input', () => {
      clampQuantity(size);
    });
  });

  $$('input[name="delivery"]', form).forEach(input => {
    input.addEventListener('change', () => {
      updateDeliveryFields();
      updateSummary();
    });
  });

  newUserCheckbox?.addEventListener('change', () => {
    updateDeliveryFields();
    updateSummary();
  });

  paymentConfirmed.addEventListener('change', () => {
    confirmBtn.disabled = !paymentConfirmed.checked;
    if (paymentConfirmed.checked) {
      setStatus('Payment confirmed. You can finish the order now.');
    } else {
      setStatus('');
    }
  });

  async function handlePrimaryAction(event) {
    if (event) event.preventDefault();
    setStatus('');

    try {
      validateOrderForm();

      if (!paymentStepActive) {
        refreshPaymentUi();
        showStep(1);
        setStatus(
          isPlaceholderVpa()
            ? 'QR is ready. Replace the placeholder VPA in script.js before going live.'
            : 'QR is ready. Complete payment, then tick the checkbox and confirm the order.'
        );
        submitBtn.disabled = false;
        confirmBtn.disabled = !paymentConfirmed.checked;
        return;
      }

      if (!paymentConfirmed.checked) {
        throw new Error('Please confirm that the payment has been completed.');
      }

      confirmBtn.disabled = true;
      setSubmitState('Placing Order...', 'Please wait a moment');

      await submitOrder(latestOrderSnapshot || buildOrder(generateOrderId()));

      setStatus('Payment received and order submitted. We will contact you shortly.', 'success');
      setSubmitState('Order Placed');

      setTimeout(() => {
        confirmBtn.disabled = false;
        closeModal();
      }, 1600);
    } catch (error) {
      submitBtn.disabled = false;
      confirmBtn.disabled = !paymentConfirmed.checked;
      setSubmitState(paymentStepActive ? 'Place Order' : 'Pay Now');
      setStatus(error.message || 'Unable to place the order right now.', 'error');
    }
  }

  submitBtn?.addEventListener('click', handlePrimaryAction);
  backBtn?.addEventListener('click', () => {
    setStatus('');
    showStep(0);
  });
  form.addEventListener('submit', handlePrimaryAction);

  setSizeQuantity('1000ml', 1);
  setSizeQuantity('500ml', 0);
  updateDeliveryFields();
  updateSummary();
})();

/* ═══════════════════════════════════════════════════════════
   8. SMOOTH SECTION TRANSITIONS (section bg glow)
   ═══════════════════════════════════════════════════════════ */
(function initSectionGlow() {
  const sections = $$('section');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.setProperty('--section-visible', '1');
      }
    });
  }, { threshold: 0.3 });

  sections.forEach(s => observer.observe(s));
})();

/* ═══════════════════════════════════════════════════════════
   9. OIL BOTTLE 3D HOVER (subtle tilt)
   ═══════════════════════════════════════════════════════════ */
(function initBottleTilt() {
  $$('.oil-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect  = card.getBoundingClientRect();
      const cx    = rect.left + rect.width / 2;
      const cy    = rect.top  + rect.height / 2;
      const dx    = (e.clientX - cx) / (rect.width  / 2);
      const dy    = (e.clientY - cy) / (rect.height / 2);
      const tiltX = dy * -5;
      const tiltY = dx *  5;

      card.style.transform = `perspective(600px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-8px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
})();

/* ═══════════════════════════════════════════════════════════
   10. CINEMATIC SECTION TRANSITIONS (fade + slide)
   ═══════════════════════════════════════════════════════════ */
(function initCinematicFades() {
  // Stagger benefit cards
  $$('.benefit-card').forEach((card, i) => {
    card.style.setProperty('--delay', `${i * 0.08}s`);
  });

  // Stagger process steps
  $$('.process-step').forEach((step, i) => {
    step.style.setProperty('--delay', `${i * 0.15}s`);
  });
})();

/* ═══════════════════════════════════════════════════════════
   11. DYNAMIC OIL SHIMMER on scroll
   ═══════════════════════════════════════════════════════════ */
(function initOilShimmer() {
  const bottles = $$('.product-bottle');
  let scrollY = 0;

  window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
  }, { passive: true });

  function shimmerFrame() {
    bottles.forEach((b, i) => {
      const phase = (Date.now() / 1000 + i * 1.2) % (Math.PI * 2);
      const glow  = 0.15 + Math.sin(phase) * 0.05;
      b.style.filter = `drop-shadow(0 20px 40px rgba(0,0,0,0.8)) drop-shadow(0 0 ${20 + Math.sin(phase) * 8}px rgba(201,168,76,${glow}))`;
    });
    requestAnimationFrame(shimmerFrame);
  }

  shimmerFrame();
})();

/* ═══════════════════════════════════════════════════════════
   12. COUNTER ANIMATION for About stats
   ═══════════════════════════════════════════════════════════ */
(function initCounters() {
  const stats = $$('.stat-num');
  let animated = false;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !animated) {
        animated = true;
        stats.forEach(stat => {
          const text = stat.textContent.trim();
          if (text === '0') {
            let count = 100;
            const timer = setInterval(() => {
              count -= 7;
              if (count <= 0) { stat.textContent = '0'; clearInterval(timer); }
              else stat.textContent = count;
            }, 40);
          }
        });
      }
    });
  }, { threshold: 0.5 });

  stats.forEach(s => observer.observe(s));
})();

/* ═══════════════════════════════════════════════════════════
   13. ACTIVE NAV HIGHLIGHT
   ═══════════════════════════════════════════════════════════ */
(function initActiveNav() {
  const sections = $$('section[id]');
  const links    = $$('.nav-links a');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        links.forEach(link => {
          link.style.color = link.getAttribute('href') === `#${id}`
            ? 'var(--gold)'
            : '';
        });
      }
    });
  }, { threshold: 0.4 });

  sections.forEach(s => observer.observe(s));
})();

/* ═══════════════════════════════════════════════════════════
   14. COMING SOON — animated text cycle
   ═══════════════════════════════════════════════════════════ */
(function initTaglineCycle() {
  const taglines = [
    'From Village Roots to Pure Drops',
    'Tradition Pressed Into Purity',
    'Pure Oil. Honest Tradition.',
  ];

  // Optional: cycle a tagline in a designated element
  // The main one is already set in HTML
})();

/* ═══════════════════════════════════════════════════════════
   15. FOOTER EMBLEM ROTATION on hover
   ═══════════════════════════════════════════════════════════ */
(function initFooterEmblem() {
  const emblem = $('.footer-emblem');
  if (!emblem) return;

  emblem.addEventListener('mouseenter', () => {
    emblem.style.transition = 'transform 1s ease';
    emblem.style.transform = 'rotate(180deg)';
  });

  emblem.addEventListener('mouseleave', () => {
    emblem.style.transform = 'rotate(360deg)';
    setTimeout(() => {
      emblem.style.transition = '';
      emblem.style.transform = '';
    }, 1000);
  });
})();

/* ═══════════════════════════════════════════════════════════
   16. INIT — final setup
   ═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Ensure fonts loaded before animations
  document.fonts.ready.then(() => {
    console.log('%cThe Village Mill 🫙 — Crafted with Tradition', 'color:#c9a84c;font-family:serif;font-size:14px;');
  });
});
