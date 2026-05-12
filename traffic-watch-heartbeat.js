var args = parseArgs($argument || "");
var setup = normalizeSetup(args);
var baseUrl = setup.baseUrl;
var token = setup.token;
var device = setup.device || env("device-model") || "Surge";

if (!baseUrl || !token || token === "PASTE_TOKEN_HERE") {
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
    url: baseUrl + "/api/surge/report",
    headers: {
      "Content-Type": "application/json",
      "X-API-Token": token,
      "Authorization": "Bearer " + token
    },
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

function normalizeSetup(args) {
  var rawBase = args.baseUrl || args.baseurl || "";
  var embedded = parseBaseUrl(rawBase);
  return {
    baseUrl: trimSlash(embedded.baseUrl || rawBase),
    token: args.token || args.TOKEN || embedded.token || "",
    device: args.device || args.DEVICE || embedded.device || ""
  };
}

function parseBaseUrl(value) {
  var raw = String(value || "");
  var out = { baseUrl: raw };
  var pipeParts = raw.split("|");
  if (pipeParts.length >= 2) {
    out.baseUrl = pipeParts[0];
    out.token = pipeParts[1];
    out.device = pipeParts[2] || "";
    return out;
  }
  var q = raw.indexOf("?");
  if (q < 0) return out;
  out.baseUrl = raw.slice(0, q);
  var query = parseArgs(raw.slice(q + 1));
  out.token = query.token || query.TOKEN || query.apiToken || query.apitoken || "";
  out.device = query.device || query.DEVICE || "";
  return out;
}

function trimSlash(value) {
  return String(value).replace(/\/+$/, "");
}
