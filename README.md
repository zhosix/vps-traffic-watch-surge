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
