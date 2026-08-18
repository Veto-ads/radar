export function exportTableToExcel(
  fileName: string,
  headers: string[],
  rows: (string | number)[][]
) {
  const headerHtml = headers.map((h) => `<th>${h}</th>`).join("");
  const rowsHtml = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell ?? ""}</td>`).join("")}</tr>`)
    .join("");

  const html = `<html dir="rtl"><head><meta charset="UTF-8"></head><body>
    <table border="1"><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>
  </body></html>`;

  const blob = new Blob(["﻿" + html], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
