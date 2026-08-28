import { Router } from "express";

import {
  listarNotificaciones,
  obtenerNoLeidas,
  marcarComoLeida,
  marcarTodasComoLeidas,
} from "../controllers/notificationController.js";

import {
  protegerRuta,
} from "../middleware/authMiddleware.js";

const router = Router();

router.use(protegerRuta);

// Obtener todas las notificaciones del usuario
router.get("/", listarNotificaciones);

// Obtener cantidad de notificaciones no leídas
router.get("/no-leidas", obtenerNoLeidas);

// Marcar todas como leídas
router.patch(
  "/leer-todas",
  marcarTodasComoLeidas,
);

// Marcar una notificación como leída
router.patch(
  "/:id/leer",
  marcarComoLeida,
);

export default router;