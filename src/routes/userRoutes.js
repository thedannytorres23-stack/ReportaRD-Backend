import express from "express";

import {
  listarUsuarios,
  obtenerUsuario,
  cambiarSeguimiento,
} from "../controllers/userController.js";

import {
  protegerRuta,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protegerRuta);

// Listar y buscar usuarios
router.get("/", listarUsuarios);

// Seguir o dejar de seguir
router.patch(
  "/:usuarioId/seguir",
  cambiarSeguimiento,
);

// Obtener perfil de usuario
router.get(
  "/:usuarioId",
  obtenerUsuario,
);

export default router;