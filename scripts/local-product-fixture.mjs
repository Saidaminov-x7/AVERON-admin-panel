import http from 'node:http';

const host = '127.0.0.1';
const port = Number(process.env.AVERON_ADMIN_FIXTURE_PORT || 4200);
const requests = [];
const productsByKey = new Map();
const commercePromos = [];
const seededProduct = {
  id: 'fixture-product-review', slug: 'fixture-review-shirt', publicId: 'fixture-product-review',
  country: 'CN', source: 'MANUAL', sourceUrl: null, categoryId: null,
  translations: { ru: { title: 'Тестовая рубашка для GLB review' }, uz: { title: 'GLB tekshiruv uchun test ko‘ylak' }, en: { title: 'GLB review fixture shirt' } },
  description: { ru: '', uz: '', en: '' }, images: [], variants: [{ id: 'fixture-variant-m', color: 'Blue', size: 'M', stock: 5, available: true }],
  salePriceUzs: '180000', compareAtPriceUzs: null, status: 'DRAFT', publishedAt: null, _count: { favoriteLinks: 0, recentlyViewedRecords: 0, reviews: 0 },
};
const fixtureAsset = {
  id: 'fixture-glb-review', productId: seededProduct.id, variantId: 'fixture-variant-m', fileSize: 1024,
  status: 'NEEDS_REVIEW', source: 'MANUAL', garmentLayer: 'BASE_TOP', mannequinVersion: 'averon-neutral-v1', modelVersion: 'fixture-v1',
  validationSummary: 'Local GLB fixture validated; approval required.', validationDetails: { format: 'glTF 2.0 binary', buffers: 1 },
  positionX: 0, positionY: 0.8, positionZ: 0, scale: 1, rejectionReason: null,
  previewUrl: `http://${host}:${port}/fixture-shirt.glb`, variant: { id: 'fixture-variant-m', color: 'Blue', size: 'M' }, createdAt: new Date().toISOString(),
};
let uploadedAsset = null;
const token = `eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.fixture`;

function send(response, status, body, headers = {}) {
  response.writeHead(status, {
    'Access-Control-Allow-Origin': 'http://127.0.0.1:3200',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Idempotency-Key',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8',
    ...headers,
  });
  response.end(JSON.stringify(body));
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://${host}:${port}`);
  if (request.method === 'OPTIONS') return send(response, 204, {});
  if (url.pathname === '/fixture-shirt.glb' && request.method === 'GET') {
    const json = Buffer.from(JSON.stringify({
      asset: { version: '2.0', generator: 'AVERON test fixture' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }] }],
      materials: [{ pbrMetallicRoughness: { baseColorFactor: [0.12, 0.28, 0.68, 1], metallicFactor: 0, roughnessFactor: 0.8 } }],
      buffers: [{ byteLength: 42 }],
      bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36, target: 34962 }, { buffer: 0, byteOffset: 36, byteLength: 6, target: 34963 }],
      accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [-0.5, -0.5, 0], max: [0.5, 0.5, 0] }, { bufferView: 1, componentType: 5123, count: 3, type: 'SCALAR', min: [0], max: [2] }],
    }));
    const jsonPadded = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 0x20)]);
    const binary = Buffer.alloc(44);
    [-0.5,-0.5,0, 0.5,-0.5,0, 0,0.5,0].forEach((value, index) => binary.writeFloatLE(value, index * 4));
    [0,1,2].forEach((value, index) => binary.writeUInt16LE(value, 36 + index * 2));
    const totalLength = 12 + 8 + jsonPadded.length + 8 + binary.length;
    const glb = Buffer.alloc(totalLength);
    glb.writeUInt32LE(0x46546c67, 0); glb.writeUInt32LE(2, 4); glb.writeUInt32LE(totalLength, 8);
    glb.writeUInt32LE(jsonPadded.length, 12); glb.writeUInt32LE(0x4e4f534a, 16); jsonPadded.copy(glb, 20);
    const binOffset = 20 + jsonPadded.length; glb.writeUInt32LE(binary.length, binOffset); glb.writeUInt32LE(0x004e4942, binOffset + 4); binary.copy(glb, binOffset + 8);
    response.writeHead(200, { 'Content-Type': 'model/gltf-binary', 'Content-Length': glb.length, 'Access-Control-Allow-Origin': 'http://127.0.0.1:3200' });
    return response.end(glb);
  }
  if (url.pathname === '/fixture-upload.glb' && request.method === 'GET') {
    const json = Buffer.from(JSON.stringify({
      asset: { version: '2.0', generator: 'AVERON local UI fixture' }, scene: 0,
      scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }] }],
      materials: [{ pbrMetallicRoughness: { baseColorFactor: [0.12, 0.28, 0.68, 1] } }],
      buffers: [{ byteLength: 44 }],
      bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36, target: 34962 }, { buffer: 0, byteOffset: 36, byteLength: 6, target: 34963 }],
      accessors: [
        { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [-0.5, -0.5, 0], max: [0.5, 0.5, 0] },
        { bufferView: 1, componentType: 5123, count: 3, type: 'SCALAR', min: [0], max: [2] },
      ],
    }));
    const jsonPadded = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 0x20)]);
    const binary = Buffer.alloc(44);
    [-0.5, -0.5, 0, 0.5, -0.5, 0, 0, 0.5, 0].forEach((value, index) => binary.writeFloatLE(value, index * 4));
    [0, 1, 2].forEach((value, index) => binary.writeUInt16LE(value, 36 + index * 2));
    const totalLength = 12 + 8 + jsonPadded.length + 8 + binary.length;
    const glb = Buffer.alloc(totalLength);
    glb.writeUInt32LE(0x46546c67, 0); glb.writeUInt32LE(2, 4); glb.writeUInt32LE(totalLength, 8);
    glb.writeUInt32LE(jsonPadded.length, 12); glb.writeUInt32LE(0x4e4f534a, 16); jsonPadded.copy(glb, 20);
    const binOffset = 20 + jsonPadded.length; glb.writeUInt32LE(binary.length, binOffset); glb.writeUInt32LE(0x004e4942, binOffset + 4); binary.copy(glb, binOffset + 8);
    response.writeHead(200, { 'Content-Type': 'model/gltf-binary', 'Content-Length': glb.length, 'Access-Control-Allow-Origin': 'http://127.0.0.1:3200' });
    return response.end(glb);
  }
  if (url.pathname === '/__fixture/requests' && request.method === 'GET') return send(response, 200, { requests, createCount: productsByKey.size });
  const fixtureProductId = url.pathname.match(/^\/__fixture\/products\/([^/]+)$/)?.[1];
  if (fixtureProductId && request.method === 'DELETE') {
    let deleted = false;
    for (const [key, product] of productsByKey) {
      if (product.id === decodeURIComponent(fixtureProductId)) {
        productsByKey.delete(key);
        deleted = true;
      }
    }
    requests.push({ method: 'DELETE', path: url.pathname });
    return send(response, deleted ? 200 : 404, { deleted });
  }
  if (url.pathname === '/auth/login' && request.method === 'POST') return send(response, 200, { accessToken: token, user: { id: 'fixture-admin', email: 'admin@averon.local', phone: '+998900000000', name: 'Fixture Admin', role: 'ADMIN', adminRole: 'SUPER_ADMIN', verified: true } });
  if (url.pathname === '/auth/refresh' && request.method === 'POST') return send(response, 200, { accessToken: token });
  if (url.pathname === '/auth/me') return send(response, 200, {
    id: 'fixture-admin', email: 'admin@averon.local', phone: '+998900000000', name: 'Fixture Admin',
    role: 'ADMIN', adminRole: 'SUPER_ADMIN', verified: true,
  });
  if (url.pathname === '/api/v1/admin/dashboard' && request.method === 'GET') {
    const fixtureProducts = [seededProduct, ...productsByKey.values()];
    return send(response, 200, {
      products: {
        published: fixtureProducts.filter((product) => product.status === 'PUBLISHED').length,
        pendingReview: 0,
        rejected: 0,
      },
      orders: { total: 0 },
      users: { total: 1 },
      finance: { revenue: 0, netProfit: 0, expenses: 0 },
    });
  }
  if (url.pathname === '/admin/notifications' && request.method === 'GET') {
    return send(response, 200, { items: [], unreadCount: 0 });
  }
  if (url.pathname === '/admin/notifications/read-all' && request.method === 'PATCH') {
    return send(response, 200, { ok: true });
  }
  if (url.pathname === '/api/v1/admin/reviews' && request.method === 'GET') {
    return send(response, 200, { items: [], pagination: { page: 1, pages: 0, total: 0 } });
  }
  // Read-only empty states for local admin route/UI smoke tests. These are
  // loopback-only and mirror response shapes consumed by the frontend.
  if (request.method === 'GET' && url.pathname === '/api/v1/admin/imports') return send(response, 200, { items: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } });
  if (request.method === 'GET' && url.pathname === '/api/v1/admin/orders') return send(response, 200, []);
  if (request.method === 'GET' && url.pathname === '/admin/users') return send(response, 200, { items: [], total: 0, page: 1, limit: 20, totalPages: 0 });
  if (request.method === 'GET' && url.pathname === '/admin/audit-logs') return send(response, 200, { items: [], total: 0, page: 1, limit: 20, totalPages: 0 });
  if (request.method === 'GET' && url.pathname === '/admin/users/fixture-admin') return send(response, 200, { id: 'fixture-admin', name: 'Fixture Admin', email: 'admin@example.test', phone: '+998900000000', role: 'ADMIN', adminRole: 'SUPER_ADMIN', verified: true, isBlocked: false, blockedAt: null, blockedReason: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastLoginAt: null, avatar: null });
  if (request.method === 'GET' && /^\/admin\/users\/[^/]+\/(activity|ai-sessions)$/.test(url.pathname)) return send(response, 200, url.pathname.endsWith('/ai-sessions') ? { aiSessions: [] } : { items: [], total: 0, page: 1, limit: 20, totalPages: 0 });
  if (request.method === 'GET' && /^\/admin\/users\/[^/]+\/sessions$/.test(url.pathname)) return send(response, 200, []);
  if (request.method === 'GET' && url.pathname === '/admin/staff') return send(response, 200, []);
  if (request.method === 'GET' && url.pathname === '/admin/me') return send(response, 200, { id: 'fixture-admin', name: 'Fixture Admin', role: 'ADMIN', adminRole: 'SUPER_ADMIN' });
  if (request.method === 'GET' && url.pathname === '/auth/admin/totp/status') return send(response, 200, { enabled: false, unusedRecoveryCodes: 0 });
  if (request.method === 'GET' && url.pathname === '/admin/system/health') return send(response, 200, { status: 'HEALTHY', uptimeSeconds: 1, backend: { status: 'HEALTHY', latencyMs: 1 }, database: { status: 'HEALTHY', latencyMs: 1 }, redis: { status: 'HEALTHY', latencyMs: 1 }, memory: { rssMb: 1, heapUsedMb: 1, heapTotalMb: 2, heapUsagePercent: 50 }, nodeVersion: process.version, timestamp: new Date().toISOString() });
  if (request.method === 'GET' && url.pathname === '/api/v1/admin/visual-search/audit') return send(response, 200, { items: [], total: 0, page: 1, limit: 25, totalPages: 0 });
  if (request.method === 'GET' && url.pathname === '/api/v1/admin/integration-diagnostics') return send(response, 200, []);
  if (request.method === 'GET' && url.pathname === '/error-reports') return send(response, 200, { items: [], total: 0, page: 1, limit: 20, totalPages: 0 });
  if (request.method === 'GET' && url.pathname === '/analytics/admin/range') return send(response, 200, {});
  if (request.method === 'GET' && url.pathname === '/analytics/funnel') return send(response, 200, {});
  if (url.pathname === '/api/v1/admin/commerce/promo-codes' && request.method === 'GET') {
    return send(response, 200, commercePromos);
  }
  if (url.pathname === '/api/v1/admin/commerce/promo-codes' && request.method === 'POST') {
    let raw = '';
    request.on('data', (chunk) => { raw += chunk; });
    request.on('end', () => {
      const body = JSON.parse(raw || '{}');
      requests.push({ method: request.method, path: url.pathname, body });
      const promo = {
        id: `fixture-promo-${requests.length}`, code: body.code, discountPercent: body.discountPercent,
        maxActivations: body.maxActivations, usedActivations: 0, remainingActivations: body.maxActivations,
        isActive: true, startsAt: body.startsAt, expiresAt: body.expiresAt,
        createdAt: new Date().toISOString(), status: 'ACTIVE',
      };
      commercePromos.push(promo);
      return send(response, 201, promo);
    });
    return;
  }
  if (/^\/admin\/notifications\/[^/]+\/read$/.test(url.pathname) && request.method === 'PATCH') {
    return send(response, 404, { message: 'Notification not found' });
  }
  if (url.pathname === '/api/v1/admin/products' && request.method === 'GET') {
    return send(response, 200, { items: [seededProduct, ...productsByKey.values()], pagination: { page: 1, limit: 15, total: productsByKey.size + 1, pages: 1 } });
  }
  if (url.pathname === `/api/v1/admin/products/${seededProduct.id}/fitting-room/assets` && request.method === 'GET') return send(response, 200, [uploadedAsset ?? fixtureAsset]);
  if (url.pathname === `/api/v1/admin/products/${seededProduct.id}/fitting-room/assets` && request.method === 'POST') {
    let bytes = 0;
    request.on('data', (chunk) => { bytes += chunk.length; });
    request.on('end', () => {
      requests.push({ method: 'POST', path: url.pathname, bytes, layer: url.searchParams.get('layer'), variantId: url.searchParams.get('variantId') });
      if (bytes <= 0) return send(response, 400, { code: 'GLB_FILE_REQUIRED' });
      if (!request.headers['content-type']?.includes('multipart/form-data')) return send(response, 415, { code: 'GLB_MULTIPART_REQUIRED' });
      uploadedAsset = {
        ...fixtureAsset,
        id: 'fixture-glb-uploaded',
        fileSize: bytes,
        status: 'NEEDS_REVIEW',
        validationSummary: 'Local upload fixture accepted for workflow testing; not a production GLB validation result.',
        previewUrl: `http://${host}:${port}/fixture-upload.glb`,
        createdAt: new Date().toISOString(),
      };
      return send(response, 201, { id: uploadedAsset.id, status: uploadedAsset.status, previewUrl: uploadedAsset.previewUrl });
    });
    return;
  }
  if (url.pathname === `/api/v1/admin/fitting-room/assets/${fixtureAsset.id}` && request.method === 'PATCH') return send(response, 200, fixtureAsset);
  if ([fixtureAsset.id, uploadedAsset?.id].includes(url.pathname.split('/').at(-2)) && url.pathname.endsWith('/review') && request.method === 'POST') {
    let raw = '';
    request.on('data', (chunk) => { raw += chunk; });
    request.on('end', () => {
      const body = JSON.parse(raw || '{}');
      const asset = uploadedAsset?.id === url.pathname.split('/').at(-2) ? uploadedAsset : fixtureAsset;
      if (body.action === 'reject' && !String(body.rejectionReason ?? '').trim()) return send(response, 400, { code: 'FITTING_ASSET_REJECTION_REASON_REQUIRED' });
      requests.push({ method: 'POST', path: url.pathname, body });
      asset.status = body.action === 'approve' ? 'APPROVED' : 'REJECTED';
      asset.rejectionReason = body.action === 'reject' ? body.rejectionReason : null;
      return send(response, 200, { id: asset.id, status: asset.status });
    });
    return;
  }
  if (url.pathname === '/api/v1/products/fixture-product-review/fitting-room' && request.method === 'GET') return send(response, 200, { id: seededProduct.id, slug: seededProduct.slug, title: seededProduct.translations.ru.title, salePriceUzs: '180000', imageUrl: null, variants: [{ id: 'fixture-variant-m', color: 'Blue', size: 'M', stock: 5, salePriceUzs: '180000' }], assets: [fixtureAsset] });
  if (url.pathname === '/api/v1/fitting-room/products' && request.method === 'GET') return send(response, 200, [{ id: seededProduct.id, slug: seededProduct.slug, title: seededProduct.translations.ru.title, salePriceUzs: '180000', imageUrl: null, variants: [{ id: 'fixture-variant-m', color: 'Blue', size: 'M', stock: 5, salePriceUzs: '180000' }], assets: [fixtureAsset] }]);
  if (url.pathname === '/api/v1/admin/categories') return send(response, 200, []);
  if (url.pathname === '/admin/site-settings') return send(response, 200, {
    id: 'singleton', maintenanceMode: false, maintenanceMessage: null, siteName: 'AVERON local fixture',
    contactEmail: 'test@averon.local', contactPhone: '+998900000000', googleAuthEnabled: false,
    autoModerationEnabled: false, maxProductPhotos: 15, maxProductPhotoSizeMb: 10, logoUrl: null,
    updatedAt: new Date().toISOString(), updatedBy: null,
  });
  if (url.pathname === '/api/v1/capabilities') return send(response, 200, {
    aiProductFill: false,
    imageEmbeddings: false,
    telegramProductPublish: false,
    telegramProductPublishFeatureEnabled: false,
    telegramProductPublishConfigured: false,
  });
  if (url.pathname === '/media/upload' && request.method === 'POST') {
    return send(response, 201, { id: 'fixture-media-1', url: '/fixture-product.png', size: 1024, isNewUpload: true });
  }
  if (url.pathname === '/api/v1/admin/products' && request.method === 'POST') {
    const key = String(request.headers['idempotency-key'] ?? '');
    let raw = '';
    request.on('data', (chunk) => { raw += chunk; });
    request.on('end', () => {
      requests.push({ method: request.method, path: url.pathname, key, body: raw });
      const existing = productsByKey.get(key);
      if (existing) return send(response, 200, existing, { 'Idempotent-Replay': 'true' });
      const body = JSON.parse(raw || '{}');
      const product = { id: `fixture-product-${productsByKey.size + 1}`, slug: 'fixture-product', publicId: 'fix1-ture-prod-0001', source: 'MANUAL', status: body.publish ? 'PUBLISHED' : 'DRAFT', ...body };
      productsByKey.set(key, product);
      return send(response, 201, product);
    });
    return;
  }
  requests.push({ method: request.method, path: url.pathname });
  return send(response, 404, { message: `Fixture route not found: ${request.method} ${url.pathname}` });
});

server.listen(port, host, () => process.stdout.write(`AVERON admin fixture listening on http://${host}:${port}\n`));
