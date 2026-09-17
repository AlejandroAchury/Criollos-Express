const RegistroPedidos = require('./RegistroPedidos');


class RegistroUnico extends RegistroPedidos {
  obtenerNombreTabla() {
    return 'pedidos';
  }
}

module.exports = RegistroUnico;
