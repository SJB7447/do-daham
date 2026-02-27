export async function onRequest(context) {
    const request = context.request;
    const url = new URL(request.url);

    // Set the target hostname
    url.hostname = "mech-flow-main.vercel.app";
    url.protocol = "https:";
    url.port = "";

    // Remove the /cafe prefix from the path
    // E.g., /cafe/api/users -> /api/users
    // /cafe -> /
    url.pathname = url.pathname.replace(/^\/cafe/, '') || '/';

    // Create a new request object with the updated URL
    const proxyRequest = new Request(url.toString(), request);

    // Forward the request
    return fetch(proxyRequest);
}
