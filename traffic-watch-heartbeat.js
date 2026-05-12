var args = parseArgs($argument || "");
var baseUrl = trimSlash(args.baseUrl || "");
var token = args.token || "";
var device = args.device || env("device-model") || "Surge";

if (!baseUrl || !token) {
  $done();
} else {
  var body = {
    time: new Date().toISOString(),
    device: device,
    network: networkName(),
    policy: "",
    clientIp: "",
    userAgent: "Surge",
    trigger: "heartbeat",
    message: "Surge heartbeat",
    extra: {
      system: env("system"),
      surgeVersion: env("surge-version")
    }
  };
  $httpClient.post({
    url: baseUrl + "/api/surge/report?token=" + encodeURIComponent(token),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }, function () {
    $done();
  });
}

function networkName() {
  if (typeof $network !== "undefined" && $network.wifi && $network.wifi.ssid) {
    return $network.wifi.ssid;
  }
  return "cellular-or-unknown";
}

function env(key) {
  if (typeof $environment !== "undefined" && $environment[key]) {
    return String($environment[key]);
  }
  return "";
}

function parseArgs(input) {
  var out = {};
  input.split("&").forEach(function (pair) {
    var index = pair.indexOf("=");
    if (index < 0) return;
    out[decodeURIComponent(pair.slice(0, index))] = decodeURIComponent(pair.slice(index + 1));
  });
  return out;
}

function trimSlash(value) {
  return String(value).replace(/\/+$/, "");
}
