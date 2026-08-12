import Post from "../models/Post.js";

const escaparRegex = (texto = "") => {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const listarPublicaciones = async (req, res) => {
  try {
    const buscar = req.query.buscar?.trim() || "";

    const limite = Math.min(
      Number(req.query.limite) || 30,
      50,
    );

    const filtro = {
      estado: "publicada",
    };

    if (buscar) {
      const expresion = new RegExp(
        escaparRegex(buscar),
        "i",
      );

      filtro.$or = [
        { titulo: expresion },
        { contenido: expresion },
        { comunidad: expresion },
      ];
    }

    const publicaciones = await Post.find(filtro)
      .populate(
        "autor",
        "nombre usuario foto activo",
      )
      .sort({
        createdAt: -1,
      })
      .limit(limite)
      .lean();

    return res.status(200).json({
      ok: true,
      total: publicaciones.length,
      publicaciones,
    });
  } catch (error) {
    console.error(
      "Error listando publicaciones:",
      error.message,
    );

    return res.status(500).json({
      ok: false,
      mensaje:
        "No se pudieron obtener las publicaciones.",
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
        mensaje:
          "Escribe el contenido de la publicación.",
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
    console.error(
      "Error creando publicación:",
      error.message,
    );

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo crear la publicación.",
    });
  }
};