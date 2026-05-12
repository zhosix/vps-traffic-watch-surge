# VPS Traffic Watch Surge

Remote module:

```text
https://raw.githubusercontent.com/zhosix/vps-traffic-watch-surge/main/traffic-watch.sgmodule
```

Arguments:

- `BASEURL`: backend URL, for example `https://watch.example.com`
- `TOKEN`: `apiToken` or `surge.sharedSecret`
- `DEVICE`: device name shown in the dashboard, for example `iPhone`
- `PANELINTERVAL`: panel refresh interval in seconds, for example `60`

The module uses Surge's multi-field argument style:

```text
#!arguments=BASEURL:https%3A%2F%2Fwatch.example.com,TOKEN:PASTE_TOKEN_HERE,DEVICE:iPhone,PANELINTERVAL:60
```

If your Surge UI only shows one editable field, put the token inside `BASEURL`:

```text
https://watch.example.com?token=YOUR_TOKEN&device=iPhone
```

Local quick pages after enabling the module:

- `http://vpswatch.local/status`: show current VPS status and send a normal report.
- `http://vpswatch.local/summary`: ask the backend to push the current traffic summary to Telegram.
- `http://vpswatch.local/warning?message=...`: send a warning report, which becomes a backend alert.
- `http://vpswatch.local/critical?message=...`: send a critical report, which can trigger Telegram and auto-block rules.
