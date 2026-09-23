// Convierte un número a letras en español (para "SON: ...")
const UNIDADES = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
const DECENAS = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const ESPECIALES = {
  11: 'ONCE', 12: 'DOCE', 13: 'TRECE', 14: 'CATORCE', 15: 'QUINCE',
  16: 'DIECISEIS', 17: 'DIECISIETE', 18: 'DIECIOCHO', 19: 'DIECINUEVE',
  21: 'VEINTIUNO', 22: 'VEINTIDOS', 23: 'VEINTITRES', 24: 'VEINTICUATRO',
  25: 'VEINTICINCO', 26: 'VEINTISEIS', 27: 'VEINTISIETE', 28: 'VEINTIOCHO',
  29: 'VEINTINUEVE',
};
const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function centenasALetras(n) {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';
  const c = Math.floor(n / 100);
  const resto = n % 100;
  let texto = CENTENAS[c];
  if (resto > 0) {
    if (ESPECIALES[resto]) texto += ' ' + ESPECIALES[resto];
    else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      if (d > 0) texto += ' ' + DECENAS[d];
      if (u > 0) texto += ' Y ' + UNIDADES[u];
    }
  }
  return texto.trim();
}

function numeroALetras(numero) {
  const entero = Math.floor(numero);
  const centavos = Math.round((numero - entero) * 100);

  if (entero === 0) {
    return `CERO ${centavos.toString().padStart(2, '0')}/100 BOLIVIANOS`;
  }

  let texto = '';

  const millones = Math.floor(entero / 1000000);
  const miles = Math.floor((entero % 1000000) / 1000);
  const resto = entero % 1000;

  if (millones > 0) {
    texto += millones === 1 ? 'UN MILLON' : `${centenasALetras(millones)} MILLONES`;
  }
  if (miles > 0) {
    texto += (texto ? ' ' : '') + (miles === 1 ? 'MIL' : `${centenasALetras(miles)} MIL`);
  }
  if (resto > 0) {
    texto += (texto ? ' ' : '') + centenasALetras(resto);
  }

  return `${texto} ${centavos.toString().padStart(2, '0')}/100 BOLIVIANOS`;
}

module.exports = { numeroALetras };