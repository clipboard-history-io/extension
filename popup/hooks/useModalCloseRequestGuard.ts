import { useModals } from "@mantine/modals";
import { useEffect } from "react";

// In a Chrome popup the browser treats Escape (and the Android back gesture) as a "close
// request" that dismisses the entire popup window — taking any open modal down with it.
// `preventDefault()` on the keydown can't cancel a close request once focus has moved into the
// modal, so instead we intercept the request with a CloseWatcher and dismiss only the top
// modal, leaving the popup open. CloseWatcher is Chromium 120+; on older Chrome and on Firefox
// (which disallows intercepting the popup-dismissing Escape by design) the popup keeps its
// default behavior, which can't be overridden.
declare global {
  interface CloseWatcher extends EventTarget {
    onclose: ((this: CloseWatcher, event: Event) => unknown) | null;
    requestClose(): void;
    close(): void;
    destroy(): void;
  }

  interface Window {
    CloseWatcher?: {
      prototype: CloseWatcher;
      new (options?: { signal?: AbortSignal }): CloseWatcher;
    };
  }
}

export const useModalCloseRequestGuard = () => {
  const { modals, closeModal } = useModals();
  const topModalId = modals[modals.length - 1]?.id;

  useEffect(() => {
    const CloseWatcher = window.CloseWatcher;
    if (topModalId === undefined || CloseWatcher === undefined) {
      return;
    }

    const watcher = new CloseWatcher();
    watcher.onclose = () => closeModal(topModalId);

    return () => watcher.destroy();
  }, [topModalId, closeModal]);
};
