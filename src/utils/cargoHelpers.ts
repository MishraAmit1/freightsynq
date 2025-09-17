// utils/cargoHelpers.ts
export const parseCargoData = (cargoUnits: string, materialDescription: string) => {
  const units = cargoUnits.split(',').map(u => u.trim());
  const materials = materialDescription.split(',').map(m => m.trim());
  
  return units.map((unit, index) => ({
    unit,
    material: materials[index] || ''
  }));
};

export const formatCargoDisplay = (cargoUnits: string, materialDescription: string) => {
  const parsed = parseCargoData(cargoUnits, materialDescription);
  return parsed.map(item => `${item.unit} - ${item.material}`).join('\n');
};