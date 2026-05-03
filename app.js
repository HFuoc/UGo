// ====== Wire UI ======
function wire() {
  // --- Menu toggle ---
  document.getElementById('btnToggleMenu').onclick = () => {
    const container = document.querySelector('.container');
    container.classList.toggle('menu-closed');
  };

  // --- Login ---
  document.getElementById('btnLogin').onclick    = () => openModal('loginModal');
  document.getElementById('btnCloseLogin').onclick = () => closeModal('loginModal');
  document.getElementById('btnLogout').onclick   = () => {
    localStorage.removeItem('ugo_user'); state.user = null; loadUser();
  };
  document.getElementById('btnDoLogin').onclick  = () => {
    const name  = document.getElementById('loginName').value.trim();
    const phone = document.getElementById('loginPhone').value.trim();
    if (!name || !phone) { alert('Nhập đầy đủ tên & số điện thoại'); return; }
    localStorage.setItem('ugo_user', JSON.stringify({ name, phone }));
    closeModal('loginModal'); loadUser();
  };

  // --- Set mode (pickup / dropoff click) ---
  document.querySelectorAll('input[name="setMode"]').forEach(r => {
    r.addEventListener('change', (e) => { state.setMode = e.target.value; });
  });

  // --- Search buttons ---
  document.getElementById('btnPickupSearch').onclick = () => {
    const q = document.getElementById('pickupSearch').value.trim(); if (q) searchSuggest('pickup', q);
  };
  document.getElementById('btnDropoffSearch').onclick = () => {
    const q = document.getElementById('dropoffSearch').value.trim(); if (q) searchSuggest('dropoff', q);
  };
  // Enter-to-search
  document.getElementById('pickupSearch').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { const q = e.target.value.trim(); if (q) searchSuggest('pickup', q); }
  });
  document.getElementById('dropoffSearch').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { const q = e.target.value.trim(); if (q) searchSuggest('dropoff', q); }
  });
  // Click outside → hide suggest
  document.addEventListener('click', (e) => {
    ['pickupSuggest', 'dropoffSuggest'].forEach(id => {
      const box   = document.getElementById(id);
      const input = (id === 'pickupSuggest')
        ? document.getElementById('pickupSearch')
        : document.getElementById('dropoffSearch');
      if (!box) return;
      if (box.contains(e.target) || input.contains(e.target)) return;
      box.style.display = 'none';
    });
  });

  // --- Locate me ---
  document.getElementById('btnLocate').onclick = () => {
    if (!navigator.geolocation) { alert('Trình duyệt không hỗ trợ định vị.'); return; }
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      if (state.setMode === 'pickup') setPickup(latitude, longitude, true);
      else setDropoff(latitude, longitude, true);
    }, () => alert('Không lấy được vị trí.'));
  };

  // --- Swap pickup/dropoff ---
  document.getElementById('btnSwap').onclick = () => {
    const p = state.pickup, d = state.dropoff; if (!(p && d)) return;
    setPickup(d.lat, d.lng); setDropoff(p.lat, p.lng);
    tryRoute();
  };

  // --- Pricing controls ---
  document.getElementById('vehicle').onchange = (e) => { state.pricing.vehicle = e.target.value; recalcPrice(); };
  document.getElementById('weather').onchange = (e) => { state.pricing.weather = e.target.value; maybeSuggestVoucher(); recalcPrice(); };
  const traffic    = document.getElementById('traffic');
  const trafficVal = document.getElementById('trafficVal');
  traffic.oninput  = (e) => { state.pricing.traffic = +e.target.value; trafficVal.textContent = e.target.value; recalcPrice(); };

  // --- Payment method ---
  document.querySelectorAll('#payGroup .tagpay').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('#payGroup .tagpay').forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
      state.pricing.payment = el.dataset.pay;
      maybeSuggestVoucher();
      recalcPrice();
    });
  });

  // --- Voucher ---
  document.getElementById('btnApplyVoucher').onclick = () => {
    if (state.pricing.voucherLocked) { alert('Voucher đã áp dụng cho chuyến này.'); return; }
    const v = document.getElementById('voucher').value;
    if (!v) { alert('Chọn voucher trước.'); return; }
    state.pricing.voucher       = v;
    state.pricing.voucherLocked = true;
    document.getElementById('voucher').disabled         = true;
    document.getElementById('btnApplyVoucher').disabled = true;
    if (typeof showVoucherApplied === 'function') showVoucherApplied(v);
    recalcPrice();
  };

  // --- Booking ---
  const btnBook = document.getElementById('btnBook'); btnBook.disabled = false;
  btnBook.addEventListener('click', bookDriver);
  document.getElementById('btnCancel').onclick = cancelTrip;
  document.getElementById('btnFinish').onclick = () => openModal('ratingModal');

  // --- Rating ---
  const stars = document.querySelectorAll('#stars .star');
  stars.forEach(s => {
    s.addEventListener('click', () => {
      const val = +s.dataset.val;
      stars.forEach(x => x.classList.toggle('active', +x.dataset.val <= val));
    });
  });
  document.getElementById('btnCloseRating').onclick   = () => closeModal('ratingModal');
  document.getElementById('btnSubmitRating').onclick  = () => {
    const starsEls = document.querySelectorAll('#stars .star.active');
    const val      = starsEls.length ? starsEls.length : 5;
    const note     = document.getElementById('ratingNote').value.trim();
    saveRating(val, note || '');
    closeModal('ratingModal');
    alert('Cảm ơn bạn đã đánh giá!');
    resetDriver();
    document.getElementById('btnBook').disabled = false;
  };

  // --- ESC closes modals ---
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeModal('loginModal'); closeModal('ratingModal'); }
  });
}

// ====== Bootstrap ======
(function () {
  try { initMap(); } catch(e) { console.error(e); showMapLoadError(e); }
  wire();
  loadUser();
  recalcPrice();
  maybeSuggestVoucher();
  window.addEventListener('resize', () => state.map && state.map.invalidateSize());
})();
