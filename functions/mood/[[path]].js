export async function onRequest(context) {
    const url = new URL(context.request.url);
    url.hostname = 'moodbrew.onrender.com';
    return fetch(url.toString(), context.request);
}
