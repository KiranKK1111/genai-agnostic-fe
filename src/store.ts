import { configureStore } from '@reduxjs/toolkit';
import chatReducer from './features/chatSlice';

// Create the Redux store. Additional slices can be added here in the future.
export const store = configureStore({
  reducer: {
    chat: chatReducer,
  },
});

// Export useful TypeScript types for use throughout the app
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;