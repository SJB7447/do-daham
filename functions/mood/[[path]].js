export async function onRequest(context) {
    const url = new URL(context.request.url);
    url.hostname = 'moodbrew.onrender.com';
    const request = new Request(url.toString(), context.request);
    return fetch(request);
}
