export async function onRequest(context) {
    const url = new URL(context.request.url);
    url.hostname = 'mech-flow-main.vercel.app';
    const request = new Request(url.toString(), context.request);
    return fetch(request);
}
