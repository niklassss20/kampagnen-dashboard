require("dotenv").config();

const path = require("path");
const express = require("express");
const session = require("express-session");

require("./database");

const authRoutes = require("./routes/auth");
const campaignRoutes = require("./routes/campaigns");
const analyticsRoutes = require("./routes/analytics");
const adgenRoutes = require("./routes/adgen");
const { requireAuth } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    name: "kampagnen.sid",
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.redirect(req.session.userId ? "/dashboard.html" : "/login.html");
});

app.use("/api", authRoutes);
app.use("/api/campaigns", requireAuth, campaignRoutes);
app.use("/api/analytics", requireAuth, analyticsRoutes);
app.use("/api", requireAuth, adgenRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Serverfehler" });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Kampagnen-Dashboard läuft auf http://localhost:${PORT}`);
  });
}

module.exports = app;
