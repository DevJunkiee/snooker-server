const express = require("express");
const admin = require("firebase-admin");
const crypto = require("crypto");

const app = express();
app.use(express.json());

// Load Firebase service account key
const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8")
);


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://snooker-automation-default-rtdb.firebaseio.com"
});
app.post("/webhook", async (req, res) => {

  const secret = "c1d2ee4151c8411d80279314ce4e86b8_301cff";

  const signature =
    req.headers["x-moniepoint-signature"] ||
    req.headers["moniepoint-signature"];

  if (!signature) {
    return res.status(400).send("No signature");
  }

  const hash = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (hash !== signature) {
    return res.status(401).send("Invalid signature");
  }

  const event = req.body;

  console.log("Webhook received:", JSON.stringify(event));

  if (
    event.event === "payment.success" &&
    event.data.amount === 500 &&
    event.data.status === "SUCCESS"
  ) {
    await admin.database().ref("machine").update({
      paid: true,
      busy: true,
      timestamp: Date.now(),
    });

    console.log("Machine unlocked");
  }

  res.status(200).send("OK");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
