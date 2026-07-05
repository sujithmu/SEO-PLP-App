export function addNgrokSkipHeader(headers: Headers) {
  headers.set("ngrok-skip-browser-warning", "true");
}