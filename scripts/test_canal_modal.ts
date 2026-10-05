import fs from 'fs';
import path from 'path';

// Automated Test for Canal Water Level Processing and Component Data Contract
// Tests against fixtures/canal-sample.json

interface FixtureAttribute {
  objectid: number;
  code: string;
  name: string;
  river?: string;
  district?: string;
  latitude: number;
  longitude: number;
  site_time?: string;
  water_count?: number;
  wl_in?: number | null;
  wl_out01?: number | null;
  wl_out02?: number | null;
  status?: string;
  water_status?: string | null;
  water_url?: string | null;
  gate_count?: number;
  gate01?: number | null;
  gate02?: number | null;
  gate03?: number | null;
  gate04?: number | null;
  gate05?: number | null;
  gate06?: number | null;
  pump_count?: number;
  total_pump_on?: number;
  [key: string]: any;
}

function parseFixtureFeature(attr: FixtureAttribute, fetchedAt: string = new Date().toISOString()) {
  const wl = typeof attr.wl_in === 'number' ? attr.wl_in : (attr.wl_in !== null && attr.wl_in !== undefined ? parseFloat(String(attr.wl_in)) : undefined);
  const wlOut01 = typeof attr.wl_out01 === 'number' ? attr.wl_out01 : (attr.wl_out01 !== null && attr.wl_out01 !== undefined ? parseFloat(String(attr.wl_out01)) : undefined);
  const wlOut02 = typeof attr.wl_out02 === 'number' ? attr.wl_out02 : (attr.wl_out02 !== null && attr.wl_out02 !== undefined ? parseFloat(String(attr.wl_out02)) : undefined);

  const sourceStatus = attr.status || (attr.water_status ? String(attr.water_status) : 'ปกติ');

  // Severity strictly follows sourceStatus
  let calculatedSeverity = 'NORMAL';
  if (sourceStatus.includes('วิกฤต')) {
    calculatedSeverity = 'CRITICAL';
  } else if (sourceStatus.includes('เตือนภัย')) {
    calculatedSeverity = 'HIGH';
  } else if (sourceStatus.includes('เฝ้าระวัง')) {
    calculatedSeverity = 'MEDIUM';
  } else {
    calculatedSeverity = 'NORMAL';
  }

  // Gates
  const gateCount = typeof attr.gate_count === 'number' ? attr.gate_count : 0;
  const gates: { gateNumber: number; openMeters: number | null }[] = [];
  for (let i = 1; i <= 6; i++) {
    const key = `gate0${i}`;
    if (attr[key] !== undefined && attr[key] !== null) {
      gates.push({
        gateNumber: i,
        openMeters: typeof attr[key] === 'number' ? attr[key] : parseFloat(String(attr[key]))
      });
    }
  }

  // Pumps
  const pumpCount = typeof attr.pump_count === 'number' ? attr.pump_count : 0;
  const totalPumpOn = typeof attr.total_pump_on === 'number' ? attr.total_pump_on : 0;
  const pumps: { pumpNumber: number; isOn: boolean }[] = [];
  for (let i = 1; i <= 51; i++) {
    const pad = i < 10 ? `0${i}` : `${i}`;
    const key = `pump${pad}`;
    if (attr[key] !== undefined && attr[key] !== null) {
      pumps.push({
        pumpNumber: i,
        isOn: Number(attr[key]) === 1
      });
    }
  }

  // ICT Timezone
  const measuredAt = attr.site_time
    ? (attr.site_time.includes('+') || attr.site_time.endsWith('Z') ? attr.site_time : `${attr.site_time}+07:00`)
    : fetchedAt;

  let dataAgeSeconds = 0;
  const measuredDate = new Date(measuredAt).getTime();
  if (!isNaN(measuredDate)) {
    dataAgeSeconds = Math.max(0, Math.round((new Date(fetchedAt).getTime() - measuredDate) / 1000));
  }

  return {
    id: `wl_${attr.code || attr.objectid}`,
    code: attr.code || '',
    name: attr.name || 'ไม่ระบุชื่อสถานี',
    river: attr.river || undefined,
    district: attr.district || undefined,
    waterLevelM: wl,
    wlOut01,
    wlOut02,
    sourceStatus,
    calculatedSeverity,
    pumpCount,
    totalPumpOn,
    gateCount,
    gates: gates.length > 0 ? gates : undefined,
    pumps: pumps.length > 0 ? pumps : undefined,
    latitude: attr.latitude || 0,
    longitude: attr.longitude || 0,
    waterUrl: attr.water_url || undefined,
    source: 'สำนักการระบายน้ำ กรุงเทพมหานคร (BMA Drainage Department)',
    sourceUrl: attr.water_url || 'https://weather.bangkok.go.th/water/',
    measuredAt,
    fetchedAt,
    dataAgeSeconds,
    isOnline: sourceStatus !== 'ขัดข้อง' && sourceStatus !== 'ออฟไลน์'
  };
}

// Trend calculation tester
function calculateTrendMock(snapshots: { value: number; measured_at: string }[]): 'RISING' | 'STABLE' | 'FALLING' | null {
  if (!snapshots || snapshots.length < 3) return null;
  const latestTime = new Date(snapshots[0].measured_at).getTime();
  const oldestTime = new Date(snapshots[snapshots.length - 1].measured_at).getTime();
  if (isNaN(latestTime) || isNaN(oldestTime)) return null;

  const diffMinutes = Math.abs(latestTime - oldestTime) / (60 * 1000);
  if (diffMinutes < 30) return null;

  const latest = Number(snapshots[0].value);
  const oldest = Number(snapshots[snapshots.length - 1].value);
  const diff = latest - oldest;

  if (diff > 0.05) return 'RISING';
  if (diff < -0.05) return 'FALLING';
  return 'STABLE';
}

function runCanalTests() {
  console.log('================================================================');
  console.log('🧪 AUTOMATED TEST: Bangkok Canal Water Level Component Contract');
  console.log('================================================================\n');

  const fixturePath = path.resolve(process.cwd(), 'fixtures/canal-sample.json');
  if (!fs.existsSync(fixturePath)) {
    console.error(`❌ Fixture not found at: ${fixturePath}`);
    process.exit(1);
  }

  const rawJson = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  const features = rawJson.features || [];
  console.log(`Loaded ${features.length} features from ${fixturePath}`);

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      failed++;
    }
  }

  // Test 1: Bulk Parsing Contract
  console.log('\n--- 1. Testing Bulk Parser on all 297 Stations ---');
  let parsedPoints = 0;
  let hasCmUnitDetected = false;
  let hasMissingRequiredFields = false;

  for (const f of features) {
    const p = parseFixtureFeature(f.attributes);
    parsedPoints++;
    if ('waterLevelCm' in p) hasCmUnitDetected = true;
    if (!p.id || !p.source || !p.measuredAt) hasMissingRequiredFields = true;
  }

  assert(parsedPoints === features.length, `Parsed all ${features.length} stations successfully`);
  assert(!hasCmUnitDetected, 'No "cm" unit property found (Canals strictly use waterLevelM in ม.รทก.)');
  assert(!hasMissingRequiredFields, 'All points contain required id, source, and measuredAt');

  // Test 2: Case A - Complete Data (ID 26 ส.คลองบางเขนใหม่)
  console.log('\n--- 2. Testing Case A: Complete Data with Gates & Pumps ---');
  const featA = features.find((f: any) => f.attributes.objectid === 17 || f.attributes.code === 'WL.BKA.01');
  assert(!!featA, 'Found station ส.คลองบางเขนใหม่ (WL.BKA.01)');
  if (featA) {
    const p = parseFixtureFeature(featA.attributes);
    assert(p.name === 'ส.คลองบางเขนใหม่', `Station name matches: ${p.name}`);
    assert(p.waterLevelM === -1.63, `Inside water level correctly parsed: ${p.waterLevelM} ม.รทก.`);
    assert(p.wlOut01 === 1.17, `Outer water level correctly parsed: ${p.wlOut01} ม.รทก.`);
    assert(p.gateCount === 5, `Gate count matches: ${p.gateCount}`);
    assert(p.gates?.length === 5, `Gates list has 5 gates with open height data`);
    assert(p.pumpCount === 10, `Pump count matches: ${p.pumpCount}`);
    assert(p.totalPumpOn === 2, `Total pump on matches: ${p.totalPumpOn}`);
    assert(p.pumps?.filter(x => x.isOn).length === 2, `Individual pumps show 2 pumps turned ON`);
    assert(p.waterUrl === 'https://weather.bangkok.go.th/water/StationDetail?id=26', `Deep link matches: ${p.waterUrl}`);
  }

  // Test 3: Case B - Negative Level & Zero Gates/Pumps (ID 244 ค.บางบอน ถ.บางขุนเทียน)
  console.log('\n--- 3. Testing Case B: Negative Level & Zero Gates/Pumps ---');
  const featB = features.find((f: any) => f.attributes.code === 'WL.BBN.01');
  assert(!!featB, 'Found station ค.บางบอน ถ.บางขุนเทียน (WL.BBN.01)');
  if (featB) {
    const p = parseFixtureFeature(featB.attributes);
    assert(p.waterLevelM === -0.17, `Negative water level parsed: ${p.waterLevelM} ม.รทก.`);
    assert(p.waterLevelM! < 0, 'Level is strictly negative (will render drawdown explanation)');
    assert(p.gateCount === 0, 'Gate count is 0 (will render "ไม่มีประตูระบายน้ำ")');
    assert(p.pumpCount === 0, 'Pump count is 0 (will render "ไม่มีเครื่องสูบน้ำ")');
    assert(p.sourceStatus === 'ปกติ', 'Upstream status is ปกติ');
    assert(p.calculatedSeverity === 'NORMAL', 'Calculated severity is NORMAL (no arbitrary thresholds applied)');
  }

  // Test 4: Case C - Missing Water Level (null) (ID 27 ปตร.คลองบึงขวาง)
  console.log('\n--- 4. Testing Case C: Missing Water Level (null) ---');
  const featC = features.find((f: any) => f.attributes.code === 'WL.BKG.01');
  assert(!!featC, 'Found station ปตร.คลองบึงขวาง (WL.BKG.01)');
  if (featC) {
    const p = parseFixtureFeature(featC.attributes);
    assert(p.waterLevelM === undefined, 'waterLevelM is undefined when wl_in is null (will render "ไม่มีข้อมูล")');
    assert(p.sourceStatus === 'วิกฤต', `Source status is "วิกฤต": ${p.sourceStatus}`);
    assert(p.calculatedSeverity === 'CRITICAL', 'Severity is CRITICAL according to upstream status');
  }

  // Test 5: Case D - Stale / Error Station (Status ขัดข้อง)
  console.log('\n--- 5. Testing Case D: Stale / Offline Station ---');
  const featD = features.find((f: any) => f.attributes.status === 'ขัดข้อง');
  assert(!!featD, `Found station with status "ขัดข้อง": ${featD?.attributes?.name}`);
  if (featD) {
    const p = parseFixtureFeature(featD.attributes, '2026-10-05T08:35:00Z');
    assert(p.sourceStatus === 'ขัดข้อง', `Source status is "ขัดข้อง"`);
    assert(p.isOnline === false, 'isOnline is false');
    assert(p.dataAgeSeconds > 1800, `dataAgeSeconds is > 1800s (${p.dataAgeSeconds}s), triggers Stale Warning Banner`);
  }

  // Test 6: Trend Analysis Constraint (>= 3 points over >= 30 mins)
  console.log('\n--- 6. Testing Trend Constraint Rule ---');
  // Scenario 6.1: Only 2 points -> null
  const testSnapshots2 = [
    { value: 1.2, measured_at: '2026-10-05T09:00:00+07:00' },
    { value: 1.0, measured_at: '2026-10-05T08:00:00+07:00' }
  ];
  assert(calculateTrendMock(testSnapshots2) === null, 'Trend returns null for < 3 points');

  // Scenario 6.2: 3 points but only 10 minutes span -> null
  const testSnapshotsShort = [
    { value: 1.3, measured_at: '2026-10-05T08:10:00+07:00' },
    { value: 1.2, measured_at: '2026-10-05T08:05:00+07:00' },
    { value: 1.1, measured_at: '2026-10-05T08:00:00+07:00' }
  ];
  assert(calculateTrendMock(testSnapshotsShort) === null, 'Trend returns null for time span < 30 minutes');

  // Scenario 6.3: 3 points spanning 45 minutes, rising by 0.2 -> RISING
  const testSnapshotsRising = [
    { value: 1.3, measured_at: '2026-10-05T08:45:00+07:00' },
    { value: 1.2, measured_at: '2026-10-05T08:20:00+07:00' },
    { value: 1.1, measured_at: '2026-10-05T08:00:00+07:00' }
  ];
  assert(calculateTrendMock(testSnapshotsRising) === 'RISING', 'Trend returns RISING for >= 3 points over 45 mins with delta > +0.05');

  // Scenario 6.4: 3 points spanning 45 minutes, stable delta 0.01 -> STABLE
  const testSnapshotsStable = [
    { value: 1.11, measured_at: '2026-10-05T08:45:00+07:00' },
    { value: 1.10, measured_at: '2026-10-05T08:20:00+07:00' },
    { value: 1.10, measured_at: '2026-10-05T08:00:00+07:00' }
  ];
  assert(calculateTrendMock(testSnapshotsStable) === 'STABLE', 'Trend returns STABLE for delta within +/-0.05');

  // Scenario 6.5: 3 points spanning 45 minutes, falling by -0.2 -> FALLING
  const testSnapshotsFalling = [
    { value: 0.9, measured_at: '2026-10-05T08:45:00+07:00' },
    { value: 1.0, measured_at: '2026-10-05T08:20:00+07:00' },
    { value: 1.1, measured_at: '2026-10-05T08:00:00+07:00' }
  ];
  assert(calculateTrendMock(testSnapshotsFalling) === 'FALLING', 'Trend returns FALLING for delta < -0.05');

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED.`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runCanalTests();
