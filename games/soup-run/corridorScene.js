/**
 * @file corridorScene.js
 * @description Khung cảnh 3D Hành Lang Quán Phở Sài Gòn (Saigon Pho Eatery Corridor) ấm cúng, đậm chất Nam Bộ:
 * - Sàn gỗ sồi tối màu bản rộng với rãnh ghép mộc mạc, không gian ấm áp ánh đèn lồng đồng.
 * - Tường vách gỗ ốp lửng, treo bảng hiệu hoài niệm: "PHỞ BÒ GIA TRUYỀN", "BÒ VIÊN NẠM GẦU".
 * - Bàn ghế gỗ hai bên với hũ tương đen, tương ớt, dấm tỏi, ống đũa gỗ.
 * - Vật phẩm thưởng: Đĩa quẩy giòn tại 11m (+10k Tiền boa), Chén tương chấm Nam Bộ tại 29m (+15k Tiền boa).
 * - Mô hình 3D chướng ngại vật:
 *   + 10m: Chú mèo mập tam thể ngủ cuộn tròn trên chiếu cói.
 *   + 21m: Vết sàn ướt bóng loáng kèm biển chữ A "CHÚ Ý SÀN ƯỚT" lệch trái.
 *   + 32m: Chiếc quạt cây cổ điển màu xanh lá thổi gió tạt sang phải.
 *   + 42m: Cục gạch Lego sắc nhọn màu đỏ lệch phải.
 *   + 50m (Đích): Bàn VIP số 9 với thực khách đang cầm sẵn đũa chờ đón tô phở nóng!
 */

import * as THREE from '../../shared/vendor/three.module.js';

export function createCorridorScene() {
  const sceneGroup = new THREE.Group();
  sceneGroup.name = 'saigon-pho-corridor';

  // 1. SÀN GỖ QUÁN ĂN BẢN RỘNG (4m x 62m)
  const floorGeo = new THREE.PlaneGeometry(3.8, 62, 1, 1);
  floorGeo.rotateX(-Math.PI / 2);

  const floorCanvas = document.createElement('canvas');
  floorCanvas.width = 512;
  floorCanvas.height = 512;
  const fctx = floorCanvas.getContext('2d');
  fctx.fillStyle = '#3a2010';
  fctx.fillRect(0, 0, 512, 512);

  // Đường rãnh ván sàn chạy dọc
  for (let x = 0; x < 512; x += 64) {
    fctx.fillStyle = '#221208';
    fctx.fillRect(x, 0, 3, 512);
    for (let y = 32; y < 512; y += 128) {
      fctx.fillStyle = '#170c05';
      fctx.beginPath();
      fctx.arc(x + 12, y, 2.5, 0, Math.PI * 2);
      fctx.arc(x + 52, y, 2.5, 0, Math.PI * 2);
      fctx.fill();
    }
  }

  const floorTex = new THREE.CanvasTexture(floorCanvas);
  floorTex.wrapS = THREE.RepeatWrapping;
  floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(2, 16);

  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTex,
    roughness: 0.38,
    metalness: 0.05,
  });

  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.position.set(0, 0, 26);
  floorMesh.receiveShadow = true;
  sceneGroup.add(floorMesh);

  // Gờ chân tường gỗ viền 2 bên
  const baseboardMat = new THREE.MeshStandardMaterial({ color: 0x221208, roughness: 0.5 });
  const bbLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 62), baseboardMat);
  bbLeft.position.set(-1.9, 0.11, 26);
  const bbRight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 62), baseboardMat);
  bbRight.position.set(1.9, 0.11, 26);
  sceneGroup.add(bbLeft, bbRight);

  // 2. VÁCH TƯỜNG QUÁN ĂN (Tường vôi vàng ấm & ốp gỗ lửng)
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xede4d3, roughness: 0.85, side: THREE.DoubleSide });
  const wainscotMat = new THREE.MeshStandardMaterial({ color: 0x5c3317, roughness: 0.55, side: THREE.DoubleSide });

  // Vách trái
  const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.2, 62), wallMat);
  wallLeft.position.set(-1.95, 1.6, 26);
  const wainscotLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 62), wainscotMat);
  wainscotLeft.position.set(-1.94, 0.55, 26);
  sceneGroup.add(wallLeft, wainscotLeft);

  // Vách phải
  const wallRight = wallLeft.clone();
  wallRight.position.x = 1.95;
  const wainscotRight = wainscotLeft.clone();
  wainscotRight.position.x = 1.94;
  sceneGroup.add(wallRight, wainscotRight);

  // 3. HÀNG ĐÈN LỒNG ĐỒNG CHIẾU SÁNG ẤM CÚNG (Cứ mỗi 6.5m một bóng)
  const lanternGeo = new THREE.CylinderGeometry(0.18, 0.12, 0.25, 8);
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    roughness: 0.35,
    metalness: 0.8,
  });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

  for (let z = 2.0; z <= 52.0; z += 6.5) {
    const lantern = new THREE.Mesh(lanternGeo, lanternMat);
    lantern.position.set(0, 2.7, z);

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), bulbMat);
    bulb.position.y = -0.1;
    lantern.add(bulb);

    const light = new THREE.PointLight(0xffedd5, 0.85, 9.0, 1.2);
    light.position.set(0, 2.5, z);
    sceneGroup.add(lantern, light);
  }

  // 4. BÀN ĂN & VẬT PHẨM THƯỞNG HAI BÊN HÀNH LANG
  const tableMat = new THREE.MeshStandardMaterial({ color: 0x45230e, roughness: 0.4 });
  const tablePositions = [
    { x: -1.4, z: 6.0 },
    { x: 1.4, z: 16.0 },
    { x: -1.4, z: 28.0 },
    { x: 1.4, z: 38.0 },
  ];

  tablePositions.forEach((tp) => {
    const tableGroup = new THREE.Group();
    tableGroup.position.set(tp.x, 0, tp.z);

    const top = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 1.1), tableMat);
    top.position.y = 0.72;
    top.castShadow = true;
    tableGroup.add(top);

    const legGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.7, 8);
    for (const dx of [-0.28, 0.28]) {
      for (const dz of [-0.45, 0.45]) {
        const leg = new THREE.Mesh(legGeo, tableMat);
        leg.position.set(dx, 0.35, dz);
        tableGroup.add(leg);
      }
    }

    sceneGroup.add(tableGroup);
  });

  // Vật phẩm thưởng: Đĩa Quẩy Giòn tại 11m (+Tiền boa)
  const pickups = [];

  const quayGroup = new THREE.Group();
  quayGroup.position.set(-0.85, 0.45, 11.0);
  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.14, 0.02, 16),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })
  );
  quayGroup.add(plate);

  const quayMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.65 });
  const quayGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.24, 8);
  quayGeo.rotateZ(Math.PI / 2);
  for (let i = 0; i < 3; i++) {
    const qMesh = new THREE.Mesh(quayGeo, quayMat);
    qMesh.position.set(0, 0.025 + i * 0.022, (i - 1) * 0.05);
    quayGroup.add(qMesh);
  }
  sceneGroup.add(quayGroup);
  pickups.push({ id: 'quay', group: quayGroup, z: 11.0, x: -0.85, tip: 10000, collected: false });

  // 5. CÁC MÔ HÌNH CHƯỚNG NGẠI VẬT
  const obstacleMeshes = {};

  // 5.1. TẠI 10M: MÈO MẬP TAM THỂ (Nằm ngay trục giữa)
  const catGroup = new THREE.Group();
  catGroup.position.set(0, 0, 10.0);

  const matGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.02, 20);
  const matMesh = new THREE.Mesh(matGeo, new THREE.MeshStandardMaterial({ color: 0xd4b982, roughness: 0.9 }));
  matMesh.position.y = 0.01;
  catGroup.add(matMesh);

  const catBodyMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.75 });
  const catBodyGeo = new THREE.SphereGeometry(0.18, 16, 14);
  catBodyGeo.scale(1.2, 0.85, 1.0);
  const catBody = new THREE.Mesh(catBodyGeo, catBodyMat);
  catBody.position.y = 0.15;
  catBody.castShadow = true;
  catGroup.add(catBody);

  const catHead = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 12), catBodyMat);
  catHead.position.set(0.16, 0.17, 0.04);
  catGroup.add(catHead);

  sceneGroup.add(catGroup);
  obstacleMeshes.cat = { group: catGroup, head: catHead };

  // 5.2. TẠI 21M: VẾT SÀN ƯỚT (Lệch trái X = -0.45m)
  const puddleGroup = new THREE.Group();
  puddleGroup.position.set(-0.45, 0, 21.0);

  const puddleGeo = new THREE.CircleGeometry(0.95, 24);
  puddleGeo.rotateX(-Math.PI / 2);
  const puddleMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.05,
    metalness: 0.25,
    transparent: true,
    opacity: 0.45,
  });
  const puddleMesh = new THREE.Mesh(puddleGeo, puddleMat);
  puddleMesh.position.y = 0.003;
  puddleGroup.add(puddleMesh);

  const signGroup = new THREE.Group();
  signGroup.position.set(-0.6, 0, 0);
  const signMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
  const signFront = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.55, 0.025), signMat);
  signFront.position.set(0, 0.27, 0.08);
  signFront.rotation.x = 0.25;
  const signBack = signFront.clone();
  signBack.position.z = -0.08;
  signBack.rotation.x = -0.25;
  signGroup.add(signFront, signBack);
  puddleGroup.add(signGroup);

  sceneGroup.add(puddleGroup);
  obstacleMeshes.puddle = { group: puddleGroup };

  // 5.3. TẠI 32M: QUẠT CÂY THỔI GIÓ (Lệch trái X = -1.25m)
  const fanGroup = new THREE.Group();
  fanGroup.position.set(-1.25, 0, 32.0);

  const fanGreenMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.35 });
  const fanMetalMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.2, metalness: 0.8 });

  const fanBase = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.06, 16), fanGreenMat);
  fanBase.position.y = 0.03;
  fanGroup.add(fanBase);

  const fanPole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.1, 10), fanMetalMat);
  fanPole.position.y = 0.58;
  fanGroup.add(fanPole);

  const fanHead = new THREE.Group();
  fanHead.position.set(0, 1.15, 0);
  fanHead.rotation.y = Math.PI / 4;

  const fanCage = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.015, 8, 20), fanMetalMat);
  fanHead.add(fanCage);

  const bladeGroup = new THREE.Group();
  const bladeGeo = new THREE.BoxGeometry(0.06, 0.23, 0.005);
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(bladeGeo, fanGreenMat);
    blade.position.y = 0.11;
    blade.rotation.z = (i / 3) * Math.PI * 2;
    bladeGroup.add(blade);
  }
  fanHead.add(bladeGroup);
  fanGroup.add(fanHead);

  sceneGroup.add(fanGroup);
  obstacleMeshes.fan = { group: fanGroup, bladeGroup };

  // 5.4. TẠI 42M: CỤC LEGO ĐỎ NHỌN (Lệch phải X = +0.35m)
  const legoGroup = new THREE.Group();
  legoGroup.position.set(0.35, 0, 42.0);

  const legoMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 });
  const brick = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 0.09), legoMat);
  brick.position.y = 0.035;
  brick.rotation.y = 0.45;
  legoGroup.add(brick);

  sceneGroup.add(legoGroup);
  obstacleMeshes.lego = { group: legoGroup };

  // 5.5. TẠI 50M (ĐÍCH ĐẾN): BÀN VIP SỐ 9 & THỰC KHÁCH CHỜ PHỞ
  const goalGroup = new THREE.Group();
  goalGroup.position.set(0, 0, 50.0);

  const goalTable = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.06, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x582d12, roughness: 0.35 })
  );
  goalTable.position.set(0, 0.72, 0.6);
  goalGroup.add(goalTable);

  const placemat = new THREE.Mesh(
    new THREE.BoxGeometry(0.58, 0.005, 0.48),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.8 })
  );
  placemat.position.set(0, 0.753, 0.45);
  goalGroup.add(placemat);

  const dinerGroup = new THREE.Group();
  dinerGroup.position.set(0, 0, 1.45);

  const dinerShirtMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.6 });
  const dinerSkinMat = new THREE.MeshStandardMaterial({ color: 0xe0a97c, roughness: 0.5 });

  const dinerBody = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.3), dinerShirtMat);
  dinerBody.position.y = 0.75;
  dinerGroup.add(dinerBody);

  const dinerHead = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 14), dinerSkinMat);
  dinerHead.position.y = 1.2;
  dinerGroup.add(dinerHead);

  goalGroup.add(dinerGroup);
  sceneGroup.add(goalGroup);
  obstacleMeshes.goal = { group: goalGroup, diner: dinerGroup };

  function update(physState, dt) {
    if (obstacleMeshes.fan) {
      obstacleMeshes.fan.bladeGroup.rotation.z += 28.0 * dt;
    }

    if (obstacleMeshes.cat) {
      const cat = obstacleMeshes.cat;
      if (physState.activeObstacle && physState.activeObstacle.id === 'cat' && physState.activeObstacle.tripped) {
        cat.group.position.y = 0.2 + Math.abs(Math.sin(physState.time * 12.0)) * 0.15;
      } else {
        const breath = Math.sin(physState.time * 2.5) * 0.015;
        cat.group.scale.set(1.0 + breath, 1.0 + breath * 1.5, 1.0 + breath);
      }
    }

    if (obstacleMeshes.goal) {
      const d = obstacleMeshes.goal.diner;
      if (physState.status === 'won') {
        d.position.y = Math.abs(Math.sin(physState.time * 8.0)) * 0.08;
      }
    }

    // Nhặt quẩy thưởng
    pickups.forEach((p) => {
      if (!p.collected) {
        p.group.rotation.y += 2.2 * dt;
        p.group.position.y = 0.45 + Math.sin(physState.time * 4.0) * 0.05;
        // Kiểm tra người phục vụ đi qua để nhặt quẩy
        if (Math.abs(physState.dist - p.z) < 1.0 && Math.abs(physState.posX - p.x) < 0.6) {
          p.collected = true;
          p.group.visible = false;
          physState.bonusTip = (physState.bonusTip || 0) + p.tip;
        }
      }
    });
  }

  return {
    sceneGroup,
    pickups,
    update,
  };
}
