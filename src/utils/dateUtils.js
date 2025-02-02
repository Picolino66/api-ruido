// src/utils/dateUtils.js
export const parseDateParts = (dateString) => {
    const dateObj = new Date(dateString);
    if (isNaN(dateObj.getTime())) {
      return null;
    }
    const data = dateObj.toISOString().split('T')[0]; // Formato YYYY-MM-DD
    const hora = String(dateObj.getUTCHours()).padStart(2, '0');
    const minuto = String(dateObj.getUTCMinutes()).padStart(2, '0');
    return { data, hora, minuto };
  };
  