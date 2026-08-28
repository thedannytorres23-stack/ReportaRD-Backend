import cors from "cors";
import express from "express";

import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import reactionRoutes from "./routes/reactionRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
const app = express();

const origenesPermitidos = (
  process.env.CLIENT_URLS ||
  "http://localhost:5173,http://localhost:5174"
)
  .split(",")
  .map((origen) => origen.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origen, callback) {
      if (
        !origen ||
        origenesPermitidos.includes(origen)
      ) {
        callback(null, true);
        return;
      }

      callback(
        new Error("Origen no permitido por CORS"),
      );
    },

    credentials: true,
  }),
);

app.use(
  express.json({
    limit: "4mb",
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "4mb",
  }),
);

app.use("/api/auth", authRoutes);

app.use("/api/users", userRoutes);

app.use("/api/chats", chatRoutes);

app.use("/api/posts", postRoutes);

app.use("/api/uploads", uploadRoutes);

app.use("/api/reports", reportRoutes);

app.use("/api/comments", commentRoutes);

app.use("/api/reactions", reactionRoutes);

app.use("/api/notifications", notificationRoutes);

app.get("/", (req, res) => {
  res.json({
    nombre: "ReportaRD API",
    mensaje: "El backend está funcionando.",
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    ok: true,
    servicio: "ReportaRD Backend",
    fecha: new Date().toISOString(),
  });
});

app.use((error, req, res, next) => {
  if (
    error?.message ===
    "Origen no permitido por CORS"
  ) {
    return res.status(403).json({
      ok: false,
      mensaje: error.message,
    });
  }

  if (error?.type === "entity.too.large") {
    return res.status(413).json({
      ok: false,
      mensaje:
        "Las imágenes seleccionadas son demasiado pesadas.",
    });
  }

  return next(error);
});

export default app;