import Comment from "../models/Comment.js";
import Post from "../models/Post.js";
import Report from "../models/Report.js";

const obtenerModeloContenido = (tipoContenido) => {
  if (tipoContenido === "post") return Post;
  if (tipoContenido === "report") return Report;

  return null;
};

const sincronizarContadorComentarios = async (
  tipoContenido,
  contenidoId,
) => {
  const ModeloContenido =
    obtenerModeloContenido(tipoContenido);

  if (!ModeloContenido) {
    return 0;
  }

  const totalComentarios = await Comment.countDocuments({
    tipoContenido,
    contenidoId,
    estado: "publicado",

    // Solo contamos comentarios principales.
    // Las respuestas no aumentan el contador del feed.
    respuestaA: null,
  });

  await ModeloContenido.findByIdAndUpdate(
    contenidoId,
    {
      $set: {
        comentarios: totalComentarios,
      },
    },
  );

  return totalComentarios;
};

export const crearComentario = async (req, res) => {
  try {
    const {
      tipoContenido,
      contenidoId,
      contenido,
      respuestaA = null,
    } = req.body;

    if (
      !tipoContenido ||
      !contenidoId ||
      !contenido?.trim()
    ) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "Faltan datos para crear el comentario.",
      });
    }

    const ModeloContenido =
      obtenerModeloContenido(tipoContenido);

    if (!ModeloContenido) {
      return res.status(400).json({
        ok: false,
        mensaje: "Tipo de contenido inválido.",
      });
    }

    const contenidoPrincipal =
      await ModeloContenido.findById(contenidoId);

    if (!contenidoPrincipal) {
      return res.status(404).json({
        ok: false,
        mensaje:
          "La publicación o reporte no existe.",
      });
    }

    if (respuestaA) {
      const comentarioPadre = await Comment.findOne({
        _id: respuestaA,
        tipoContenido,
        contenidoId,
        estado: "publicado",
      });

      if (!comentarioPadre) {
        return res.status(404).json({
          ok: false,
          mensaje:
            "El comentario al que respondes no existe.",
        });
      }
    }

    const comentario = await Comment.create({
      autor: req.usuario._id,
      contenido: contenido.trim(),
      tipoContenido,
      contenidoId,
      respuestaA,
    });

    const comentarioCompleto =
      await Comment.findById(
        comentario._id,
      ).populate(
        "autor",
        "nombre usuario foto",
      );

    let totalComentarios =
      contenidoPrincipal.comentarios ?? 0;

    // Las respuestas no aumentan el contador principal.
    if (!respuestaA) {
      totalComentarios =
        await sincronizarContadorComentarios(
          tipoContenido,
          contenidoId,
        );
    }

    return res.status(201).json({
      ok: true,
      mensaje: respuestaA
        ? "Respuesta publicada."
        : "Comentario publicado.",

      comentario: comentarioCompleto,
      totalComentarios,
    });
  } catch (error) {
    console.error(
      "Error creando comentario:",
      error,
    );

    return res.status(500).json({
      ok: false,
      mensaje:
        "No se pudo publicar el comentario.",
    });
  }
};

export const listarComentarios = async (req, res) => {
  try {
    const {
      tipoContenido,
      contenidoId,
    } = req.query;

    if (!tipoContenido || !contenidoId) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "Falta identificar el contenido.",
      });
    }

    const ModeloContenido =
      obtenerModeloContenido(tipoContenido);

    if (!ModeloContenido) {
      return res.status(400).json({
        ok: false,
        mensaje: "Tipo de contenido inválido.",
      });
    }

    const contenidoPrincipal =
      await ModeloContenido.findById(contenidoId);

    if (!contenidoPrincipal) {
      return res.status(404).json({
        ok: false,
        mensaje:
          "La publicación o reporte no existe.",
      });
    }

    const comentarios = await Comment.find({
      tipoContenido,
      contenidoId,
      estado: "publicado",
    })
      .populate(
        "autor",
        "nombre usuario foto",
      )
      .sort({
        createdAt: 1,
      });

    const totalComentarios =
      await sincronizarContadorComentarios(
        tipoContenido,
        contenidoId,
      );

    return res.status(200).json({
      ok: true,
      totalComentarios,
      comentarios,
    });
  } catch (error) {
    console.error(
      "Error listando comentarios:",
      error,
    );

    return res.status(500).json({
      ok: false,
      mensaje:
        "No se pudieron cargar los comentarios.",
    });
  }
};

export const eliminarComentario = async (
  req,
  res,
) => {
  try {
    const comentario = await Comment.findById(
      req.params.id,
    );

    if (!comentario) {
      return res.status(404).json({
        ok: false,
        mensaje: "El comentario no existe.",
      });
    }

    if (
      String(comentario.autor) !==
      String(req.usuario._id)
    ) {
      return res.status(403).json({
        ok: false,
        mensaje:
          "No puedes eliminar este comentario.",
      });
    }

    const eraComentarioPrincipal =
      !comentario.respuestaA;

    comentario.estado = "eliminado";
    await comentario.save();

    let totalComentarios = null;

    if (eraComentarioPrincipal) {
      totalComentarios =
        await sincronizarContadorComentarios(
          comentario.tipoContenido,
          comentario.contenidoId,
        );
    }

    return res.status(200).json({
      ok: true,
      mensaje: "Comentario eliminado.",
      comentarioId: comentario._id,
      totalComentarios,
    });
  } catch (error) {
    console.error(
      "Error eliminando comentario:",
      error,
    );

    return res.status(500).json({
      ok: false,
      mensaje:
        "No se pudo eliminar el comentario.",
    });
  }
};