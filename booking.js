// ====== Booking & Flow ======

function setStatus(s) {
  state.booking.status = s;
  document.getElementById('txtStatus').textContent = s;

  // --- Step progress ---
  const stepMap = {
    'Đang tìm':    1,
    'Đã nhận cuốc': 2,
    'Đang chở':    3,
    'Đã hoàn tất': 4,
    'Đã huỷ':      0
  };
  const active = stepMap[s] ?? 0;

  for (let i = 1; i <= 4; i++) {
    const step = document.getElementById('bstep' + i);
    const dot  = step && step.querySelector('.bstep-dot');
    if (!step || !dot) continue;
    step.classList.remove('done', 'active', 'pending');
    if (i < active)      { step.classList.add('done');    dot.textContent = '✓'; }
    else if (i === active){ step.classList.add('active');  dot.textContent = i;   }
    else                  { step.classList.add('pending'); dot.textContent = i;   }
  }

  for (let i = 1; i <= 3; i++) {
    const line = document.getElementById('bline' + i);
    if (line) line.classList.toggle('done', i < active);
  }
}

function randomDriver() {
  const pool = [
    { name:'Nguyễn Văn Tèo', plate:'59A1-123.45', vehicle:'Wave Alpha', rating:4.92, phone:'0909 123 456' },
    { name:'Trần Thị Bưởi',  plate:'51F-888.68',  vehicle:'Vision',     rating:4.85, phone:'0707 555 666' },
    { name:'Lê Hoàng',       plate:'60B-222.33',  vehicle:'Exciter',    rating:4.97, phone:'0933 777 888' }
  ];
  return pool[Math.floor(Math.random() * pool.length)];
}

function showDriverCard() {
  const d  = state.booking.driver;
  const el = document.getElementById('driverCard');
  if (!d) {
    el.className = 'driver-card-empty';
    el.innerHTML = '<span class="dc-empty-text">Chưa có tài xế</span>';
    return;
  }
  // Tạo avatar từ chữ cái đầu
  const initials = d.name.split(' ').map(w => w[0]).join('').slice(-2).toUpperCase();
  el.className = 'driver-card-new';
  el.innerHTML =
    '<div class="dav">' + initials + '</div>' +
    '<div class="dinfo">' +
      '<div class="dname">' + d.name + '</div>' +
      '<div class="dmeta">' + d.vehicle + ' • ' + d.plate + ' • 📞 ' + d.phone + '</div>' +
    '</div>' +
    '<div class="drating">⭐ ' + d.rating + '</div>';
}

function resetDriver() {
  if (state.driverMarker) { state.map.removeLayer(state.driverMarker); state.driverMarker = null; }
  if (state.booking.animTimer) { cancelAnimationFrame(state.booking.animTimer); state.booking.animTimer = null; }
  state.booking.driver = null;
  showDriverCard();
  document.getElementById('btnCancel').disabled = true;
  document.getElementById('btnFinish').disabled = true;
  // Reset step progress về trạng thái ban đầu
  setStatus('Chưa đặt');
  resetVoucherUI();
}

async function bookDriver() {
  if (!state.routeCoords.length) { alert('Vui lòng chọn điểm đón/điểm đến để tính tuyến.'); return; }
  setStatus('Đang tìm');
  const btn = document.getElementById('btnBook'); btn.disabled = true;
  document.getElementById('btnCancel').disabled = false;

  await sleep(600);
  state.booking.driver = randomDriver();
  showDriverCard();
  setStatus('Đã nhận cuốc');

  const pk     = state.routeCoords[0];
  const offset = 0.0015;
  const driverStart = [pk[0] + (Math.random() - .5) * offset, pk[1] + (Math.random() - .5) * offset];

  if (!state.driverMarker) {
    state.driverMarker = L.marker(driverStart, { icon: driverDivIcon('accept') }).addTo(state.map);
  } else {
    state.driverMarker.setLatLng(driverStart);
    updateDriverIcon('accept');
  }

  let approach;
  try {
    approach = await osrmRoute(driverStart, pk);
  } catch(e) {
    const d = distanceLL(driverStart, pk);
    approach = { coords:[driverStart, pk], distance:d, duration:Math.max(8, d/8) };
  }
  const approachMps = Math.max(4, approach.distance / Math.max(approach.duration, 1)) * state.speedMultiplier;
  await new Promise(res => animateAlongRoad(approach.coords, approachMps, res, 'accept'));

  setStatus('Đang chở');
  updateDriverIcon('drive');

  const rideMps = (state.distanceKm * 1000) / Math.max(state.durationMin * 60, 1) * state.speedMultiplier;
  await new Promise(res => animateAlongRoad(state.routeCoords, rideMps, res, 'drive'));

  setStatus('Đã hoàn tất');
  updateDriverIcon('done');
  document.getElementById('btnFinish').disabled = false;
  openModal('ratingModal');
}

function cancelTrip() {
  setStatus('Đã huỷ');
  resetDriver();
  document.getElementById('btnBook').disabled = false;
}
