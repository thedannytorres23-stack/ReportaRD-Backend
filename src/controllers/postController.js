import Post from "../models/Post.js";

const escaparRegex = (texto = "") => {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const TIPOS_MEDIA_PERMITIDOS = ["", "imagen", "video"];

export const listarPublicaciones = async (req, res) => {
  try {
    const buscar = req.query.buscar?.trim() || "";

    const limite = Math.min(
      Math.max(Number(req.query.limite) || 30, 1),
      50,
    );

    const pagina = Math.max(
      Number(req.query.pagina) || 1,
      1,
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

    const [publicaciones, total] = await Promise.all([
      Post.find(filtro)
        .populate(
          "autor",
          "nombre usuario foto activo ultimaActividad",
        )
        .sort({
          createdAt: -1,
        })
        .skip((pagina - 1) * limite)
        .limit(limite)
        .lean(),

      Post.countDocuments(filtro),
    ]);

    return res.status(200).json({
      ok: true,
      total,
      pagina,
      totalPaginas: Math.ceil(total / limite),
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
      contenido = "",
      comunidad = "Comunidad ReportaRD",
      mediaUrl = "",
      mediaTipo = "",
    } = req.body;

    if (!contenido.trim()) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "Escribe el contenido de la publicación.",
      });
    }

    if (contenido.trim().length > 3000) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "La publicación no puede superar los 3000 caracteres.",
      });
    }

    if (titulo.trim().length > 120) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "El título no puede superar los 120 caracteres.",
      });
    }

    if (!TIPOS_MEDIA_PERMITIDOS.includes(mediaTipo)) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "El tipo de archivo debe ser imagen o video.",
      });
    }

    if (mediaTipo && !mediaUrl.trim()) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "Debes proporcionar el archivo multimedia.",
      });
    }

    const publicacion = await Post.create({
      autor: req.usuario._id,
      titulo: titulo.trim(),
      contenido: contenido.trim(),
      comunidad:
        comunidad?.trim() || "Comunidad ReportaRD",
      mediaUrl: mediaUrl.trim(),
      mediaTipo,
    });

    await publicacion.populate(
      "autor",
      "nombre usuario foto activo ultimaActividad",
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

    if (error.name === "ValidationError") {
      const primerError = Object.values(
        error.errors,
      )[0];

      return res.status(400).json({
        ok: false,
        mensaje:
          primerError?.message ||
          "Los datos de la publicación no son válidos.",
      });
    }

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo crear la publicación.",
    });
  }
};