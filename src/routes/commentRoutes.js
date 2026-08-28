import { Router } from "express";

import {
  crearComentario,
  eliminarComentario,
  listarComentarios,
} from "../controllers/commentController.js";

import {
  protegerRuta,
} from "../middleware/authMiddleware.js";

const router = Router();

// Todas las rutas de comentarios requieren sesión
router.use(protegerRuta);

// Obtener comentarios de una publicación o reporte
router.get("/", listarComentarios);

// Crear comentario o respuesta
router.post("/", crearComentario);

// Eliminar comentario propio
router.delete("/:id", eliminarComentario);

export default router;