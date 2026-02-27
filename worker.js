export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // /mood/* → moodbrew.onrender.com 프록시
        if (url.pathname.startsWith('/mood/')) {
            const targetPath = url.pathname.replace('/mood', '') || '/';
            const targetUrl = `https://moodbrew.onrender.com${targetPath}${url.search}`;

            return fetch(new Request(targetUrl, {
                method: request.method,
                headers: request.headers,
                body: request.body,
            }));
        }

        // /cafe/* → mech-flow-main.vercel.app 프록시 
        if (url.pathname.startsWith('/cafe/')) {
            const targetPath = url.pathname.replace('/cafe', '') || '/';
            const targetUrl = `https://mech-flow-main.vercel.app${targetPath}${url.search}`;

            return fetch(new Request(targetUrl, {
                method: request.method,
                headers: request.headers,
                body: request.body,
            }));
        }

        // 나머지는 정적 에셋(React SPA)
        return env.ASSETS.fetch(request);
    }
};
