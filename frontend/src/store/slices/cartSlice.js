import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';
import { trackStoreEvent } from '../../utils/analyticsTracker';
import { getVariantStock, findMatchingVariant } from '../../utils/productVariants';

/** Guest cart persists so visitors can checkout without signing in */
export const GUEST_CART_KEY = 'misk_guest_cart_v1';

function readGuestStorage() {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeGuestStorage(items) {
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
  } catch { /* ignore */ }
}

export function clearGuestStorage() {
  localStorage.removeItem(GUEST_CART_KEY);
}

function newGuestLineId() {
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function mergeGuestAdd(items, incoming) {
  const product_id = incoming.product_id ?? incoming.product?.id;
  if (!product_id) throw new Error('Missing product');
  const qty = Math.max(1, parseInt(String(incoming.quantity ?? 1), 10));
  const size = incoming.size ?? null;
  const color = incoming.color ?? null;
  const product = incoming.product;
  const idx = items.findIndex((i) => {
    const pid = i.product_id ?? i.product?.id;
    return pid === product_id && (i.size ?? null) === size && (i.color ?? null) === color;
  });
  const prod = product || (idx >= 0 ? items[idx].product : null);
  const stock = prod ? getVariantStock(prod, size, color) : undefined;
  const matchedVariant = findMatchingVariant(prod?.variants, size, color);
  const maxQty = Number.isFinite(stock) && stock >= 0 ? stock : Infinity;
  const next = [...items];

  if (idx >= 0) {
    const capped = Math.min(next[idx].quantity + qty, maxQty === Infinity ? next[idx].quantity + qty : maxQty);
    next[idx] = { ...next[idx], quantity: Math.max(1, capped) };
  } else {
    const initialCap = maxQty === Infinity ? qty : Math.min(qty, Math.max(maxQty, 1));
    next.push({
      id: newGuestLineId(),
      product_id,
      quantity: Math.max(1, initialCap || 1),
      size,
      color,
      variant_id: incoming.variant_id ?? matchedVariant?.id ?? null,
      product,
    });
  }

  return next;
}

export const hydrateGuestCart = createAsyncThunk('cart/hydrateGuest', async () => {
  if (localStorage.getItem('token')) return null;
  const stored = readGuestStorage();
  if (!stored.length) return null;
  return { items: stored };
});

/** After login: push guest lines from Redux then load server cart */
export const bootstrapAuthCart = createAsyncThunk('cart/bootstrapAuth', async (_, { getState, rejectWithValue }) => {
  try {
    const lines = getState().cart.items || [];
    for (const line of lines) {
      if (typeof line.id === 'string' && line.id.startsWith('guest-')) {
        await api.post('/cart/add', {
          product_id: line.product_id || line.product?.id,
          quantity: line.quantity,
          size: line.size ?? null,
          color: line.color ?? null,
          variant_id: line.variant_id ?? null,
        });
      }
    }
    clearGuestStorage();
    const { data } = await api.get('/cart');
    return data.data || { items: [] };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Cart sync failed');
  }
});

function authedCart() {
  return !!localStorage.getItem('token');
}

export const fetchCart = createAsyncThunk('cart/fetch', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/cart');
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const addToCart = createAsyncThunk(
  'cart/add',
  async (item, { getState, rejectWithValue }) => {
    const hasToken = authedCart() && getState().auth?.isAuthenticated;
    if (hasToken) {
      try {
        await api.post('/cart/add', {
          product_id: item.product_id,
          quantity: item.quantity ?? 1,
          size: item.size,
          color: item.color,
          variant_id: item.variant_id,
        });
        const { data } = await api.get('/cart');
        clearGuestStorage();
        return { source: 'server', cart: data.data };
      } catch (err) {
        return rejectWithValue(err.response?.data?.message || err.message || 'Failed to add');
      }
    }

    try {
      const prev = getState().cart.items || [];
      const next = mergeGuestAdd(prev, item);
      writeGuestStorage(next);
      return { source: 'guest', cart: { items: next } };
    } catch (err) {
      return rejectWithValue(err.message === 'Missing product' ? err.message : 'Could not update cart');
    }
  }
);

export const updateCartItem = createAsyncThunk('cart/update', async ({ id, quantity }, { getState, rejectWithValue }) => {
  const hasToken = authedCart() && getState().auth?.isAuthenticated;

  if (hasToken) {
    try {
      await api.put(`/cart/items/${id}`, { quantity });
      const { data } = await api.get('/cart');
      return { source: 'server', cart: data.data };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message);
    }
  }

  const items = getState().cart.items || [];
  const idx = items.findIndex((i) => i.id === id);
  if (idx < 0) return rejectWithValue('Item not found');
  const line = items[idx];
  let next = [...items];
  if (quantity <= 0) next = next.filter((i) => i.id !== id);
  else {
    const maxStock = Number(line.product?.stock);
    const cap = Number.isFinite(maxStock) ? Math.min(quantity, maxStock) : quantity;
    next[idx] = { ...line, quantity: Math.max(1, cap) };
  }
  writeGuestStorage(next);
  return { source: 'guest', cart: { items: next } };
});

export const removeFromCart = createAsyncThunk('cart/remove', async (id, { getState, rejectWithValue }) => {
  const hasToken = authedCart() && getState().auth?.isAuthenticated;

  if (hasToken) {
    try {
      await api.delete(`/cart/items/${id}`);
      const { data } = await api.get('/cart');
      return { source: 'server', cart: data.data };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message);
    }
  }

  const next = (getState().cart.items || []).filter((i) => i.id !== id);
  writeGuestStorage(next);
  return { source: 'guest', cart: { items: next } };
});

export const clearCart = createAsyncThunk('cart/clear', async (_, { getState }) => {
  const hasToken = authedCart() && getState().auth?.isAuthenticated;
  if (hasToken) {
    try {
      await api.delete('/cart/clear');
    } catch { /* ignore */ }
  }
  clearGuestStorage();
  return { source: 'cleared', cart: { items: [] } };
});

const applyCartData = (s, data) => {
  s.loading = false;
  if (data?.items) s.items = data.items;
};

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [], loading: false, error: null, coupon: null },
  reducers: {
    setCoupon: (s, a) => { s.coupon = a.payload; },
    clearCoupon: (s) => { s.coupon = null; },
    resetCart: (s) => { s.items = []; s.coupon = null; clearGuestStorage(); },
  },
  extraReducers: (builder) => {
    builder
      .addCase(hydrateGuestCart.fulfilled, (s, a) => {
        if (!a.payload?.items?.length) return;
        if (localStorage.getItem('token')) return;
        s.items = a.payload.items;
      })
      .addCase(bootstrapAuthCart.pending, (s) => { s.loading = true; })
      .addCase(bootstrapAuthCart.fulfilled, (s, a) => {
        applyCartData(s, a.payload);
      })
      .addCase(bootstrapAuthCart.rejected, (s) => { s.loading = false; })
      .addCase(fetchCart.pending, (s) => { s.loading = true; })
      .addCase(fetchCart.fulfilled, (s, a) => {
        applyCartData(s, a.payload);
      })
      .addCase(fetchCart.rejected, (s) => { s.loading = false; })
      .addCase(addToCart.fulfilled, (s, a) => {
        if (a.payload?.cart) applyCartData(s, a.payload.cart);
        const meta = a.meta?.arg;
        if (meta?.product_id) {
          trackStoreEvent('add_to_cart', {
            product_id: meta.product_id,
            metadata: { quantity: meta.quantity ?? 1 },
          });
        }
      })
      .addCase(updateCartItem.fulfilled, (s, a) => {
        if (a.payload?.cart) applyCartData(s, a.payload.cart);
      })
      .addCase(removeFromCart.fulfilled, (s, a) => {
        if (a.payload?.cart) applyCartData(s, a.payload.cart);
      })
      .addCase(clearCart.fulfilled, (s, a) => {
        if (a.payload?.cart) applyCartData(s, a.payload.cart);
      });
  },
});

export const { setCoupon, clearCoupon, resetCart } = cartSlice.actions;
export const selectCartCount = (state) => state.cart.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
export const selectCartTotal = (state) => state.cart.items?.reduce((sum, i) => {
  const price = i.product?.sale_price || i.product?.price || 0;
  return sum + price * i.quantity;
}, 0) || 0;
export default cartSlice.reducer;
