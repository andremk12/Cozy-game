// Public contact details confirmed by the developer. The letter and the main
// process use the same list; no URL is accepted from the renderer.
export const DEVELOPER_CONTACTS = Object.freeze({
  email: 'andre.michalsky12@gmail.com',
  linkedin: 'https://www.linkedin.com/in/andré-michalsky/',
});

export function getDeveloperContactUrl(id, contacts = DEVELOPER_CONTACTS) {
  if (id === 'email') {
    const email = contacts?.email;
    // A single address, with no headers, recipients, control characters or URL
    // escaping. The renderer can never append a subject or private app content.
    return typeof email === 'string' && email.length <= 254
      && /^[A-Za-z0-9._+-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}$/.test(email)
      ? `mailto:${email}` : null;
  }
  if (id !== 'linkedin' || typeof contacts?.linkedin !== 'string'
    || contacts.linkedin.trim() !== contacts.linkedin || /[\p{Cc}\p{Cs}\p{Zl}\p{Zp}]/u.test(contacts.linkedin)) return null;
  try {
    const url = new URL(contacts.linkedin);
    return url.protocol === 'https:' && ['linkedin.com', 'www.linkedin.com'].includes(url.hostname)
      && !url.username && !url.password && !url.port && !url.search && !url.hash
      && /^\/in\/[A-Za-z0-9_%~-]+\/?$/.test(url.pathname) ? url.href : null;
  } catch { return null; }
}
