# Bangkok Flood Monitor (ระบบติดตามสถานการณ์น้ำท่วมกรุงเทพมหานครแบบ Real-time)

เว็บแอปพลิเคชันสำหรับติดตามและเฝ้าระวังสถานการณ์น้ำท่วมในกรุงเทพมหานครแบบ Real-time โดยดึงข้อมูลจริงจากระบบของกรุงเทพมหานคร (BMA) และสำนักการระบายน้ำ (DDS) รวมข้อมูลทั้งหมดไว้ในหน้าเดียว:

1. **จุดตรวจวัดน้ำท่วมถนน (252 สถานี)**: แสดงระดับน้ำท่วมขัง (ซม.), พิกัด, สถานะอุปกรณ์
2. **ระดับน้ำในคลองและประตูระบายน้ำ (297 สถานี)**: แสดงระดับน้ำ (ม.รทก.), การเดินเครื่องสูบน้ำ, ชื่อคลอง
3. **สถานีตรวจวัดปริมาณฝน (131 สถานี)**: ปริมาณฝนสะสม (5 นาที, 15 นาที, 1 ชม., 3 ชม., 24 ชม.)
4. **กล้อง CCTV สาธารณะของหน่วยงานรัฐ (619 ตัว)**: ภาพ Snapshot สดรีเฟรชอัตโนมัติ, เครื่องเล่นวิดีโอ และลิงก์ไปยังเว็บต้นทาง
5. **แผนที่กรุงเทพมหานครแบบ Interactive (MapLibre GL JS)**: พร้อมเลเยอร์แนวเขต 50 เขต และโครงข่ายคลอง กทม.
6. **ประวัติและแนวโน้มระดับน้ำ**: เก็บ Time-series Snapshots ลงฐานข้อมูล SQLite พร้อมกราฟย้อนหลังและคำนวณแนวโน้ม (RISING / STABLE / FALLING)
7. **ระบบแจ้งเตือนและจัดอันดับความรุนแรง**: CRITICAL, HIGH, MEDIUM, LOW โดยแยกชัดเจนระหว่าง Source Status และ Calculated Severity
8. **ระบบค้นหาและฟังก์ชัน "ใกล้ฉัน" (Near Me)**: ค้นหาตามเขต/ถนน และวิเคราะห์ความเสี่ยงรอบตัวผู้ใช้ในรัศมี 1 - 5 กม.
9. **หน้าตรวจสอบระบบ (/system)**: ดูสถานะ Latency, Record Count, HTTP Status ของแต่ละ Data Source แบบสด

---

## 1. Data Sources & Verified Endpoints

ระบบเชื่อมต่อกับข้อมูลสาธารณะจริง **100% Real Public Data** (ไม่มีข้อมูลจำลองใน Production):

| บริการ / Data Source | แหล่งข้อมูลทางการ | Endpoint จริงที่ใช้งาน | จำนวนข้อมูล |
| :--- | :--- | :--- | :--- |
| **จุดวัดน้ำท่วมถนน** | สำนักการระบายน้ำ กทม. (BMA SEDGIS) | `Hosted/สถานีวัดน้ำท่วมถนน_252/FeatureServer/0/query` | **252 สถานี** |
| **ระดับน้ำในคลอง** | สำนักการระบายน้ำ กทม. (BMA SEDGIS) | `Hosted/waterlevel_297/FeatureServer/0/query` | **297 สถานี** |
| **สถานีวัดปริมาณฝน** | สำนักการระบายน้ำ กทม. (BMA SEDGIS) | `Hosted/สถานีวัดปริมาณน้ำฝน/FeatureServer/0/query` | **131 สถานี** |
| **กล้อง CCTV จราจร** | สำนักการจราจรและขนส่ง กทม. (BMA Traffic) | `http://www.bmatraffic.com/show.aspx?image={id}` | **518 กล้อง** |
| **กล้อง CCTV น้ำท่วม** | ศูนย์ควบคุมน้ำท่วม กทม. (Directus API) | `floodbangkok.bangkok.go.th/.../camera_profile` | **101 กล้อง** |
| **การแจ้งเตือนน้ำท่วม** | ระบบตรวจวัดน้ำท่วมถนน (Directus API) | `floodbangkok.bangkok.go.th/.../flood_notification` | **50 เหตุการณ์** |
| **แนวเขต 50 เขต** | BMA GIS Portal | `Hosted/bma_district/FeatureServer/0/query` | **50 เขต (Polygons)** |
| **โครงข่ายคลอง** | BMA GIS Portal | `Hosted/canal_dds_gdb/FeatureServer/0/query` | **คลอง กทม. (Polylines)** |
| **สภาพอากาศและกลุ่มฝน**| Open-Meteo Weather Platform | `api.open-meteo.com/v1/forecast` (Bangkok) | อุณหภูมิ, ความชื้น, ลม, ฝน |

---

## 2. สถาปัตยกรรมระบบ (System Architecture)

เพื่อป้องกันไม่ให้เบราว์เซอร์ของผู้ใช้ยิง Request ซ้ำๆ ไปยังเซิร์ฟเวอร์ของหน่วยงานราชการ ระบบจึงใช้ **Backend Aggregator Pattern**:

```text
Public Data Sources (BMA SEDGIS / Directus / BMA Traffic)
                        │
                        ▼ (ดึงข้อมูลตามรอบ Config เช่น ทุก 30 วินาที)
           Backend Aggregator Service
         ├── Data Normalizers & Sanitizers
         ├── Stale Data Detection (LIVE / DELAYED / OFFLINE)
         ├── Persistent Memory Cache
         └── Native SQLite Time-series Storage
                        │
                        ▼ (ส่งต่อผ่าน REST API)
           Web Application (React + MapLibre GL)
```

- **Upstream Protection**: ผู้ใช้หลายร้อยคนเปิดหน้าเว็บพร้อมกัน เบราว์เซอร์จะร้องขอข้อมูลจาก Backend Aggregator เท่านั้น ไม่ได้ยิงตรงไปยังเซิร์ฟเวอร์ของ กทม.
- **Graceful Degradation**: หาก API ต้นทางขัดข้องหรือเน็ตเวิร์กหน่วง ระบบจะสลับไปใช้ Cached Data ล่าสุดอัตโนมัติ พร้อมแจ้งเตือนผู้ใช้ว่า `"กำลังแสดงข้อมูลล่าสุดในแคช"`
- **SSRF Protection**: Proxy ของ CCTV มีการตรวจสอบ Host Allowlist เฉพาะโดเมนทางการของ กทม. และไม่อนุญาตให้ Forward Request ไปยังที่อื่น

---

## 3. โครงสร้างโปรเจกต์ (Project Structure)

```text
flood_water/
├── backend/
│   ├── src/
│   │   ├── index.ts               # Express Server & Route Configuration
│   │   ├── config.ts              # การตั้งค่า Environment
│   │   ├── types/models.ts        # มาตรฐาน Data Schema กลาง
│   │   ├── adapters/              # Data Adapters แยกแต่ละแหล่งข้อมูล
│   │   │   ├── BaseAdapter.ts
│   │   │   ├── BangkokFloodAdapter.ts
│   │   │   ├── BangkokWaterLevelAdapter.ts
│   │   │   ├── BangkokRainfallAdapter.ts
│   │   │   ├── BangkokCCTVAdapter.ts
│   │   │   ├── BangkokAlertAdapter.ts
│   │   │   ├── BangkokGISAdapter.ts
│   │   │   └── WeatherAdapter.ts
│   │   ├── services/
│   │   │   ├── AggregatorService.ts  # ตัวจัดการ Polling, Cache, และสถานะระบบ
│   │   │   └── NearbyService.ts      # คำนวณระยะทาง Haversine รัศมี 1-5 กม.
│   │   ├── database/
│   │   │   ├── db.ts                 # การเชื่อมต่อ SQLite (Built-in Node.js)
│   │   │   ├── schema.sql            # ตาราง Snapshots และ Cached Sources
│   │   │   └── repository.ts         # Repository Pattern (รองรับสลับเป็น PostgreSQL)
│   │   └── routes/                   # REST API Endpoints
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx            # Header, LIVE beacon, ธีมมืด/สว่าง
│   │   │   ├── MetricCards.tsx       # การ์ดสรุปตัวเลขสถิติ
│   │   │   ├── MapView.tsx           # แผนที่ MapLibre GL JS และ Marker
│   │   │   ├── LayerControl.tsx      # ตัวเปิด/ปิด Layer แผนที่
│   │   │   ├── SearchBox.tsx         # ค้นหาเขตและถนนในกรุงเทพฯ
│   │   │   ├── NearMePanel.tsx       # แผงวิเคราะห์สถานการณ์ "ใกล้ฉัน"
│   │   │   ├── StationModal.tsx      # หน้ารายละเอียดสถานี + กราฟประวัติ Recharts
│   │   │   ├── CCTVModal.tsx         # เครื่องเล่นและภาพสด CCTV
│   │   │   ├── AlertFeed.tsx         # รายการแจ้งเตือนจัดอันดับความรุนแรง
│   │   │   └── SystemStatusModal.tsx # หน้าตรวจสอบสถานะ API และ Health Check
│   │   ├── hooks/
│   │   │   ├── usePolling.ts         # Hook ดึงข้อมูลอัตโนมัติตามช่วงเวลา
│   │   │   └── useGeolocation.ts     # Hook จัดการพิกัด GPS ผู้ใช้
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── Dockerfile
├── database/                         # ที่เก็บไฟล์ฐานข้อมูล SQLite
├── scripts/
│   └── test_adapters.ts              # Script ทดสอบ Data Adapters ทุกตัว
├── docker-compose.yml
├── .env.example
├── package.json
└── README.md
```

---

## 4. ข้อกำหนดและการติดตั้ง (Installation)

### ความต้องการของระบบ:
- **Node.js**: เวอร์ชัน 20.x ขึ้นไป (แนะนำ Node.js 22 หรือ 24)
- **npm**: เวอร์ชัน 10.x ขึ้นไป

### ขั้นตอนการติดตั้ง:

1. Clone โปรเจกต์:
```bash
git clone <repository-url>
cd flood_water
```

2. ติดตั้ง Dependencies:
```bash
# ติดตั้ง root dependencies
npm install

# ติดตั้ง backend dependencies
cd backend && npm install && cd ..

# ติดตั้ง frontend dependencies
cd frontend && npm install && cd ..
```

3. สร้างไฟล์ `.env`:
```bash
cp .env.example .env
```

---

## 5. การรันระบบ (Running Application)

### แบบที่ 1: รัน Development Mode
เปิดใช้งานทั้ง Backend (พอร์ต 5001) และ Frontend (พอร์ต 5173) พร้อมกันด้วยคำสั่งเดียว:
```bash
npm run dev
```
เปิดเบราว์เซอร์ไปที่: `http://localhost:5173`

### แบบที่ 2: รัน Production Build
```bash
# Build ระบบทั้งสองส่วน
npm run build

# รัน Production Server บนพอร์ต 5001 (Backend ทำหน้าที่เสิร์ฟทั้ง API และหน้าเว็บ Frontend SPA)
npm run start
```
เปิดเบราว์เซอร์ไปที่: `http://localhost:5001`

### แบบที่ 3: รันด้วย Docker Compose
```bash
docker compose up -d
```
- Frontend เข้าใช้งานได้ที่: `http://localhost:3000`
- Backend API เข้าใช้งานได้ที่: `http://localhost:5001`

---

## 6. การทดสอบระบบ (Testing)

ทดสอบการเชื่อมต่อ API ของหน่วยงานรัฐทุก Data Adapter แบบอัตโนมัติ:
```bash
npm run test
```
ผลลัพธ์จะทำการยิงทดสอบไปยัง official endpoints ทั้ง 6 แหล่งข้อมูล และสรุปผลสถานะ (Passed / Failed), จำนวนเรคคอร์ดที่ได้รับ และ Latency ในหน่วยมิลลิวินาที

---

## 7. รายละเอียด REST API Endpoints

| Method | Endpoint | รายละเอียด |
| :--- | :--- | :--- |
| `GET` | `/api/flood-points` | รายการจุดตรวจวัดน้ำท่วมถนนทั้งหมด 252 จุด |
| `GET` | `/api/flood-points/:id` | ข้อมูลเฉพาะจุดตรวจวัดน้ำท่วมถนน |
| `GET` | `/api/water-levels` | รายการสถานีวัดระดับน้ำในคลอง/ปตร. 297 แห่ง |
| `GET` | `/api/water-levels/:id` | ข้อมูลสถานีวัดระดับน้ำในคลอง |
| `GET` | `/api/water-levels/:id/history?hours=24` | ข้อมูลประวัติระดับน้ำย้อนหลังสำหรับทำกราฟ |
| `GET` | `/api/rainfall` | รายการสถานีวัดปริมาณน้ำฝน 131 สถานี |
| `GET` | `/api/cctv` | รายการกล้อง CCTV ทั้งหมด 619 ตัว |
| `GET` | `/api/cctv/proxy-image?url=...` | Proxy ดึงภาพ JPEG Snapshot ป้องกัน Mixed-Content |
| `GET` | `/api/flood-alerts` | รายการแจ้งเตือนเหตุการณ์น้ำท่วมจัดอันดับตามความรุนแรง |
| `GET` | `/api/nearby?lat=...&lng=...` | วิเคราะห์สถานการณ์น้ำท่วม, ฝน, CCTV รอบพิกัดที่ระบุ |
| `GET` | `/api/weather` | สภาพอากาศกรุงเทพฯ ปัจจุบัน (อุณหภูมิ, ความชื้น, กลุ่มฝน) |
| `GET` | `/api/system/status` | สถานะสุขภาพของแต่ละ Adapter, Uptime, Memory, Polling cycle |
| `GET` | `/api/sources` | รายการ Data Source และ Latency |
| `POST`| `/api/system/refresh` | สั่งให้ Aggregator ทำการดึงข้อมูลสดใหม่ทันที |
| `GET` | `/api/gis/districts` | GeoJSON ขอบเขต 50 เขตกรุงเทพมหานคร |
| `GET` | `/api/gis/canals` | GeoJSON เส้นโครงข่ายคลองระบายน้ำ กทม. |

---

## 8. เกณฑ์การจัดอันดับระดับความรุนแรง (Severity Criteria)

เพื่อให้การตีความข้อมูลถูกต้องและไม่คลาดเคลื่อน ระบบแสดงทั้ง **Source Status** (สถานะดั้งเดิมจากหน่วยงาน) ควบคู่กับ **Calculated Severity** ตามเกณฑ์ดังนี้:

| ระดับความรุนแรง | เกณฑ์ระดับน้ำท่วมถนน (cm) | สีและสัญลักษณ์ |
| :--- | :--- | :--- |
| **NORMAL (ปกติ)** | 0 ซม. | สีเขียว (จุดตรวจวัดทำงานปกติ ไม่มีน้ำท่วมขัง) |
| **LOW (น้ำขังเล็กน้อย)** | 1 - 5 ซม. | สีเหลือง (น้ำขังรอการระบาย รถทุกชนิดสัญจรได้) |
| **MEDIUM (น้ำท่วมขัง)** | 6 - 15 ซม. | สีส้ม (เริ่มมีผลกระทบต่อช่องจราจรซ้ายสุด) |
| **HIGH (น้ำท่วมสูง)** | 16 - 30 ซม. | สีแดง (น้ำท่วมผิวจราจร รถเล็กควรหลีกเลี่ยง) |
| **CRITICAL (วิกฤต)** | มากกว่า 30 ซม. | สีม่วง (น้ำท่วมสูงมาก รถเล็กห้ามผ่าน) |

---

## 9. ความปลอดภัยและการปกป้องข้อมูล (Security)

1. **ไม่เก็บพิกัดส่วนตัว**: ฟังก์ชัน "ใกล้ฉัน" ประมวลผลบนเบราว์เซอร์และส่งพิกัดเฉพาะตอนขอระยะทาง โดยไม่มีการบันทึก Log พิกัดผู้ใช้ลงฐานข้อมูล
2. **ไม่บายพาสความปลอดภัย**: ใช้เฉพาะกล้อง CCTV และข้อมูลที่ กทม. เปิดเผยต่อสาธารณะเท่านั้น ไม่มีการพยายามเจาะระบบหรือข้ามการยืนยันตัวตน
3. **SSRF Allowlist**: Endpoint `/api/cctv/proxy-image` มีการตรวจสอบชื่อ Hostname อย่างเข้มงวด อนุญาตเฉพาะโดเมนทางการของ กทม. เท่านั้น
4. **Rate Limiting**: มีการจำกัดความถี่คำขอด้วย `express-rate-limit` เพื่อป้องกัน Bot ยิงโจมตีเซิร์ฟเวอร์

---

## 10. ข้อจำกัดของ CCTV และช่องทางติดต่อ สจส. กทม. (CCTV Limitations & Official Contacts)

### ข้อจำกัดตามความเป็นจริงของระบบกล้อง CCTV
1. **ระบบภาพ Snapshot ของ BMA Traffic (`show.aspx?image=ID`)**:
   - เมื่อร้องขอภาพจากภายนอกโดยไม่มีเซสชันหรือสิทธิ์เฉพาะ เซิร์ฟเวอร์ต้นทางของ กทม. (`bmatraffic.com`) ตอบกลับเป็นไฟล์ภาพ PNG สีขาวล้วนขนาดประมาณ 1.3 - 1.4 KB แทนภาพการจราจรจริง
   - เพื่อเคารพระบบของต้นทางและไม่สร้างภาระให้เซิร์ฟเวอร์ ระบบจะไม่พยายามปลอมแปลง Header (Referer, Cookie, Session, User-Agent) หรือหมุนเวียน IP เพื่อดึงภาพ
   - หากตรวจพบว่ากล้องส่งภาพว่างเปล่า ระบบจะตัดการรีเฟรชอัตโนมัติของกล้องตัวนั้นทันที และแสดงเครื่องหมาย *"ต้นทางไม่ส่งภาพให้แอปนี้"*
2. **การฝังเครื่องเล่นผ่าน iframe (`PlayVideo.aspx`)**:
   - เครื่องเล่นวิดีโอของ กทม. สามารถเปิดรับชมได้ตามปกติผ่านเบราว์เซอร์โดยตรง แต่เมื่อฝังเป็น iframe ข้ามเว็บไซต์ (Cross-origin) อาจติดข้อจำกัดด้านความปลอดภัยของเบราว์เซอร์ (Mixed Content HTTP/HTTPS หรือ Sandbox restrictions)
   - ตามนโยบาย Same-Origin Policy เบราว์เซอร์ภายนอกไม่สามารถตรวจสอบเนื้อหาภายใน iframe ข้ามโดเมนได้ ระบบจึงแจ้งเตือนอย่างชัดเจนว่า *"ไม่สามารถตรวจสอบได้ว่าภาพขึ้นหรือไม่ ถ้าเห็นกล่องว่าง ให้เปิดเว็บต้นทาง"*
3. **ช่องทางหลักในการรับชม (Primary Channel)**:
   - ระบบตั้งปุ่ม **"เปิดกล้องจากเว็บไซต์ต้นทาง (แท็บใหม่)"** เป็นช่องทางหลักสำหรับกล้องทุกตัว โดยการแสดงผลในหน้าเว็บทำหน้าที่เป็นเพียงช่องทางเสริม

### ช่องทางติดต่อ สจส. กทม. และ Bangkok Open Data สำหรับการขอ API
ปัจจุบันกรุงเทพมหานครยังไม่มี Public API แบบเปิดสำหรับดึง Raw Video Stream หรือ Snapshot ของกล้องจราจรและกล้องตรวจน้ำท่วมโดยตรง สำหรับนักพัฒนา หน่วยงาน หรือประชาชนที่ต้องการข้อมูลภาพ สามารถประสานงานผ่านช่องทางทางการได้ดังนี้:
* **Bangkok Open Data Portal**: [https://data.bangkok.go.th/](https://data.bangkok.go.th/)
* **สำนักการจราจรและขนส่ง กรุงเทพมหานคร (สจส.)**:
  * เว็บไซต์ทางการ: [http://www.bmatraffic.com](http://www.bmatraffic.com) หรือ [https://traffic.bangkok.go.th/](https://traffic.bangkok.go.th/)
  * โทรศัพท์: 0 2354 1234
  * เพจเฟซบุ๊ก: สำนักการจราจรและขนส่ง กรุงเทพมหานคร
* **ศูนย์บริหารจัดการกล้อง CCTV กรุงเทพมหานคร (สำหรับการขอคัดลอกไฟล์ภาพเหตุการณ์)**:
  * เว็บไซต์ออนไลน์ 24 ชม.: [https://cctv.bangkok.go.th/](https://cctv.bangkok.go.th/)
  * LINE Official: `@CCTVBANGKOK`

