// A single writer per Electron userData profile protects board/garden snapshots
// from competing processes. Tests may still use their own isolated profiles.
export function lockDesktopInstance(app, getWindow) {
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return false;
  }
  app.on('second-instance', () => {
    const window = getWindow();
    if (!window || window.isDestroyed()) return;
    if (window.isMinimized()) window.restore();
    if (!window.isVisible()) window.show();
    window.focus();
  });
  return true;
}
