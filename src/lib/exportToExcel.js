import * as XLSX from 'xlsx'

export const exportToExcel = (data, filename, sheetName = 'Datos') => {
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

export const exportMultipleSheets = (sheets, filename) => {
  const wb = XLSX.utils.book_new()
  sheets.forEach(({ name, data }) => {
    const ws = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, name)
  })
  XLSX.writeFile(wb, `${filename}.xlsx`)
}
