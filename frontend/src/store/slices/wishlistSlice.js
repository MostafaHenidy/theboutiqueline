import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

export const fetchWishlist = createAsyncThunk('wishlist/fetch', async () => {
  const { data } = await api.get('/wishlist');
  return data.data;
});

/** @param {number|{ product_id: number, product?: object }} arg */
export const toggleWishlist = createAsyncThunk('wishlist/toggle', async (arg) => {
  const product_id = typeof arg === 'object' ? arg.product_id : arg;
  const product = typeof arg === 'object' ? arg.product : undefined;
  const { data } = await api.post('/wishlist', { product_id });
  return {
    product_id,
    added: data.added,
    item: data.data ?? null,
    product,
  };
});

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState: { items: [], loading: false },
  reducers: {
    clearWishlist: (state) => {
      state.items = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWishlist.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload || [];
      })
      .addCase(fetchWishlist.rejected, (state) => {
        state.loading = false;
      })
      .addCase(toggleWishlist.fulfilled, (state, action) => {
        const { product_id, added, item, product } = action.payload;
        if (added) {
          const entry = item ?? (product ? { product_id, product } : { product_id });
          const idx = state.items.findIndex(
            (i) => i.product_id === product_id || i.product?.id === product_id,
          );
          if (idx === -1) {
            state.items.unshift(entry);
          } else {
            state.items[idx] = { ...state.items[idx], ...entry };
          }
        } else {
          state.items = state.items.filter(
            (i) => i.product_id !== product_id && i.product?.id !== product_id,
          );
        }
      });
  },
});

export const { clearWishlist } = wishlistSlice.actions;

export const selectIsInWishlist = (productId) => (state) =>
  state.wishlist.items.some((i) => i.product_id === productId || i.product?.id === productId);

export default wishlistSlice.reducer;
