/**
 * Escapes a value for safe inclusion in a CSV cell.
 *
 * Defends against two classes of issues:
 *
 * 1. CSV-Injection (a.k.a. Formula-Injection): If a cell value begins with
 *    `=`, `+`, `-`, `@`, TAB, or CR, spreadsheet applications (Excel, Google
 *    Sheets, LibreOffice) may evaluate the cell as a formula. User-controlled
 *    input (display names, email content, etc.) can therefore execute
 *    arbitrary functions when an admin opens the file. We prefix such values
 *    with a single quote (`'`), which most spreadsheets treat as
 *    "interpret as plain text".
 *
 * 2. RFC 4180 quoting: If the value contains `"`, `,`, `\n`, or `\r`, the
 *    cell is wrapped in `"..."` and any embedded `"` is doubled to `""`.
 *
 * `null` and `undefined` are normalized to an empty string.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return ''

  let str = typeof value === 'string' ? value : String(value)

  // Formula-injection guard: prefix with a single quote so spreadsheets
  // treat the cell as text. Covers leading TAB and CR as well, which some
  // tools strip silently before evaluating the formula.
  if (str.length > 0 && /^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`
  }

  // RFC 4180 quoting.
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }

  return str
}
