import cors from "cors";
import express from "express";
import authRoutes from "./routes/authRoutes.js";

const app = express();

const origenesPermitidos = [
  "http://localhost:5173",
  "http://localhost:5174",
];

app.use(
  cors({
    origin: origenesPermitidos,
    credentials: true,
  }),
);

app.use(express.json());

app.use("/api/auth", authRoutes);

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

export default app;