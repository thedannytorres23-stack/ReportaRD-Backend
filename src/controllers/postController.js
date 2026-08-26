import mongoose from "mongoose";
import Post from "../models/Post.js";

const escaparRegex = (texto = "") => {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const listarPublicaciones = async (req, res) => {
  try {
    const buscar = req.query.buscar?.trim() || "";
    const limite = Math.min(Number(req.query.limite) || 30, 50);

    const filtro = {
      estado: "publicada",
    };

    if (buscar) {
      const expresion = new RegExp(escaparRegex(buscar), "i");

      filtro.$or = [
        { titulo: expresion },
        { contenido: expresion },
        { comunidad: expresion },
      ];
    }

    const publicaciones = await Post.find(filtro)
      .populate("autor", "nombre usuario foto activo")
      .sort({ createdAt: -1 })
      .limit(limite)
      .lean();

    return res.status(200).json({
      ok: true,
      total: publicaciones.length,
      publicaciones,
    });
  } catch (error) {
    console.error("Error listando publicaciones:", error.message);

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudieron obtener las publicaciones.",
    });
  }
};

export const obtenerPublicacion = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        ok: false,
        mensaje: "El identificador de la publicación no es válido.",
      });
    }

    const publicacion = await Post.findOne({
      _id: id,
      estado: "publicada",
    })
      .populate("autor", "nombre usuario foto activo")
      .lean();

    if (!publicacion) {
      return res.status(404).json({
        ok: false,
        mensaje: "La publicación no existe.",
      });
    }

    return res.status(200).json({
      ok: true,
      publicacion,
    });
  } catch (error) {
    console.error("Error obteniendo publicación:", error.message);

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo obtener la publicación.",
    });
  }
};

export const crearPublicacion = async (req, res) => {
  try {
    const {
      titulo = "",
      contenido,
      comunidad,
      mediaUrl,
      mediaTipo,
    } = req.body;

    if (!contenido?.trim()) {
      return res.status(400).json({
        ok: false,
        mensaje: "Escribe el contenido de la publicación.",
      });
    }

    const publicacion = await Post.create({
      autor: req.usuario._id,
      titulo: titulo.trim(),
      contenido: contenido.trim(),
      comunidad,
      mediaUrl,
      mediaTipo,
    });

    await publicacion.populate(
      "autor",
      "nombre usuario foto activo",
    );

    return res.status(201).json({
      ok: true,
      mensaje: "Publicación creada correctamente.",
      publicacion,
    });
  } catch (error) {
    console.error("Error creando publicación:", error.message);

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo crear la publicación.",
    });
  }
};

export const editarPublicacion = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      titulo,
      contenido,
      comunidad,
      mediaUrl,
      mediaTipo,
    } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        ok: false,
        mensaje: "El identificador de la publicación no es válido.",
      });
    }

    const publicacion = await Post.findById(id);

    if (!publicacion || publicacion.estado === "eliminada") {
      return res.status(404).json({
        ok: false,
        mensaje: "La publicación no existe.",
      });
    }

    const esAutor =
      publicacion.autor.toString() ===
      req.usuario._id.toString();

    if (!esAutor) {
      return res.status(403).json({
        ok: false,
        mensaje: "No tienes permiso para editar esta publicación.",
      });
    }

    if (
      contenido !== undefined &&
      !contenido.trim()
    ) {
      return res.status(400).json({
        ok: false,
        mensaje: "El contenido de la publicación no puede estar vacío.",
      });
    }

    if (titulo !== undefined) {
      publicacion.titulo = titulo.trim();
    }

    if (contenido !== undefined) {
      publicacion.contenido = contenido.trim();
    }

    if (comunidad !== undefined) {
      publicacion.comunidad = comunidad;
    }

    if (mediaUrl !== undefined) {
      publicacion.mediaUrl = mediaUrl;
    }

    if (mediaTipo !== undefined) {
      publicacion.mediaTipo = mediaTipo;
    }

    await publicacion.save();

    await publicacion.populate(
      "autor",
      "nombre usuario foto activo",
    );

    return res.status(200).json({
      ok: true,
      mensaje: "Publicación actualizada correctamente.",
      publicacion,
    });
  } catch (error) {
    console.error("Error editando publicación:", error.message);

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo editar la publicación.",
    });
  }
};

export const eliminarPublicacion = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        ok: false,
        mensaje: "El identificador de la publicación no es válido.",
      });
    }

    const publicacion = await Post.findById(id);

    if (!publicacion || publicacion.estado === "eliminada") {
      return res.status(404).json({
        ok: false,
        mensaje: "La publicación no existe.",
      });
    }

    const esAutor =
      publicacion.autor.toString() ===
      req.usuario._id.toString();

    const puedeModerar = [
      "moderador",
      "administrador",
    ].includes(req.usuario.rol);

    if (!esAutor && !puedeModerar) {
      return res.status(403).json({
        ok: false,
        mensaje: "No tienes permiso para eliminar esta publicación.",
      });
    }

    publicacion.estado = "eliminada";

    await publicacion.save();

    return res.status(200).json({
      ok: true,
      mensaje: "Publicación eliminada correctamente.",
      publicacionId: publicacion._id,
    });
  } catch (error) {
    console.error("Error eliminando publicación:", error.message);

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo eliminar la publicación.",
    });
  }
};