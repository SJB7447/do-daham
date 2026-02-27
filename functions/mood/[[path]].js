export async function onRequest(context) {
    const url = new URL(context.request.url);
    url.hostname = 'moodbrew.onrender.com';
    // Render에서 호스트 충돌이 나지 않도록 새 Request 객체 생성
    const request = new Request(url.toString(), context.request);
    return fetch(request);
}
