export async function onRequest(context) {
    const request = context.request;
    const url = new URL(request.url);

    // Set the target hostname
    url.hostname = "moodbrew.onrender.com";
    url.protocol = "https:";
    url.port = "";

    // Create a new request object with the updated URL
    const proxyRequest = new Request(url.toString(), request);

    // Forward the request
    return fetch(proxyRequest);
}
