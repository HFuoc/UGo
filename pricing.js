// ====== Pricing ======
function recalcPrice() {
  const dkm     = state.distanceKm;
  const vehicle = state.pricing.vehicle;
  const traffic = state.pricing.traffic;
  const weather = state.pricing.weather;
  const v = {
    bike: { base:5000,  perkm:7000,  factor:1.0 },
    car:  { base:10000, perkm:11000, factor:1.3 },
    suv:  { base:15000, perkm:15000, factor:1.6 }
  }[vehicle];

  // Fuzzy traffic surge
  const t   = traffic;
  const muL = clamp((30 - t) / 30, 0, 1);
  const muM = clamp(1 - Math.abs(t - 50) / 20, 0, 1);
  const muH = clamp((t - 70) / 30, 0, 1);

  const wClear = weather === 'clear' ? 1 : 0;
  const wRain  = weather === 'rain'  ? 1 : 0;
  const wStorm = weather === 'storm' ? 1 : 0;

  const sLow  = 1.0*wClear + 1.1*(wRain||wStorm);
  const sMed  = 1.2*wClear + 1.3*wRain + 1.4*wStorm;
  const sHigh = 1.5*wClear + 1.7*wRain + 1.9*wStorm;

  let surge = (muL*(sLow||1.0) + muM*(sMed||1.2) + muH*(sHigh||1.5)) / (muL + muM + muH || 1);
  surge = clamp(surge, 1.0, 2.5);

  const subtotal = (v.base + dkm * v.perkm) * v.factor * surge;

  // Voucher discount
  const voucher = state.pricing.voucher;
  const pay     = state.pricing.payment;
  let discount  = 0;
  if (voucher) {
    if (voucher === 'FAST10')                                             discount = 0.10 * subtotal;
    if (voucher === 'MOMO15' && pay === 'momo')                           discount = 0.15 * subtotal;
    if (voucher === 'RAIN20' && (weather === 'rain' || weather === 'storm')) discount = 0.20 * subtotal;
    if (voucher === 'NEW50K')                                             discount = 50000;
  }
  const total = Math.max(0, subtotal - discount);

  state.pricing.surge    = surge;
  state.pricing.estimate = subtotal;
  state.pricing.discount = discount;
  state.pricing.total    = total;

  // --- Cập nhật breakdown rows ---
  document.getElementById('txtSurge').textContent     = surge.toFixed(2) + '×';
  document.getElementById('txtBreakdown').textContent = fmtVnd(v.base) + ' + ' + fmtVnd(v.perkm) + '/km × ' + v.factor.toFixed(1);
  document.getElementById('txtEstimate').textContent  = dkm > 0 ? fmtVnd(subtotal) : '—';
  document.getElementById('txtDiscount').textContent  = discount > 0 ? '− ' + fmtVnd(discount) : '—';
  document.getElementById('txtTotal').textContent     = dkm > 0 ? fmtVnd(total) : '—';

  // --- Cập nhật Price Hero ---
  const heroValue  = document.getElementById('priceHeroValue');
  const heroSub    = document.getElementById('priceHeroSub');
  const heroSurge  = document.getElementById('priceHeroSurge');
  if (heroValue) heroValue.textContent = dkm > 0 ? fmtVnd(total) : '—';
  if (heroSurge) heroSurge.textContent = 'Surge ×' + surge.toFixed(2);
  if (heroSub) {
    if (dkm <= 0) {
      heroSub.textContent = 'Chọn điểm đón/đến để tính giá';
    } else if (discount > 0 && voucher) {
      heroSub.textContent = 'Đã giảm ' + fmtVnd(discount) + ' (voucher ' + voucher + ')';
    } else {
      heroSub.textContent = vehicle.toUpperCase() + ' • ' + dkm.toFixed(2) + ' km';
    }
  }

  // Highlight surge badge theo mức
  if (heroSurge) {
    heroSurge.style.color        = surge >= 1.5 ? '#fbbf24' : surge >= 1.2 ? '#fb923c' : '#6ee7b7';
    heroSurge.style.borderColor  = surge >= 1.5 ? 'rgba(245,158,11,.4)' : surge >= 1.2 ? 'rgba(251,146,60,.4)' : 'rgba(110,231,183,.3)';
    heroSurge.style.background   = surge >= 1.5 ? 'rgba(245,158,11,.12)' : surge >= 1.2 ? 'rgba(251,146,60,.1)' : 'rgba(110,231,183,.08)';
  }
}

// ====== Voucher gợi ý tự động ======
function recommendVoucherCode() {
  const pay     = state.pricing.payment;
  const weather = state.pricing.weather;
  if (weather === 'rain' || weather === 'storm') return 'RAIN20';
  if (pay === 'momo') return 'MOMO15';
  return '';
}

function maybeSuggestVoucher() {
  if (state.pricing.voucherLocked) return;
  const rec = recommendVoucherCode();
  const sel = document.getElementById('voucher');
  const btn = document.getElementById('btnApplyVoucher');
  if (!sel) return;
  sel.value = rec || '';
  if (btn) btn.disabled = false;
}

function resetVoucherUI() {
  const sel     = document.getElementById('voucher');
  const btn     = document.getElementById('btnApplyVoucher');
  const applied = document.getElementById('voucherApplied');
  const vrow    = document.querySelector('.voucher-row');

  state.pricing.voucher       = null;
  state.pricing.voucherLocked = false;

  if (sel) { sel.disabled = false; sel.value = ''; }
  if (btn) { btn.disabled = false; }
  if (applied) applied.style.display = 'none';
  if (vrow)    vrow.style.display    = 'flex';

  maybeSuggestVoucher();
  recalcPrice();
}

// ====== Cập nhật UI voucher applied (gọi từ app.js khi áp dụng) ======
function showVoucherApplied(code) {
  const applied = document.getElementById('voucherApplied');
  const vrow    = document.querySelector('.voucher-row');
  const vaCode  = document.getElementById('vaCode');
  const vaDesc  = document.getElementById('vaDesc');

  const descriptions = {
    'FAST10': 'Giảm 10% cho chuyến này',
    'MOMO15': 'Giảm 15% khi thanh toán MoMo',
    'RAIN20': 'Giảm 20% khi trời mưa / bão',
    'NEW50K': 'Giảm thẳng 50.000đ'
  };

  if (vaCode) vaCode.textContent = code + ' đã áp dụng';
  if (vaDesc) vaDesc.textContent = descriptions[code] || '';
  if (applied) applied.style.display = 'flex';
  if (vrow)    vrow.style.display    = 'none';
}
