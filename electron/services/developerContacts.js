import { DEVELOPER_CONTACTS, getDeveloperContactUrl } from '../../shared/developer.js';

export function registerDeveloperContacts({ ipcMain, verifySender, openExternal, contacts = DEVELOPER_CONTACTS }) {
  ipcMain.handle('haven:developer:open-contact', async (event, ...args) => {
    verifySender(event);
    if (args.length !== 1 || !['email', 'linkedin'].includes(args[0])) {
      throw new TypeError('Invalid developer contact.');
    }
    const destination = getDeveloperContactUrl(args[0], contacts);
    if (!destination) return false;
    // Only these exact, configured public destinations can leave the sandbox.
    // Never accept a renderer-supplied URL or append app/user content.
    try { await openExternal(destination); return true; }
    catch { return false; }
  });
}
