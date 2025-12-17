// src/features/lr-generator/templates/helpers.ts

export const parseCargoAndMaterials = (cargoUnits?: string, materials?: string) => {
  const cargoArray = cargoUnits ? cargoUnits.split(',').map(c => c.trim()) : [];
  const materialArray = materials ? materials.split(',').map(m => m.trim()) : [];

  const result = [];
  const maxLength = Math.max(cargoArray.length, materialArray.length, 1);

  for (let i = 0; i < maxLength; i++) {
    result.push({
      cargo: cargoArray[i] || '-',
      material: materialArray[i] || '-'
    });
  }

  return result;
};

export const formatDate = (dateString?: string) => {
  if (!dateString) return new Date().toLocaleDateString('en-IN');
  try {
    return new Date(dateString).toLocaleDateString('en-IN');
  } catch {
    return dateString;
  }
};

export const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

export const applyTextColor = (doc: any, color: string) => {
  const rgb = hexToRgb(color);
  doc.setTextColor(rgb.r, rgb.g, rgb.b);
};

export const resetTextColor = (doc: any) => {
  doc.setTextColor(0, 0, 0);
};