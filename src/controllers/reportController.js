import Report from "../models/Report.js";

const escaparRegex = (texto = "") => {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const listarReportes = async (req, res) => {
  try {
    const buscar = req.query.buscar?.trim() || "";

    const limite = Math.min(
      Number(req.query.limite) || 30,
      50,
    );

    const filtro = {
      estado: {
        $ne: "rechazado",
      },
    };

    if (buscar) {
      const expresion = new RegExp(
        escaparRegex(buscar),
        "i",
      );

      filtro.$or = [
        { titulo: expresion },
        { descripcion: expresion },
        { categoria: expresion },
        { ubicacion: expresion },
      ];
    }

    const reportes = await Report.find(filtro)
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
      total: reportes.length,
      reportes,
    });
  } catch (error) {
    console.error(
      "Error listando reportes:",
      error.message,
    );

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudieron obtener los reportes.",
    });
  }
};

export const crearReporte = async (req, res) => {
  try {
    const {
      titulo,
      descripcion,
      categoria,
      ubicacion,
      coordenadas,
      mediaUrl,
      mediaTipo,
    } = req.body;

    if (
      !titulo?.trim() ||
      !descripcion?.trim() ||
      !categoria?.trim() ||
      !ubicacion?.trim()
    ) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "Título, descripción, categoría y ubicación son obligatorios.",
      });
    }

    const reporte = await Report.create({
      autor: req.usuario._id,
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      categoria: categoria.trim(),
      ubicacion: ubicacion.trim(),
      coordenadas,
      mediaUrl,
      mediaTipo,
    });

    await reporte.populate(
      "autor",
      "nombre usuario foto activo",
    );

    return res.status(201).json({
      ok: true,
      mensaje: "Reporte creado correctamente.",
      reporte,
    });
  } catch (error) {
    console.error(
      "Error creando reporte:",
      error.message,
    );

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo crear el reporte.",
    });
  }
};