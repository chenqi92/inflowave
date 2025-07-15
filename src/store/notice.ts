import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NoticeState {
  browserModeNoticeDismissed: boolean; // 重命名为 userGuideNoticeDismissed 会更合适，但为了兼容性保持原名
  dismissBrowserModeNotice: () => void; // 实际上是关闭用户指引的通知
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