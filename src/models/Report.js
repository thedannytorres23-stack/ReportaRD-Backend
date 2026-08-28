import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    autor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    comentarios: {
      type: Number,
      min: 0,
      default: 0,
    },

    titulo: {
      type: String,
      required: [true, "El título es obligatorio"],
      trim: true,
      maxlength: 140,
    },

    descripcion: {
      type: String,
      required: [true, "La descripción es obligatoria"],
      trim: true,
      maxlength: 3000,
    },

    categoria: {
      type: String,
      required: [true, "La categoría es obligatoria"],
      trim: true,
      maxlength: 60,
      index: true,
    },

    ubicacion: {
      type: String,
      required: [true, "La ubicación es obligatoria"],
      trim: true,
      maxlength: 180,
    },

    coordenadas: {
      latitud: {
        type: Number,
        default: null,
      },

      longitud: {
        type: Number,
        default: null,
      },
    },

    mediaUrl: {
      type: String,
      trim: true,
      default: "",
    },

    mediaTipo: {
      type: String,
      enum: ["", "imagen", "video"],
      default: "",
    },

    estado: {
      type: String,
      enum: [
        "pendiente",
        "en_revision",
        "resuelto",
        "rechazado",
      ],
      default: "pendiente",
      index: true,
    },

    confirmaciones: {
      type: Number,
      min: 0,
      default: 0,
    },

    confirmadoPor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

  },
  {
    timestamps: true,
    versionKey: false,
  },
);

reportSchema.index({
  titulo: "text",
  descripcion: "text",
  categoria: "text",
  ubicacion: "text",
});

const Report = mongoose.model("Report", reportSchema);

export default Report;