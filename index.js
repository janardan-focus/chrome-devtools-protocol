const chromeLauncher = require('chrome-launcher');
const CDP = require('chrome-remote-interface');
const path = require('path');

let client = null;
let chrome = null;

(async function () {
    console.log('Starting Chrome...');

    // 1. Launch Chrome with remote debugging enabled
    chrome = await chromeLauncher.launch({
        startingUrl: 'about:blank',
        chromeFlags: ['--auto-open-devtools-for-tabs', "--window-size=1920,1080"] // Use headless for clean demo output, remove to see UI
    });

    console.log(`Chrome debugging port: ${chrome.port}`);

    // 2. Connect to the browser using CDP
    try {
        client = await CDP({ port: chrome.port });

        // Extract domains we need
        const { Network, Page } = client;

        // Enable events for domains
        await Promise.all([
            Network.enable(),
            Page.enable()
        ]);

        console.log('CDP Connected & Domains Enabled.');

        // 3. Set up Network Interception
        // We want to intercept all requests to demonstrate control
        await Network.setRequestInterception({
            patterns: [{ urlPattern: '*unsplash*' }] // Intercept everything
        });

        // 4. Handle intercepted requests
        Network.requestIntercepted(async ({ interceptionId, request }) => {
            const url = request.url;

            // Only mess with the unsplash images for demo safety
            if (url.includes('unsplash.com')) {
                const randomFate = Math.random();

                if (randomFate < 0.33) {
                    // ACTION: BLOCK
                    console.log(`[BLOCKED] ${url.substring(0, 50)}...`);
                    await Network.continueInterceptedRequest({
                        interceptionId,
                        errorReason: 'Failed' // Simulate connection failure
                    });
                } else if (randomFate < 0.66) {
                    // ACTION: DELAY (Artificial Latency)
                    console.log(`[DELAYED] ${url.substring(0, 50)}... (2s)`);
                    setTimeout(async () => {
                        try {
                            await Network.continueInterceptedRequest({ interceptionId });
                        } catch (e) { /* request might be cancelled */ }
                    }, 2000);
                } else {
                    // ACTION: PASS
                    console.log(`[PASSED]  ${url.substring(0, 50)}...`);
                    await Network.continueInterceptedRequest({ interceptionId });
                }
            } else {
                // Pass everything else (html, css, favicon) normally
                await Network.continueInterceptedRequest({ interceptionId });
            }
        });

        // 5. Navigate to the demo page
        const demoPath = 'file://' + path.join(__dirname, 'demo.html');
        console.log(`Navigating to ${demoPath}...`);
        await Page.navigate({ url: demoPath });

    } catch (err) {
        console.error('Error:', err);
    } 
})();

async function cleanup() {
    console.log('Cleaning up...');
    if (client) {
        client.close();
    }
    if (chrome) {
        await chrome.kill();
    }
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('SIGQUIT', cleanup);