# Network Chaos POC

A Proof of Concept demonstrating the **Chrome DevTools Protocol (CDP)** by acting as a network proxy that randomly fails or delays requests.

## Setup

1.  Install dependencies:
    ```bash
    npm install
    ```

## Usage

1.  Run the script:
    ```bash
    node index.js
    ```
    *Note: By default (in the code), it may launch in headless mode. Edit `index.js` and remove `chromeFlags` to see the browser UI.*

2.  Observe the terminal output to see requests being Blocked, Delayed, or Passed.

## Detailed Flow of Execution

This script follows the standard lifecycle of a CDP automation tool. Here is exactly what happens at each step:

### Step 1: Launch Browser
**Code:** `chromeLauncher.launch(...)`
- We start a fresh instance of Chrome.
- **Crucial Flag:** `--remote-debugging-port`. This opens the HTTP/WebSocket interface (usually on port 9222) that allows external tools to control the browser.
- We also print the port, as it's randomly assigned for safety in this script.

### Step 2: Connect Client
**Code:** `CDP({port: chrome.port})`
- We use the `chrome-remote-interface` library to perform the WebSocket handshake with the browser.
- This gives us a `client` object that can send commands to any CDP "Domain" (Network, Page, DOM, etc.).

### Step 3: Enable Domains
**Code:** `Network.enable()`, `Page.enable()`
- **Important:** Most CDP domains (like Network) don't send events by default to save performance. You MUST explicitly `enable()` them before they start telling you what's happening.

### Step 4: Set Interception Patterns
**Code:** `Network.setRequestInterception({ patterns: [...] })`
- **The Core Mechanic:** We tell Chrome, "Stop! Don't actually send any network requests yet."
- `patterns: [{urlPattern: '*'}]`: We are matching *everything*. You could be more specific (e.g., `*.png`), but we want full control.
- From this moment on, every network request is "paused" at the browser level, waiting for our command.

### Step 5: The Event Loop (Chaos Logic)
**Code:** `Network.requestIntercepted(...)`
- This event fires for every paused request.
- We inspect `request.url`.
- **Decision Matrix for Images:**
    1.  **Block:** We call `Network.continueInterceptedRequest` with `errorReason: 'Failed'`. The browser thinks the server connection failed.
    2.  **Delay:** We use a standardized `setTimeout` in Node.js, and *then* tell the browser to continue. The browser effectively "hangs" waiting for this.
    3.  **Pass:** We call `Network.continueInterceptedRequest` immediately. The request proceeds as normal.

### Step 6: Navigation
**Code:** `Page.navigate(...)`
- We only navigate *after* setting up our interceptors. If we navigated before Step 4, we might miss the initial image loads!
