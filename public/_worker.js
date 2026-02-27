export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // /mood/* → moodbrew.onrender.com 프록시
        if (url.pathname.startsWith('/mood')) {
            // url.pathname에서 '/mood'를 빈 문자열로 대체하여 경로를 다시 작성합니다.
            const targetUrl = `https://moodbrew.onrender.com${url.pathname.replace('/mood', '')}${url.search}`;
            return fetch(new Request(targetUrl, request));
        }

        // /cafe/* → mech-flow-main.vercel.app 프록시
        if (url.pathname.startsWith('/cafe')) {
            const targetUrl = `https://mech-flow-main.vercel.app${url.pathname.replace('/cafe', '')}${url.search}`;
            return fetch(new Request(targetUrl, request));
        }

        // 나머지는 정적 에셋 반환
        return env.ASSETS.fetch(request);
    }
};
