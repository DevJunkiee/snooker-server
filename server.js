const express = require("express");
const admin = require("firebase-admin");
const crypto = require("crypto");

const app = express();
app.use(express.json());

// 🔐 Decode Firebase key from Render env
const serviceAccount = JSON.parse(
  Buffer.from(
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
    "base64"
  ).toString("utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://snooker-automation-default-rtdb.firebaseio.com",
});

// 🔎 Log ANY incoming request (for debugging)
app.use((req, res, next) => {
  console.log("Incoming:", req.method, req.url);
  next();
});

// 🎯 Webhook endpoint
app.post("/webhook", async (req, res) => {
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);

  const secret = "c1d2ee4151c8411d80279314ce4e86b8_301cff";

  const signature =
    req.headers["x-moniepoint-signature"] ||
    req.headers["moniepoint-signature"];

  if (!signature) {
    console.log("No signature found");
    return res.status(400).send("No signature");
  }

  const hash = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (hash !== signature) {
    console.log("Signature mismatch");
    return res.status(401).send("Invalid signature");
  }

  const event = req.body;

  // ⚡ Adjust this if Moniepoint payload structure differs
  if (
    event.event === "payment.success" &&
    Number(event.data.amount) === 500
  ) {
    await admin.database().ref("machine").update({
      paid: true,
      busy: true,
      timestamp: Date.now(),
    });

    console.log("Machine unlocked ✅");
  }

  res.status(200).send("OK");
});

app.get("/", (req, res) => {
  res.send("Snooker webhook server running");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
