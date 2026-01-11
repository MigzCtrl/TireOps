// Vehicle lookup using NHTSA API (free US government vehicle database)
// Docs: https://vpic.nhtsa.dot.gov/api/

const NHTSA_BASE_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles';

// Cache for API responses to reduce network calls
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

async function fetchWithCache<T>(url: string): Promise<T> {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('API request failed');
    const data = await response.json();
    cache.set(url, { data, timestamp: Date.now() });
    return data;
  } catch (error) {
    console.error('Vehicle API error:', error);
    throw error;
  }
}

interface NHTSAMake {
  Make_ID: number;
  Make_Name: string;
}

interface NHTSAModel {
  Model_ID: number;
  Model_Name: string;
  Make_Name?: string;
}

// Get all vehicle makes
export async function getAllMakes(): Promise<string[]> {
  try {
    const data = await fetchWithCache<{ Results: NHTSAMake[] }>(
      `${NHTSA_BASE_URL}/GetAllMakes?format=json`
    );
    return data.Results
      .map(m => m.Make_Name)
      .filter(name => name && name.length > 0)
      .sort();
  } catch {
    // Return common makes as fallback
    return COMMON_MAKES;
  }
}

// Get models for a specific make
export async function getModelsForMake(make: string): Promise<string[]> {
  if (!make) return [];
  try {
    const data = await fetchWithCache<{ Results: NHTSAModel[] }>(
      `${NHTSA_BASE_URL}/GetModelsForMake/${encodeURIComponent(make)}?format=json`
    );
    return data.Results
      .map(m => m.Model_Name)
      .filter(name => name && name.length > 0)
      .sort();
  } catch {
    return [];
  }
}

// Get models for a specific make and year
export async function getModelsForMakeYear(make: string, year: number): Promise<string[]> {
  if (!make || !year) return [];
  try {
    const data = await fetchWithCache<{ Results: NHTSAModel[] }>(
      `${NHTSA_BASE_URL}/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${year}?format=json`
    );
    return data.Results
      .map(m => m.Model_Name)
      .filter(name => name && name.length > 0)
      .sort();
  } catch {
    // Fall back to all models for make
    return getModelsForMake(make);
  }
}

// Common makes for fallback/quick suggestions
export const COMMON_MAKES = [
  'Acura', 'Audi', 'BMW', 'Buick', 'Cadillac', 'Chevrolet', 'Chrysler',
  'Dodge', 'Ford', 'GMC', 'Honda', 'Hyundai', 'Infiniti', 'Jeep', 'Kia',
  'Lexus', 'Lincoln', 'Mazda', 'Mercedes-Benz', 'Nissan', 'Ram', 'Subaru',
  'Tesla', 'Toyota', 'Volkswagen', 'Volvo'
];

// Generate year options (current year down to 1990)
export function getYearOptions(): number[] {
  const currentYear = new Date().getFullYear() + 1; // Include next year for new models
  const years: number[] = [];
  for (let year = currentYear; year >= 1990; year--) {
    years.push(year);
  }
  return years;
}

// Tire size recommendations based on vehicle type
// This is a heuristic based on common vehicle classifications
interface TireSizeRecommendation {
  primary: string;
  alternatives: string[];
}

export function getTireSizeRecommendation(make: string, model: string): TireSizeRecommendation {
  const modelLower = model.toLowerCase();
  const makeLower = make.toLowerCase();

  // Trucks
  if (
    modelLower.includes('f-150') || modelLower.includes('f150') ||
    modelLower.includes('f-250') || modelLower.includes('f250') ||
    modelLower.includes('f-350') || modelLower.includes('f350') ||
    modelLower.includes('silverado') || modelLower.includes('sierra') ||
    modelLower.includes('ram') || modelLower.includes('tundra') ||
    modelLower.includes('titan') || modelLower.includes('tacoma') ||
    modelLower.includes('colorado') || modelLower.includes('canyon') ||
    modelLower.includes('ranger') || modelLower.includes('frontier') ||
    modelLower.includes('ridgeline')
  ) {
    return {
      primary: '275/65R18',
      alternatives: ['265/70R17', '275/55R20', '285/60R20', '33X12.50R20', '275/60R20']
    };
  }

  // Full-size SUVs
  if (
    modelLower.includes('tahoe') || modelLower.includes('suburban') ||
    modelLower.includes('yukon') || modelLower.includes('expedition') ||
    modelLower.includes('sequoia') || modelLower.includes('armada') ||
    modelLower.includes('land cruiser') || modelLower.includes('escalade')
  ) {
    return {
      primary: '275/55R20',
      alternatives: ['275/60R20', '285/45R22', '265/60R18', '275/65R18']
    };
  }

  // Mid-size SUVs / Crossovers
  if (
    modelLower.includes('explorer') || modelLower.includes('4runner') ||
    modelLower.includes('highlander') || modelLower.includes('pilot') ||
    modelLower.includes('pathfinder') || modelLower.includes('palisade') ||
    modelLower.includes('telluride') || modelLower.includes('traverse') ||
    modelLower.includes('enclave') || modelLower.includes('atlas') ||
    modelLower.includes('grand cherokee') || modelLower.includes('durango')
  ) {
    return {
      primary: '265/50R20',
      alternatives: ['255/55R19', '265/60R18', '275/45R21', '245/60R18']
    };
  }

  // Compact SUVs / Crossovers
  if (
    modelLower.includes('rav4') || modelLower.includes('cr-v') || modelLower.includes('crv') ||
    modelLower.includes('cx-5') || modelLower.includes('cx5') ||
    modelLower.includes('tucson') || modelLower.includes('sportage') ||
    modelLower.includes('escape') || modelLower.includes('rogue') ||
    modelLower.includes('forester') || modelLower.includes('outback') ||
    modelLower.includes('equinox') || modelLower.includes('terrain') ||
    modelLower.includes('cherokee') || modelLower.includes('compass') ||
    modelLower.includes('tiguan') || modelLower.includes('santa fe') ||
    modelLower.includes('cx-50') || modelLower.includes('bronco sport')
  ) {
    return {
      primary: '235/65R17',
      alternatives: ['235/55R18', '235/60R18', '225/65R17', '245/55R19']
    };
  }

  // Sports / Performance cars
  if (
    modelLower.includes('mustang') || modelLower.includes('camaro') ||
    modelLower.includes('corvette') || modelLower.includes('challenger') ||
    modelLower.includes('charger') || modelLower.includes('supra') ||
    modelLower.includes('370z') || modelLower.includes('400z') ||
    modelLower.includes('86') || modelLower.includes('brz') ||
    modelLower.includes('miata') || modelLower.includes('mx-5') ||
    modelLower.includes('m3') || modelLower.includes('m4') ||
    modelLower.includes('m5') || modelLower.includes('amg') ||
    modelLower.includes('type r') || modelLower.includes('sti') ||
    modelLower.includes('wrx') || modelLower.includes('golf r') ||
    modelLower.includes('gti') || modelLower.includes('911')
  ) {
    return {
      primary: '255/35R19',
      alternatives: ['245/40R18', '255/40R19', '275/35R19', '285/30R20', '245/35R20']
    };
  }

  // Luxury sedans
  if (
    makeLower.includes('bmw') || makeLower.includes('mercedes') ||
    makeLower.includes('audi') || makeLower.includes('lexus') ||
    makeLower.includes('infiniti') || makeLower.includes('genesis') ||
    makeLower.includes('cadillac') || makeLower.includes('lincoln') ||
    makeLower.includes('acura') || makeLower.includes('volvo')
  ) {
    return {
      primary: '245/45R18',
      alternatives: ['225/45R18', '235/45R18', '245/40R19', '255/40R19']
    };
  }

  // Compact sedans
  if (
    modelLower.includes('civic') || modelLower.includes('corolla') ||
    modelLower.includes('mazda3') || modelLower.includes('elantra') ||
    modelLower.includes('forte') || modelLower.includes('sentra') ||
    modelLower.includes('impreza') || modelLower.includes('jetta') ||
    modelLower.includes('golf') || modelLower.includes('focus') ||
    modelLower.includes('cruze') || modelLower.includes('sonic')
  ) {
    return {
      primary: '205/55R16',
      alternatives: ['195/65R15', '215/50R17', '215/55R17', '225/45R17']
    };
  }

  // Mid-size sedans
  if (
    modelLower.includes('camry') || modelLower.includes('accord') ||
    modelLower.includes('altima') || modelLower.includes('sonata') ||
    modelLower.includes('k5') || modelLower.includes('optima') ||
    modelLower.includes('mazda6') || modelLower.includes('legacy') ||
    modelLower.includes('passat') || modelLower.includes('fusion') ||
    modelLower.includes('malibu') || modelLower.includes('maxima')
  ) {
    return {
      primary: '215/55R17',
      alternatives: ['205/65R16', '225/50R17', '225/45R18', '235/45R18']
    };
  }

  // Electric vehicles
  if (
    modelLower.includes('model 3') || modelLower.includes('model y') ||
    modelLower.includes('model s') || modelLower.includes('model x') ||
    modelLower.includes('mach-e') || modelLower.includes('ioniq') ||
    modelLower.includes('ev6') || modelLower.includes('id.4') ||
    modelLower.includes('bolt') || modelLower.includes('leaf') ||
    modelLower.includes('polestar') || modelLower.includes('rivian')
  ) {
    return {
      primary: '235/45R18',
      alternatives: ['235/40R19', '255/40R20', '245/45R19', '235/55R18']
    };
  }

  // Minivans
  if (
    modelLower.includes('sienna') || modelLower.includes('odyssey') ||
    modelLower.includes('pacifica') || modelLower.includes('carnival') ||
    modelLower.includes('sedona') || modelLower.includes('grand caravan')
  ) {
    return {
      primary: '235/60R18',
      alternatives: ['235/65R17', '235/55R18', '245/55R19', '225/65R17']
    };
  }

  // Default - mid-size sedan
  return {
    primary: '215/55R17',
    alternatives: ['205/55R16', '225/50R17', '215/60R16', '225/45R18']
  };
}

// Filter makes by search term
export function filterMakes(makes: string[], search: string): string[] {
  if (!search) return makes.slice(0, 10);
  const searchLower = search.toLowerCase();
  return makes
    .filter(make => make.toLowerCase().includes(searchLower))
    .slice(0, 10);
}

// Filter models by search term
export function filterModels(models: string[], search: string): string[] {
  if (!search) return models.slice(0, 10);
  const searchLower = search.toLowerCase();
  return models
    .filter(model => model.toLowerCase().includes(searchLower))
    .slice(0, 10);
}
