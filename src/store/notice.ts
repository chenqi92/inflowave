import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NoticeState {
  browserModeNoticeDismissed: boolean;
  dismissBrowserModeNotice: () => void;
  resetNoticeSettings: () => void;
}

export const useNoticeStore = create<NoticeState>()(
  persist(
    (set) => ({
      browserModeNoticeDismissed: false,
      
      dismissBrowserModeNotice: () => set({ browserModeNoticeDismissed: true }),
      
      resetNoticeSettings: () => set({ browserModeNoticeDismissed: false })}),
    {
      name: 'notice-settings',
      version: 1}
  )
);