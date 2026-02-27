export async function onRequest(context) {
    const url = new URL(context.request.url);
    url.hostname = 'mech-flow-main.vercel.app';
    return fetch(url.toString(), context.request);
}
