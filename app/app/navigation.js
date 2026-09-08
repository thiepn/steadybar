export function navigate(path) { if (location.hash === `#${path}`)
    window.dispatchEvent(new HashChangeEvent('hashchange'));
else
    location.hash = path; }
export function routePath() { return (location.hash.slice(1) || '/').split('?')[0] || '/'; }
