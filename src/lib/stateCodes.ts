// lib/stateCodes.ts
export const STATE_CODES: Record<string, number> = {
    'Jammu and Kashmir': 1,
    'Himachal Pradesh': 2,
    'Punjab': 3,
    'Chandigarh': 4,
    'Uttarakhand': 5,
    'Haryana': 6,
    'Delhi': 7,
    'Rajasthan': 8,
    'Uttar Pradesh': 9,
    'Bihar': 10,
    'Sikkim': 11,
    'Arunachal Pradesh': 12,
    'Nagaland': 13,
    'Manipur': 14,
    'Mizoram': 15,
    'Tripura': 16,
    'Meghalaya': 17,
    'Assam': 18,
    'West Bengal': 19,
    'Jharkhand': 20,
    'Odisha': 21,
    'Chhattisgarh': 22,
    'Madhya Pradesh': 23,
    'Gujarat': 24,
    'Daman and Diu': 25,
    'Dadra and Nagar Haveli': 26,
    'Maharashtra': 27,
    'Andhra Pradesh': 28,
    'Karnataka': 29,
    'Goa': 30,
    'Lakshadweep': 31,
    'Kerala': 32,
    'Tamil Nadu': 33,
    'Puducherry': 34,
    'Andaman and Nicobar Islands': 35,
    'Telangana': 36,
    'Andhra Pradesh (New)': 37,
    'Ladakh': 38
};

export function getStateCode(stateName: string): number {
    const normalized = stateName.trim();
    return STATE_CODES[normalized] || 0;
}

export function getStateName(stateCode: number): string {
    const entry = Object.entries(STATE_CODES).find(([_, code]) => code === stateCode);
    return entry ? entry[0] : '';
}