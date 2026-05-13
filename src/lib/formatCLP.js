// Formatea número como moneda chilena: $150.000
export const clp = (valor) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(valor || 0)

// Solo número con puntos: 150.000
export const num = (valor) =>
  new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(valor || 0)