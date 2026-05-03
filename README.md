# UGo 🛵 — Smart Ride-Hailing for UEHers
 
> **Ứng dụng đặt xe công nghệ mô phỏng**, tích hợp bản đồ thực, định tuyến OSRM và thuật toán **Fuzzy Logic** để tính giá cước thông minh theo thời tiết & giao thông.
 
![Banner](https://img.shields.io/badge/UGo-Frontend%20Demo-1e6654?style=for-the-badge&logo=leaflet&logoColor=white)
![HTML](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=flat-square&logo=leaflet&logoColor=white)
![OpenStreetMap](https://img.shields.io/badge/OpenStreetMap-7EBC6F?style=flat-square&logo=openstreetmap&logoColor=white)
 
---
 
## 📋 Mục lục
 
- [Tính năng nổi bật](#-tính-năng-nổi-bật)
- [Demo nhanh](#-demo-nhanh)
- [Cấu trúc dự án](#-cấu-trúc-dự-án)
- [Cài đặt & Chạy](#-cài-đặt--chạy)
- [Kiến trúc & Giải thích module](#-kiến-trúc--giải-thích-module)
- [Thuật toán Fuzzy Logic](#-thuật-toán-fuzzy-logic)
- [API bên ngoài sử dụng](#-api-bên-ngoài-sử-dụng)
- [Tác giả](#-tác-giả)
---
 
## ✨ Tính năng nổi bật
 
| Tính năng | Mô tả |
|---|---|
| 🗺️ **Bản đồ tương tác** | Click trực tiếp lên bản đồ để đặt điểm đón / điểm đến |
| 🔍 **Tìm kiếm địa chỉ** | Geocoding thời gian thực qua Nominatim API |
| 🧮 **Fuzzy Logic Pricing** | Tính giá linh hoạt theo traffic (0–100%) và thời tiết (nắng/mưa/bão) |
| 🚗 **Định tuyến thực** | Tuyến đường chính xác qua OSRM — không phải đường thẳng |
| 🎬 **Mô phỏng tài xế** | Marker tài xế di chuyển mượt mà theo đường thực với nội suy tọa độ |
| 🏷️ **Voucher thông minh** | Tự động gợi ý mã giảm giá dựa trên ngữ cảnh (mưa → RAIN20) |
| 💾 **Lưu trữ cục bộ** | Thông tin đăng nhập & lịch sử đánh giá qua LocalStorage |
| 📱 **Responsive** | Giao diện tương thích cả desktop lẫn mobile |
 
---
 
## 🚀 Demo nhanh
 
```
1. Clone repo
2. Mở index.html bằng Live Server (VS Code) hoặc bất kỳ HTTP server nào
3. Chọn điểm đón → điểm đến → Đặt tài xế
```
 
> ⚠️ **Phải chạy qua HTTP server** (Live Server, `python -m http.server`, v.v.) — không mở file:// trực tiếp vì OSRM & Nominatim sẽ bị CORS block.
 
---
 
## 📁 Cấu trúc dự án
 
```
ugo/
├── index.html          # Khung HTML chính, layout header/aside/map/footer
├── style.css           # Toàn bộ style — Dark mode, responsive, component styles
└── js/
    ├── state.js        # Đối tượng state tập trung + utility functions + icon helpers
    ├── map.js          # Khởi tạo Leaflet, marker pickup/dropoff, routing, geocoding
    ├── animation.js    # Giải thuật di chuyển marker tài xế theo tuyến đường thực
    ├── pricing.js      # Fuzzy Logic engine, tính surge, voucher, cập nhật UI giá
    ├── booking.js      # Luồng đặt xe: tìm tài xế → đến điểm đón → chở khách → xong
    ├── storage.js      # Modal helpers, quản lý user (localStorage), lưu rating
    └── app.js          # Wire tất cả event listeners, bootstrap ứng dụng
```
 
---
 
## 🔧 Cài đặt & Chạy
 
### Cách 1: VS Code Live Server (Khuyến nghị)
```bash
# Cài extension Live Server trong VS Code
# Click chuột phải vào index.html → "Open with Live Server"
```
 
### Cách 2: Python HTTP Server
```bash
cd ugo/
python -m http.server 8080
# Mở trình duyệt: http://localhost:8080
```
 
### Cách 3: Node.js serve
```bash
npx serve .
```
 
**Không cần cài đặt dependency** — toàn bộ thư viện ngoài (Leaflet, Google Fonts) được tải qua CDN.
 
---
 
## 🏗️ Kiến trúc & Giải thích module
 
### Luồng dữ liệu tổng thể
 
```
User click map
    │
    ▼
map.js: setPickup() / setDropoff()
    │  └─ cập nhật state.pickup / state.dropoff
    ▼
map.js: tryRoute() ──► OSRM API
    │  └─ nhận coords[], distanceKm, durationMin
    │  └─ vẽ polyline lên bản đồ
    ▼
pricing.js: recalcPrice()
    │  └─ Fuzzy Logic → surge multiplier
    │  └─ cập nhật UI: priceHero, breakdown table
    ▼
booking.js: bookDriver()
    │  └─ tìm tài xế ngẫu nhiên
    │  └─ gọi OSRM cho đường tài xế → pickup
    ▼
animation.js: animateAlongRoad()
    └─ requestAnimationFrame loop → di chuyển marker
```
 
---
 
### `state.js` — Quản lý trạng thái tập trung
 
Object `state` duy nhất lưu **toàn bộ dữ liệu runtime** của app:
 
```javascript
const state = {
  map, pickup, dropoff,          // Bản đồ & tọa độ
  pickupMarker, dropoffMarker,   // Leaflet marker objects
  driverMarker, routeLine,       // Marker tài xế & polyline tuyến đường
  routeCoords[], distanceKm,     // Dữ liệu tuyến từ OSRM
  setMode,                       // 'pickup' | 'dropoff' — mode click map
  booking: { status, driver, animTimer },
  pricing: { vehicle, traffic, weather, surge, voucher, ... }
};
```
 
> **Tại sao dùng global state?** Vì đây là pure-frontend không có framework. Một object tập trung giúp tất cả module (map, pricing, booking, animation) đều đọc/ghi vào cùng một nguồn dữ liệu thay vì truyền props qua lại.
 
---
 
### `map.js` — Bản đồ & Geocoding
 
**Khởi tạo bản đồ:**
```javascript
state.map = L.map('map').setView([10.776, 106.700], 13);  // HCM City
L.tileLayer('https://{s}.tile.openstreetmap.org/...').addTo(state.map);
```
 
**Tìm tuyến đường (OSRM):**
```javascript
async function tryRoute() {
  const url = `https://router.project-osrm.org/route/v1/driving/
               ${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}
               ?overview=full&geometries=geojson`;
  const data = await fetch(url).then(r => r.json());
  state.routeCoords = data.routes[0].geometry.coordinates
                        .map(([lng, lat]) => [lat, lng]); // GeoJSON → Leaflet order
  state.distanceKm  = data.routes[0].distance / 1000;
}
```
 
**Geocoding (tìm địa chỉ → tọa độ):**
```javascript
// Nominatim trả về mảng kết quả, render thành dropdown suggest
const results = await fetch(`https://nominatim.openstreetmap.org/search?
                             format=jsonv2&q=${query}&limit=5&accept-language=vi`);
```
 
---
 
### `pricing.js` — Fuzzy Logic Engine
 
Module quan trọng nhất. Xem phần [Thuật toán Fuzzy Logic](#-thuật-toán-fuzzy-logic) bên dưới.
 
**Công thức giá cơ bản:**
```
subtotal = (base + distKm × perKm) × vehicleFactor × surgeMult
total    = max(0, subtotal − voucherDiscount)
```
 
**Bảng thông số loại xe:**
 
| Loại | Base | Per km | Factor |
|------|------|--------|--------|
| Bike | 5.000đ | 7.000đ | ×1.0 |
| Car  | 10.000đ | 11.000đ | ×1.3 |
| SUV  | 15.000đ | 15.000đ | ×1.6 |
 
---
 
### `animation.js` — Mô phỏng di chuyển mượt mà
 
Thay vì `setInterval` gọi từng giây (giật cục), dự án dùng `requestAnimationFrame` + **nội suy tuyến tính (linear interpolation)**:
 
```javascript
function animateAlongRoad(coords, mps, onDone) {
  const { segs, cum, total } = buildSegs(coords); // Tính độ dài tích lũy từng đoạn
 
  function step(now) {
    const dist = elapsed_seconds * mps;           // Đã đi được bao nhiêu mét
    const i    = findSegment(cum, dist);           // Đang ở đoạn thứ mấy?
    const t    = (dist - cum[i]) / segs[i];        // Bao nhiêu % của đoạn đó?
    const pos  = interpolate(coords[i], coords[i+1], t); // Tọa độ chính xác
    marker.setLatLng(pos);
    requestAnimationFrame(step);
  }
}
```
 
Kết quả: tài xế di chuyển **đúng theo từng ngõ, ngã rẽ** của tuyến đường thực, không phải đường thẳng.
 
---
 
### `booking.js` — Luồng nghiệp vụ đặt xe
 
```
bookDriver()
  │
  ├─ setStatus('Đang tìm') ──► cập nhật step progress bar UI
  ├─ await sleep(600ms) ──► giả lập độ trễ tìm tài xế
  ├─ randomDriver() ──► chọn tài xế từ pool
  │
  ├─ [Phase 1] Tài xế đến điểm đón
  │    osrmRoute(driverStart → pickup) → animateAlongRoad(...)
  │
  └─ [Phase 2] Chở khách đến điểm đến
       animateAlongRoad(state.routeCoords, ...) → setStatus('Đã hoàn tất')
```
 
---
 
## 🧮 Thuật toán Fuzzy Logic
 
Đây là điểm khác biệt của UGo so với hệ thống tính giá cố định thông thường.
 
### Vấn đề với if-else truyền thống
 
```javascript
// ❌ Cứng nhắc — traffic = 49% thì sao?
if (traffic > 70) surge = 1.5;
else if (traffic > 30) surge = 1.2;
else surge = 1.0;
```
 
### Giải pháp: Hàm thành viên mờ
 
Mỗi giá trị traffic **thuộc về nhiều tập mờ cùng lúc** với mức độ khác nhau:
 
```javascript
const muL = clamp((30 - t) / 30, 0, 1);  // Mức độ thuộc tập "Thấp"
const muM = clamp(1 - Math.abs(t - 50) / 20, 0, 1); // Mức độ thuộc "Vừa"
const muH = clamp((t - 70) / 30, 0, 1);  // Mức độ thuộc tập "Cao"
```
 
Ví dụ với `traffic = 40%`:
- muL = 0 (không còn là "Thấp")
- muM = 0.5 (nửa là "Vừa")
- muH = 0 (chưa phải "Cao")
### Kết hợp với thời tiết
 
Mỗi tập giao thông có hệ số surge riêng tùy theo thời tiết:
 
```javascript
const sLow  = 1.0×clear | 1.1×(rain|storm)
const sMed  = 1.2×clear | 1.3×rain | 1.4×storm
const sHigh = 1.5×clear | 1.7×rain | 1.9×storm
```
 
### Defuzzification — ra kết quả cuối
 
```javascript
surge = (muL×sLow + muM×sMed + muH×sHigh) / (muL + muM + muH)
surge = clamp(surge, 1.0, 2.5)
```
 
Kết quả là một số **liên tục, mượt mà** thay vì nhảy bậc — công bằng hơn cho cả tài xế lẫn khách hàng.
 
---
 
## 🌐 API bên ngoài sử dụng
 
| API | Mục đích | Chi phí |
|-----|----------|---------|
| [OpenStreetMap](https://www.openstreetmap.org/) | Tile bản đồ nền | Miễn phí |
| [OSRM](http://project-osrm.org/) | Tính tuyến đường thực tế | Miễn phí |
| [Nominatim](https://nominatim.org/) | Geocoding địa chỉ ↔ tọa độ | Miễn phí |
| [Leaflet.js](https://leafletjs.com/) | Thư viện render bản đồ | Mã nguồn mở |
 
> Tất cả API đều **miễn phí và không cần API key** — phù hợp cho môi trường học thuật và demo.
 
---
 
## 👤 Tác giả
 
**Nguyễn Hoàng Phước** — `31231021201`
 
Đồ án môn học **Trí Tuệ Nhân Tạo** (INT547022)
Trường Công Nghệ và Thiết Kế — Đại học Kinh tế TP.HCM
 
📧 `phuocnguyen.31231021201@st.ueh.edu.vn`
📞 `+84 879 146 749`
 
---
 
<div align="center">
  <sub>© 2026 UGo Technology — Giải pháp di chuyển dành cho UEHer 🎓</sub>
</div>
