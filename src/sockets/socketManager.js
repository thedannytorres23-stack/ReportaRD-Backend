let io = null;

export const establecerSocketIO = (instanciaIO) => {
  io = instanciaIO;
};

export const obtenerSocketIO = () => {
  return io;
};