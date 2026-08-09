import express from "express";
import {
  crearChatPrivado,
  crearGrupo,
  enviarMensaje,
  listarConversaciones,
  marcarComoLeidos,
  obtenerConversacion,
} from "../controllers/chatController.js";
import { protegerRuta } from "../middleware/authMiddleware.js";

const router = express.Router();

// Todas las rutas de chat requieren iniciar sesión
router.use(protegerRuta);

// Listar las conversaciones del usuario
router.get("/", listarConversaciones);

// Crear una conversación privada
router.post("/privado", crearChatPrivado);

// Crear un grupo
router.post("/grupos", crearGrupo);

// Consultar una conversación y sus mensajes
router.get("/:conversacionId", obtenerConversacion);

// Enviar un mensaje
router.post(
  "/:conversacionId/mensajes",
  enviarMensaje,
);

// Marcar los mensajes como leídos
router.patch(
  "/:conversacionId/leidos",
  marcarComoLeidos,
);

export default router;