import express from "express";
import {
  listarUsuarios,
  obtenerUsuario,
} from "../controllers/userController.js";
import { protegerRuta } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protegerRuta);

router.get("/", listarUsuarios);
router.get("/:usuarioId", obtenerUsuario);

export default router;