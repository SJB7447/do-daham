export async function onRequest(context) {
    const request = context.request;
    const url = new URL(request.url);

    // Set the target hostname
    url.hostname = "moodbrew.onrender.com";
    url.protocol = "https:";
    url.port = "";

    // Remove the /mood prefix from the path
    // E.g., /mood/api/users -> /api/users
    // /mood -> /
    url.pathname = url.pathname.replace(/^\/mood/, '') || '/';

    // Create a new request object with the updated URL
    const proxyRequest = new Request(url.toString(), request);

    // Forward the request
    return fetch(proxyRequest);
}
