const RegistroPedidos = require('./RegistroPedidos');


class RegistroPorDia extends RegistroPedidos {
  obtenerNombreTabla() {
    const hoy = new Date();
    const ano = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `pedidos_${ano}_${mes}_${dia}`;
  }
}

module.exports = RegistroPorDia;
