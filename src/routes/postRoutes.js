import { Router } from "express";

import {
  crearPublicacion,
  editarPublicacion,
  eliminarPublicacion,
  listarPublicaciones,
  obtenerPublicacion,
} from "../controllers/postController.js";

import { protegerRuta } from "../middleware/authMiddleware.js";

const router = Router();

router.use(protegerRuta);

router.get("/", listarPublicaciones);
router.get("/:id", obtenerPublicacion);
router.post("/", crearPublicacion);
router.put("/:id", editarPublicacion);
router.delete("/:id", eliminarPublicacion);

export default router;