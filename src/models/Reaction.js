import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema(
  {
    autor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    tipoContenido: {
      type: String,
      enum: ["post", "report"],
      required: true,
      index: true,
    },

    contenidoId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    tipoReaccion: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

reactionSchema.index(
  {
    autor: 1,
    tipoContenido: 1,
    contenidoId: 1,
  },
  {
    unique: true,
  },
);

reactionSchema.index({
  tipoContenido: 1,
  contenidoId: 1,
  tipoReaccion: 1,
});

const Reaction = mongoose.model(
  "Reaction",
  reactionSchema,
);

export default Reaction;