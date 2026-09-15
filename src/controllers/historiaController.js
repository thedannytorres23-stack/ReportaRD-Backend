import Historia from "../models/Historia.js";

const poblarAutor = {
  path: "autor",
  select: "nombre usuario foto ubicacion",
};

const TEMAS_PERMITIDOS = [
  "azul",
  "verde",
  "naranja",
  "violeta",
];

const TIPOS_MEDIA_PERMITIDOS = [
  "imagen",
  "video",
];

const limitarNumero = (
  valor,
  minimo,
  maximo,
  valorPredeterminado,
) => {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return valorPredeterminado;
  }

  return Math.min(
    maximo,
    Math.max(minimo, numero),
  );
};


// ==========================================
// LISTAR HISTORIAS
// ==========================================

export const listarHistorias = async (
  req,
  res,
) => {
  try {
    const usuarioId =
      req.usuario._id.toString();

    const historias = await Historia.find({
      expiraEn: {
        $gt: new Date(),
      },
    })
      .populate(poblarAutor)
      .sort({
        createdAt: -1,
      });

    const historiasPreparadas =
      historias.map((historia) => {
        const objeto = historia.toObject({
          virtuals: true,
        });

        const autorId =
          historia.autor?._id?.toString() ||
          historia.autor?.toString();

        const esPropia =
          autorId === usuarioId;

        const vistaPorMi =
          esPropia ||
          historia.vistoPor.some(
            (id) =>
              id.toString() === usuarioId,
          );

        return {
          ...objeto,

          vistas:
            historia.vistoPor.length,

          vistaPorMi,
        };
      });

    return res.json({
      historias: historiasPreparadas,
    });
  } catch (error) {
    console.error(
      "Error listando historias:",
      error,
    );

    return res.status(500).json({
      mensaje:
        "No se pudieron cargar las historias.",
    });
  }
};


// ==========================================
// CREAR HISTORIA
// ==========================================

export const crearHistoria = async (
  req,
  res,
) => {
  try {
    const {
      texto = "",
      mediaUrl = "",
      mediaTipo = null,
      tema = "azul",

      // Personalización
      textoX = 50,
      textoY = 58,
      textoTamano = 1,
    } = req.body;

    const textoLimpio =
      typeof texto === "string"
        ? texto.trim()
        : "";

    const mediaLimpia =
      typeof mediaUrl === "string"
        ? mediaUrl.trim()
        : "";

    if (!textoLimpio && !mediaLimpia) {
      return res.status(400).json({
        mensaje:
          "La historia debe contener texto, imagen o video.",
      });
    }

    if (textoLimpio.length > 280) {
      return res.status(400).json({
        mensaje:
          "El texto de la historia no puede superar los 280 caracteres.",
      });
    }

    let tipoFinal = null;

    if (mediaLimpia) {
      if (
        !TIPOS_MEDIA_PERMITIDOS.includes(
          mediaTipo,
        )
      ) {
        return res.status(400).json({
          mensaje:
            "El tipo de archivo de la historia no es válido.",
        });
      }

      tipoFinal = mediaTipo;
    }

    const temaFinal =
      TEMAS_PERMITIDOS.includes(tema)
        ? tema
        : "azul";

    const historia = await Historia.create({
      autor: req.usuario._id,

      texto: textoLimpio,

      mediaUrl: mediaLimpia,

      mediaTipo: tipoFinal,

      tema: temaFinal,

      textoX: limitarNumero(
        textoX,
        5,
        95,
        50,
      ),

      textoY: limitarNumero(
        textoY,
        8,
        92,
        58,
      ),

      textoTamano: limitarNumero(
        textoTamano,
        0.6,
        1.8,
        1,
      ),
    });

    await historia.populate(poblarAutor);

    const objeto =
      historia.toObject({
        virtuals: true,
      });

    return res.status(201).json({
      mensaje:
        "Historia publicada.",

      historia: {
        ...objeto,

        vistas: 0,

        // Es nuestra propia historia.
        // No necesita aro de "no vista".
        vistaPorMi: true,
      },
    });
  } catch (error) {
    console.error(
      "Error creando historia:",
      error,
    );

    if (
      error?.name ===
      "ValidationError"
    ) {
      return res.status(400).json({
        mensaje:
          error.message ||
          "Los datos de la historia no son válidos.",
      });
    }

    return res.status(500).json({
      mensaje:
        "No se pudo publicar la historia.",
    });
  }
};


// ==========================================
// REGISTRAR VISTA
// ==========================================

export const registrarVista = async (
  req,
  res,
) => {
  try {
    const usuarioId =
      req.usuario._id;

    const historia =
      await Historia.findOne({
        _id: req.params.id,

        expiraEn: {
          $gt: new Date(),
        },
      });

    if (!historia) {
      return res.status(404).json({
        mensaje:
          "Historia no encontrada o expirada.",
      });
    }

    const esPropia =
      historia.autor.toString() ===
      usuarioId.toString();

    // No contamos al autor como vista.
    if (!esPropia) {
      await Historia.updateOne(
        {
          _id: historia._id,
        },
        {
          $addToSet: {
            vistoPor: usuarioId,
          },
        },
      );
    }

    const historiaActualizada =
      await Historia.findById(
        historia._id,
      ).select("vistoPor");

    return res.json({
      vistas:
        historiaActualizada?.vistoPor
          ?.length || 0,

      // Le permite al frontend cambiar
      // inmediatamente el aro del Home.
      vistaPorMi: true,
    });
  } catch (error) {
    console.error(
      "Error registrando vista:",
      error,
    );

    return res.status(500).json({
      mensaje:
        "No se pudo registrar la vista.",
    });
  }
};


// ==========================================
// ELIMINAR HISTORIA
// ==========================================

export const eliminarHistoria = async (
  req,
  res,
) => {
  try {
    const historia =
      await Historia.findById(
        req.params.id,
      );

    if (!historia) {
      return res.status(404).json({
        mensaje:
          "Historia no encontrada.",
      });
    }

    if (
      historia.autor.toString() !==
      req.usuario._id.toString()
    ) {
      return res.status(403).json({
        mensaje:
          "No puedes eliminar esta historia.",
      });
    }

    await historia.deleteOne();

    return res.json({
      mensaje:
        "Historia eliminada correctamente.",
    });
  } catch (error) {
    console.error(
      "Error eliminando historia:",
      error,
    );

    return res.status(500).json({
      mensaje:
        "No se pudo eliminar la historia.",
    });
  }
};