import mongoose from "mongoose";

const historiaSchema = new mongoose.Schema(
  {
    autor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    texto: {
      type: String,
      trim: true,
      maxlength: 280,
      default: "",
    },

    mediaUrl: {
      type: String,
      trim: true,
      default: "",
    },

    mediaTipo: {
      type: String,
      enum: ["imagen", "video", null],
      default: null,
    },

    tema: {
      type: String,
      enum: [
        "azul",
        "verde",
        "naranja",
        "violeta",
      ],
      default: "azul",
    },

    // Posición horizontal del texto.
    // Se guarda en porcentaje.
    textoX: {
      type: Number,
      min: 5,
      max: 95,
      default: 50,
    },

    // Posición vertical del texto.
    // Se guarda en porcentaje.
    textoY: {
      type: Number,
      min: 8,
      max: 92,
      default: 58,
    },

    // Tamaño elegido por el usuario.
    // 1 = tamaño normal.
    textoTamano: {
      type: Number,
      min: 0.6,
      max: 1.8,
      default: 1,
    },

    // Usuarios reales que vieron la historia.
    vistoPor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // La historia expira automáticamente
    // después de 24 horas.
    expiraEn: {
      type: Date,
      default: () =>
        new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ),
      index: {
        expires: 0,
      },
    },
  },
  {
    timestamps: true,
  },
);

// Historias más recientes primero.
historiaSchema.index({
  createdAt: -1,
});

historiaSchema.index({
  autor: 1,
  createdAt: -1,
});

// Cantidad real de vistas.
historiaSchema.virtual("vistas").get(
  function obtenerVistas() {
    return this.vistoPor?.length || 0;
  },
);

historiaSchema.set("toJSON", {
  virtuals: true,
});

historiaSchema.set("toObject", {
  virtuals: true,
});

const Historia = mongoose.model(
  "Historia",
  historiaSchema,
);

export default Historia;