const { Setting, Product } = require('../models');
const { supportsHeroTickerImageId } = require('./adaptProductSchema');

const SETTING_KEY = 'hero_ticker_image_map';

async function readRawMap() {
  const row = await Setting.findOne({ where: { key: SETTING_KEY } });
  if (!row?.value) return {};
  try {
    const parsed = JSON.parse(row.value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function writeRawMap(map) {
  const [row] = await Setting.findOrCreate({
    where: { key: SETTING_KEY },
    defaults: {
      value: '{}',
      type: 'json',
      group: 'system',
      label_en: 'Homepage slider image picks',
      label_ar: 'صور الشريط في الصفحة الرئيسية',
    },
  });
  await row.update({ value: JSON.stringify(map), type: 'json' });
}

/** @returns {Record<number, number>} productId → productImageId */
async function getHeroTickerImageMap() {
  const raw = await readRawMap();
  const out = {};
  for (const [productId, imageId] of Object.entries(raw)) {
    const pid = parseInt(productId, 10);
    const iid = parseInt(imageId, 10);
    if (Number.isFinite(pid) && pid > 0 && Number.isFinite(iid) && iid > 0) {
      out[pid] = iid;
    }
  }
  return out;
}

async function setHeroTickerImageForProduct(productId, imageId) {
  const pid = parseInt(productId, 10);
  if (!Number.isFinite(pid) || pid <= 0) return;

  const map = await readRawMap();
  if (imageId == null || imageId === '') {
    delete map[String(pid)];
  } else {
    const iid = parseInt(imageId, 10);
    if (!Number.isFinite(iid) || iid <= 0) {
      delete map[String(pid)];
    } else {
      map[String(pid)] = iid;
    }
  }
  await writeRawMap(map);
}

async function clearHeroTickerImageForProduct(productId) {
  await setHeroTickerImageForProduct(productId, null);
}

async function clearHeroTickerImageForProducts(productIds) {
  if (!Array.isArray(productIds) || !productIds.length) return;
  const map = await readRawMap();
  let changed = false;
  for (const id of productIds) {
    const key = String(id);
    if (map[key] != null) {
      delete map[key];
      changed = true;
    }
  }
  if (changed) await writeRawMap(map);
}

function attachHeroTickerImageIdToJson(json, map) {
  if (!json || !map) return json;
  const picked = map[json.id];
  if (picked) json.hero_ticker_image_id = picked;
  return json;
}

async function attachHeroTickerImageIds(items, map) {
  if (supportsHeroTickerImageId(Product)) {
    return Array.isArray(items)
      ? items.map((item) => (item?.toJSON ? item.toJSON() : item))
      : (items?.toJSON ? items.toJSON() : items);
  }

  const resolvedMap = map || await getHeroTickerImageMap();
  if (!Object.keys(resolvedMap).length) {
    return Array.isArray(items)
      ? items.map((item) => (item?.toJSON ? item.toJSON() : item))
      : (items?.toJSON ? items.toJSON() : items);
  }

  const attachOne = (item) => {
    const json = item?.toJSON ? item.toJSON() : { ...item };
    return attachHeroTickerImageIdToJson(json, resolvedMap);
  };

  return Array.isArray(items) ? items.map(attachOne) : attachOne(items);
}

/** After DB column exists, copy settings map into products and clear the map. */
async function migrateHeroTickerImageMapToColumn(Product) {
  const map = await getHeroTickerImageMap();
  const ids = Object.keys(map);
  if (!ids.length) return 0;

  let migrated = 0;
  for (const [productId, imageId] of Object.entries(map)) {
    const [updated] = await Product.update(
      { hero_ticker_image_id: imageId },
      { where: { id: productId, hero_ticker_image_id: null } },
    );
    if (updated) migrated += 1;
  }
  await writeRawMap({});
  return migrated;
}

module.exports = {
  getHeroTickerImageMap,
  setHeroTickerImageForProduct,
  clearHeroTickerImageForProduct,
  clearHeroTickerImageForProducts,
  attachHeroTickerImageIds,
  attachHeroTickerImageIdToJson,
  migrateHeroTickerImageMapToColumn,
};
