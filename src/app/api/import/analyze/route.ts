import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import * as XLSX from 'xlsx';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Google Cloud Vision API for OCR (much better at handwriting recognition)
async function extractTextWithVisionAPI(base64Data: string): Promise<string | null> {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;

  if (!apiKey) {
    console.log('[Vision API] No API key found, skipping Vision OCR');
    return null;
  }

  try {
    console.log('[Vision API] Sending image for text extraction...');

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64Data,
              },
              features: [
                {
                  type: 'DOCUMENT_TEXT_DETECTION',
                  maxResults: 1,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Vision API] Error response:', errorText);
      return null;
    }

    const result = await response.json();

    // Extract the full text from the response
    const textAnnotation = result.responses?.[0]?.fullTextAnnotation?.text;

    if (textAnnotation) {
      console.log('[Vision API] Successfully extracted text:', textAnnotation.substring(0, 200) + '...');
      return textAnnotation;
    }

    // Fallback to text annotations if fullTextAnnotation is not available
    const textAnnotations = result.responses?.[0]?.textAnnotations;
    if (textAnnotations && textAnnotations.length > 0) {
      const extractedText = textAnnotations[0].description;
      console.log('[Vision API] Extracted text (fallback):', extractedText?.substring(0, 200) + '...');
      return extractedText || null;
    }

    console.log('[Vision API] No text found in image');
    return null;
  } catch (error) {
    console.error('[Vision API] Failed to extract text:', error);
    return null;
  }
}

type ImportType = 'customers' | 'inventory';

interface VehicleData {
  year: number | null;
  make: string;
  model: string;
  trim: string;
  tire_size: string;
  plate: string;
  vin: string;
}

interface CustomerData {
  name: string;
  phone: string;
  email: string;
  vehicle?: VehicleData; // Optional vehicle linked to customer
}

interface InventoryData {
  brand: string;
  model: string;
  size: string;
  quantity: number;
  price: number;
}

// ============ DATA CLEANING & NORMALIZATION ============

// Convert to Title Case (john doe -> John Doe)
function toTitleCase(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Remove extra spaces
    .replace(/\b\w/g, char => char.toUpperCase());
}

// Clean and format phone numbers (remove non-digits, format as needed)
function cleanPhone(phone: string): string {
  if (!phone) return '';
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // If it's a 10-digit US number, format it
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  // If it's 11 digits starting with 1, format without the 1
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  // Otherwise return cleaned digits
  return digits;
}

// Clean and normalize email (lowercase, trim)
function cleanEmail(email: string): string {
  if (!email) return '';
  return email.toLowerCase().trim();
}

// Clean brand names (Title Case, trim)
function cleanBrand(brand: string): string {
  if (!brand) return '';
  // Handle common abbreviations that should stay uppercase
  const upperCaseBrands = ['BFG', 'BF', 'GT'];
  const cleaned = brand.trim().replace(/\s+/g, ' ');

  // Check if it's a known uppercase brand
  if (upperCaseBrands.includes(cleaned.toUpperCase())) {
    return cleaned.toUpperCase();
  }

  return toTitleCase(cleaned);
}

// Clean tire size (uppercase, standardize format)
function cleanTireSize(size: string): string {
  if (!size) return '';
  // Remove extra spaces, uppercase
  return size.trim().replace(/\s+/g, '').toUpperCase();
}

// Clean license plate (uppercase, remove special chars except dash)
function cleanPlate(plate: string): string {
  if (!plate) return '';
  return plate.trim().toUpperCase().replace(/[^A-Z0-9\-]/g, '');
}

// Clean VIN (uppercase, 17 chars, alphanumeric only)
function cleanVIN(vin: string): string {
  if (!vin) return '';
  const cleaned = vin.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  // VINs are 17 characters
  return cleaned.length === 17 ? cleaned : cleaned;
}

// Clean year (validate it's a reasonable vehicle year)
function cleanYear(year: number | string | null): number | null {
  if (!year) return null;
  const numYear = typeof year === 'string' ? parseInt(year) : year;
  // Valid years: 1900-2030
  if (numYear >= 1900 && numYear <= 2030) {
    return numYear;
  }
  return null;
}

// Normalize vehicle data
function normalizeVehicle(vehicle: VehicleData | undefined): VehicleData | undefined {
  if (!vehicle) return undefined;
  // Only return vehicle if it has at least make or model
  if (!vehicle.make && !vehicle.model && !vehicle.tire_size) return undefined;

  return {
    year: cleanYear(vehicle.year),
    make: toTitleCase(vehicle.make || ''),
    model: toTitleCase(vehicle.model || ''),
    trim: toTitleCase(vehicle.trim || ''),
    tire_size: cleanTireSize(vehicle.tire_size || ''),
    plate: cleanPlate(vehicle.plate || ''),
    vin: cleanVIN(vehicle.vin || ''),
  };
}

// Clean and normalize customer data
function normalizeCustomer(customer: CustomerData): CustomerData {
  const normalized: CustomerData = {
    name: toTitleCase(customer.name),
    phone: cleanPhone(customer.phone),
    email: cleanEmail(customer.email),
  };

  const normalizedVehicle = normalizeVehicle(customer.vehicle);
  if (normalizedVehicle) {
    normalized.vehicle = normalizedVehicle;
  }

  return normalized;
}

// Clean and normalize inventory data
function normalizeInventory(item: InventoryData): InventoryData {
  return {
    brand: cleanBrand(item.brand),
    model: toTitleCase(item.model),
    size: cleanTireSize(item.size),
    quantity: Math.max(0, Math.round(item.quantity || 0)),
    price: Math.max(0, Math.round((item.price || 0) * 100) / 100), // Round to 2 decimal places
  };
}

// ============ END DATA CLEANING ============

// Parse CSV text
function parseCSV(text: string, type: ImportType): CustomerData[] | InventoryData[] {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));

  if (type === 'customers') {
    // Customer fields
    const nameIdx = headers.findIndex(h => h === 'name' || h === 'customer name' || h === 'full name' || h === 'customer');
    const phoneIdx = headers.findIndex(h => h === 'phone' || h === 'phone number' || h === 'mobile' || h === 'tel');
    const emailIdx = headers.findIndex(h => h === 'email' || h === 'email address' || h === 'e-mail');

    // Vehicle fields
    const yearIdx = headers.findIndex(h => h === 'year' || h === 'vehicle year' || h === 'car year');
    const makeIdx = headers.findIndex(h => h === 'make' || h === 'vehicle make' || h === 'car make' || h === 'manufacturer');
    const modelIdx = headers.findIndex(h => h === 'model' || h === 'vehicle model' || h === 'car model');
    const trimIdx = headers.findIndex(h => h === 'trim' || h === 'vehicle trim' || h === 'package');
    const tireSizeIdx = headers.findIndex(h => h === 'tire size' || h === 'tiresize' || h === 'tire_size' || h === 'size');
    const plateIdx = headers.findIndex(h => h === 'plate' || h === 'license' || h === 'license plate' || h === 'tag');
    const vinIdx = headers.findIndex(h => h === 'vin' || h === 'vehicle vin');
    const vehicleIdx = headers.findIndex(h => h === 'vehicle' || h === 'car'); // Combined "2019 Honda Accord" format

    if (nameIdx === -1) return [];

    return lines.slice(1).map(line => {
      const values = parseCSVLine(line);
      const customer: CustomerData = {
        name: values[nameIdx] || '',
        phone: phoneIdx !== -1 ? values[phoneIdx] || '' : '',
        email: emailIdx !== -1 ? values[emailIdx] || '' : '',
      };

      // Check if any vehicle data exists
      const hasVehicleData = yearIdx !== -1 || makeIdx !== -1 || modelIdx !== -1 ||
                            tireSizeIdx !== -1 || plateIdx !== -1 || vinIdx !== -1 || vehicleIdx !== -1;

      if (hasVehicleData) {
        let year: number | null = null;
        let make = '';
        let model = '';

        // Try to parse combined vehicle field first (e.g., "2019 Honda Accord")
        if (vehicleIdx !== -1 && values[vehicleIdx]) {
          const vehicleStr = values[vehicleIdx].trim();
          const vehicleMatch = vehicleStr.match(/^(\d{4})?\s*([A-Za-z]+)?\s*(.+)?$/);
          if (vehicleMatch) {
            if (vehicleMatch[1]) year = parseInt(vehicleMatch[1]);
            if (vehicleMatch[2]) make = vehicleMatch[2];
            if (vehicleMatch[3]) model = vehicleMatch[3];
          }
        }

        // Override with specific columns if present
        if (yearIdx !== -1 && values[yearIdx]) year = parseInt(values[yearIdx]) || null;
        if (makeIdx !== -1 && values[makeIdx]) make = values[makeIdx];
        if (modelIdx !== -1 && values[modelIdx]) model = values[modelIdx];

        // Only add vehicle if we have meaningful data
        if (make || model || (tireSizeIdx !== -1 && values[tireSizeIdx])) {
          customer.vehicle = {
            year,
            make,
            model,
            trim: trimIdx !== -1 ? values[trimIdx] || '' : '',
            tire_size: tireSizeIdx !== -1 ? values[tireSizeIdx] || '' : '',
            plate: plateIdx !== -1 ? values[plateIdx] || '' : '',
            vin: vinIdx !== -1 ? values[vinIdx] || '' : '',
          };
        }
      }

      return customer;
    }).filter(c => c.name) as CustomerData[];
  } else {
    const brandIdx = headers.findIndex(h => h === 'brand' || h === 'manufacturer' || h === 'make');
    const modelIdx = headers.findIndex(h => h === 'model' || h === 'name' || h === 'tire name' || h === 'product');
    const sizeIdx = headers.findIndex(h => h === 'size' || h === 'tire size' || h === 'dimensions');
    const qtyIdx = headers.findIndex(h => h === 'quantity' || h === 'qty' || h === 'stock' || h === 'count');
    const priceIdx = headers.findIndex(h => h === 'price' || h === 'cost' || h === 'unit price' || h === 'retail');

    if (brandIdx === -1 || sizeIdx === -1) return [];

    return lines.slice(1).map(line => {
      const values = parseCSVLine(line);
      return {
        brand: values[brandIdx] || '',
        model: modelIdx !== -1 ? values[modelIdx] || '' : '',
        size: values[sizeIdx] || '',
        quantity: qtyIdx !== -1 ? parseInt(values[qtyIdx]) || 0 : 0,
        price: priceIdx !== -1 ? parseFloat(values[priceIdx]?.replace(/[$,]/g, '')) || 0 : 0,
      };
    }).filter(i => i.brand && i.size) as InventoryData[];
  }
}

// Parse a CSV line handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Parse Excel file
function parseExcel(buffer: ArrayBuffer, type: ImportType): CustomerData[] | InventoryData[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];

  if (jsonData.length < 2) return [];

  const headers = jsonData[0].map(h => String(h || '').toLowerCase().trim());

  if (type === 'customers') {
    // Customer fields
    const nameIdx = headers.findIndex(h => h.includes('name') || h === 'customer');
    const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('mobile') || h === 'tel');
    const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('e-mail'));

    // Vehicle fields
    const yearIdx = headers.findIndex(h => h === 'year' || h.includes('vehicle year') || h.includes('car year'));
    const makeIdx = headers.findIndex(h => h === 'make' || h.includes('vehicle make') || h.includes('car make'));
    const modelIdx = headers.findIndex(h => h === 'model' || h.includes('vehicle model') || h.includes('car model'));
    const trimIdx = headers.findIndex(h => h === 'trim' || h.includes('vehicle trim') || h.includes('package'));
    const tireSizeIdx = headers.findIndex(h => h.includes('tire size') || h === 'tiresize' || h === 'tire_size');
    const plateIdx = headers.findIndex(h => h.includes('plate') || h.includes('license') || h === 'tag');
    const vinIdx = headers.findIndex(h => h === 'vin' || h.includes('vehicle vin'));
    const vehicleIdx = headers.findIndex(h => h === 'vehicle' || h === 'car');

    if (nameIdx === -1) return [];

    return jsonData.slice(1).map(row => {
      const customer: CustomerData = {
        name: String(row[nameIdx] || '').trim(),
        phone: phoneIdx !== -1 ? String(row[phoneIdx] || '').trim() : '',
        email: emailIdx !== -1 ? String(row[emailIdx] || '').trim() : '',
      };

      // Check if any vehicle data exists
      const hasVehicleData = yearIdx !== -1 || makeIdx !== -1 || modelIdx !== -1 ||
                            tireSizeIdx !== -1 || plateIdx !== -1 || vinIdx !== -1 || vehicleIdx !== -1;

      if (hasVehicleData) {
        let year: number | null = null;
        let make = '';
        let model = '';

        // Try to parse combined vehicle field
        if (vehicleIdx !== -1 && row[vehicleIdx]) {
          const vehicleStr = String(row[vehicleIdx]).trim();
          const vehicleMatch = vehicleStr.match(/^(\d{4})?\s*([A-Za-z]+)?\s*(.+)?$/);
          if (vehicleMatch) {
            if (vehicleMatch[1]) year = parseInt(vehicleMatch[1]);
            if (vehicleMatch[2]) make = vehicleMatch[2];
            if (vehicleMatch[3]) model = vehicleMatch[3];
          }
        }

        // Override with specific columns
        if (yearIdx !== -1 && row[yearIdx]) year = parseInt(String(row[yearIdx])) || null;
        if (makeIdx !== -1 && row[makeIdx]) make = String(row[makeIdx]).trim();
        if (modelIdx !== -1 && row[modelIdx]) model = String(row[modelIdx]).trim();

        // Only add vehicle if we have meaningful data
        if (make || model || (tireSizeIdx !== -1 && row[tireSizeIdx])) {
          customer.vehicle = {
            year,
            make,
            model,
            trim: trimIdx !== -1 ? String(row[trimIdx] || '').trim() : '',
            tire_size: tireSizeIdx !== -1 ? String(row[tireSizeIdx] || '').trim() : '',
            plate: plateIdx !== -1 ? String(row[plateIdx] || '').trim() : '',
            vin: vinIdx !== -1 ? String(row[vinIdx] || '').trim() : '',
          };
        }
      }

      return customer;
    }).filter(c => c.name) as CustomerData[];
  } else {
    const brandIdx = headers.findIndex(h => h.includes('brand') || h.includes('manufacturer') || h === 'make');
    const modelIdx = headers.findIndex(h => h.includes('model') || h.includes('product') || h === 'tire name');
    const sizeIdx = headers.findIndex(h => h.includes('size') || h.includes('dimension'));
    const qtyIdx = headers.findIndex(h => h.includes('qty') || h.includes('quantity') || h.includes('stock'));
    const priceIdx = headers.findIndex(h => h.includes('price') || h.includes('cost') || h.includes('retail'));

    if (brandIdx === -1 || sizeIdx === -1) return [];

    return jsonData.slice(1).map(row => ({
      brand: String(row[brandIdx] || '').trim(),
      model: modelIdx !== -1 ? String(row[modelIdx] || '').trim() : '',
      size: String(row[sizeIdx] || '').trim(),
      quantity: qtyIdx !== -1 ? parseInt(String(row[qtyIdx])) || 0 : 0,
      price: priceIdx !== -1 ? parseFloat(String(row[priceIdx])?.replace(/[$,]/g, '')) || 0 : 0,
    })).filter(i => i.brand && i.size) as InventoryData[];
  }
}

// Use Claude to structure pre-extracted text from Vision API into customer JSON
async function structureCustomerTextWithClaude(extractedText: string): Promise<CustomerData[]> {
  console.log('[AI Import] Structuring customer text with Claude...');

  const prompt = `You are parsing OCR text from a customer list for a TIRE SHOP. Extract customer info AND their vehicle details.

OCR TEXT:
"""
${extractedText}
"""

WHAT TO LOOK FOR:
1. CUSTOMER INFO: Name, phone number, email
2. VEHICLE INFO: Year/Make/Model (e.g., "2019 Honda Accord"), tire size (e.g., "225/45R17"), license plate

SPATIAL GROUPING:
- Items near each other belong TOGETHER
- A customer's vehicle info should be on the same line or adjacent to their name
- Don't mix data from different customers

TIRE SIZE PATTERNS:
- Standard: 225/45R17, P265/70R16, LT275/65R18
- May be written as: 225-45-17, 225/45/17

VEHICLE PATTERNS:
- "2019 Honda Accord", "19 Civic", "Toyota Camry 2020"
- May include trim: "EX-L", "Sport", "Limited"

OUTPUT FORMAT - JSON array:
[{
  "name": "First Last",
  "phone": "1234567890",
  "email": "email@example.com",
  "vehicle": {
    "year": 2019,
    "make": "Honda",
    "model": "Accord",
    "trim": "EX-L",
    "tire_size": "225/45R17",
    "plate": "ABC1234",
    "vin": ""
  }
}]

RULES:
- name: Required, First Last format
- phone: digits only, "" if none
- email: lowercase, "" if none
- vehicle: Include ONLY if vehicle info found, otherwise omit the field entirely
- vehicle.year: number or null
- vehicle fields: "" if not found
- Skip entries with no clear name

Return ONLY the JSON array, no explanation.`;

  try {
    // Use streaming for long-running requests
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      thinking: {
        type: 'enabled',
        budget_tokens: 10000,
      },
      temperature: 1, // Required for extended thinking
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const response = await stream.finalMessage();
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return [];
    }

    console.log('[AI Import] Claude structured response:', textContent.text);

    // Parse JSON from response
    const text = textContent.text.trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as CustomerData[];
    }
    return JSON.parse(text) as CustomerData[];
  } catch (error) {
    console.error('[AI Import] Failed to structure customer text:', error);
    return [];
  }
}

// Use Claude Vision to extract data from images
async function analyzeImageWithClaude(
  base64Data: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
  type: ImportType
): Promise<CustomerData[] | InventoryData[]> {
  // For customer imports, try Google Cloud Vision first (much better at handwriting)
  if (type === 'customers') {
    const visionText = await extractTextWithVisionAPI(base64Data);

    if (visionText) {
      console.log('[AI Import] Using Vision API text for customer extraction');
      // Use Claude to structure the extracted text into JSON
      return await structureCustomerTextWithClaude(visionText);
    }
    // Fall back to Claude Vision if Vision API is not configured or fails
    console.log('[AI Import] Falling back to Claude Vision for customer extraction');
  }

  const prompt = type === 'customers'
    ? `This image contains a customer list for a TIRE SHOP. Extract customer info AND vehicle details.

IMPORTANT: The image may be ROTATED - look at the text orientation and read it correctly.

WHAT TO LOOK FOR:
1. CUSTOMER INFO: Name, phone number, email
2. VEHICLE INFO: Year/Make/Model, tire size, license plate

TIRE SIZE PATTERNS: 225/45R17, P265/70R16, LT275/65R18, 225-45-17
VEHICLE PATTERNS: "2019 Honda Accord", "19 Civic", "Toyota Camry"

YOUR TASK:
1. Find each customer entry
2. Extract their name and contact info
3. Look for any vehicle/tire info near their name
4. Group related info together (same line or adjacent)

OUTPUT FORMAT - JSON array:
[{
  "name": "First Last",
  "phone": "1234567890",
  "email": "",
  "vehicle": {
    "year": 2019,
    "make": "Honda",
    "model": "Accord",
    "trim": "",
    "tire_size": "225/45R17",
    "plate": "",
    "vin": ""
  }
}]

RULES:
- name: Required, First Last format
- phone: digits only, "" if none
- email: "" if none
- vehicle: Include ONLY if vehicle/tire info found, otherwise omit entirely
- vehicle.year: number or null if unknown
- Process ALL entries in the image

Return ONLY the JSON array. No explanation.`
    : `You are an expert at reading handwritten and printed text from photos. Your task is to extract tire inventory information from this image.

IMPORTANT INSTRUCTIONS:
1. The image may be ROTATED or SIDEWAYS - mentally rotate it to read properly
2. This may be HANDWRITTEN text on paper - read carefully and interpret any messy handwriting
3. Tire sizes follow patterns like: 225/45R17, 225/45/17, P265/70R16, LT275/65R18, etc.
4. Be careful with similar-looking characters in sizes: 0/O, 1/7, 3/8, 5/S

CRITICAL - BRAND ASSIGNMENT RULES:
- ONLY assign a brand if it is EXPLICITLY written next to THAT SPECIFIC tire entry
- Each tire entry should be treated INDEPENDENTLY
- Do NOT carry over or assume brands from other entries
- If no brand is written next to a tire size, use "Unknown" as the brand
- Common brands IF written: Michelin, Goodyear, Bridgestone, Continental, Firestone, BFGoodrich, Cooper, Hankook, Yokohama, Pirelli, Toyo, Falken, General, Kumho, Nexen
- Also accept any custom/unfamiliar brand names exactly as written (e.g., "Tires Roll", "TireMax", etc.)

Extract EACH tire as a SEPARATE entry with its own brand (or "Unknown" if not specified).

Return ONLY a valid JSON array with objects containing these fields:
- brand (string - use ONLY if explicitly written next to this tire, otherwise "Unknown")
- model (string, optional - tire model name if specified)
- size (string, required - tire size)
- quantity (number, default to 0 if not visible)
- price (number, default to 0 if not visible)

Example with mixed brands:
[
  {"brand": "Michelin", "size": "225/45R17", "quantity": 4, "price": 35},
  {"brand": "Tires Roll", "size": "240/55R20", "quantity": 8, "price": 35},
  {"brand": "Unknown", "size": "215/45R18", "quantity": 10, "price": 40}
]

IMPORTANT: Return ONLY the JSON array, no other text or explanation.`;

  console.log('[AI Import] Sending image to Claude for analysis...');

  // Use Sonnet with extended thinking for customers, Sonnet for inventory (faster than Opus)
  const model = 'claude-sonnet-4-20250514';

  // Use streaming for long-running requests
  const stream = anthropic.messages.stream({
    model,
    max_tokens: 16000,
    thinking: type === 'customers' ? {
      type: 'enabled',
      budget_tokens: 8000
    } : undefined,
    temperature: type === 'customers' ? 1 : undefined, // Extended thinking requires temperature 1
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Data,
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ],
  });

  const response = await stream.finalMessage();

  // Extract text from response
  const textContent = response.content.find(c => c.type === 'text');

  // Log the raw response for debugging
  if (textContent && textContent.type === 'text') {
    console.log('[AI Import] Raw Claude response:', textContent.text);
  }

  if (!textContent || textContent.type !== 'text') {
    return [];
  }

  // Parse JSON from response
  try {
    // Try to extract JSON array from the response
    const text = textContent.text.trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(text);
  } catch {
    console.error('Failed to parse Claude response:', textContent.text);
    return [];
  }
}

// Use Claude to extract data from plain text
async function analyzeTextWithClaude(
  text: string,
  type: ImportType
): Promise<CustomerData[] | InventoryData[]> {
  const prompt = type === 'customers'
    ? `Analyze this text from a TIRE SHOP and extract customer + vehicle information.

       Text to analyze:
       ${text}

       LOOK FOR:
       1. Customer info: names, phone numbers, emails
       2. Vehicle info: year/make/model, tire sizes (225/45R17), license plates, VINs

       Return JSON array with format:
       [{
         "name": "John Smith",
         "phone": "5551234567",
         "email": "john@email.com",
         "vehicle": {
           "year": 2019,
           "make": "Honda",
           "model": "Accord",
           "trim": "",
           "tire_size": "225/45R17",
           "plate": "ABC1234",
           "vin": ""
         }
       }]

       RULES:
       - name: required
       - phone: digits only, "" if none
       - email: "" if none
       - vehicle: include ONLY if vehicle info found, otherwise omit entirely
       - vehicle.year: number or null

       Return ONLY the JSON array, no explanation.`
    : `Analyze this text and extract tire inventory information. Look for tire brands, models, sizes, quantities, and prices.

       Text to analyze:
       ${text}

       Return ONLY a valid JSON array with objects containing these fields:
       - brand (string, required - tire manufacturer like Michelin, Goodyear, etc.)
       - model (string, optional - tire model name)
       - size (string, required - tire size like 225/45R17, P265/70R16, etc.)
       - quantity (number, optional - default to 0 if not visible)
       - price (number, optional - unit price, default to 0 if not visible)

       If you can't find any tire inventory data, return an empty array [].
       Example: [{"brand": "Michelin", "model": "Pilot Sport 4", "size": "225/45R17", "quantity": 4, "price": 189.99}]

       IMPORTANT: Return ONLY the JSON array, no other text or explanation.`;

  try {
    // Use streaming for long-running requests
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const response = await stream.finalMessage();
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return [];
    }

    const responseText = textContent.text.trim();
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(responseText);
  } catch (error) {
    console.error('Failed to analyze text with Claude:', error);
    return [];
  }
}

// Analyze PDF with Claude (convert to image first or extract text)
async function analyzePDFWithClaude(
  base64Data: string,
  type: ImportType
): Promise<CustomerData[] | InventoryData[]> {
  // For PDFs, we'll try to use Claude's document understanding
  // Note: Claude can process PDFs directly in some cases
  const prompt = type === 'customers'
    ? `Analyze this PDF from a TIRE SHOP and extract customer + vehicle information.

       LOOK FOR:
       1. Customer info: names, phone numbers, emails
       2. Vehicle info: year/make/model, tire sizes (225/45R17), license plates, VINs

       Return JSON array:
       [{
         "name": "John Smith",
         "phone": "5551234567",
         "email": "",
         "vehicle": {
           "year": 2019,
           "make": "Honda",
           "model": "Accord",
           "trim": "",
           "tire_size": "225/45R17",
           "plate": "",
           "vin": ""
         }
       }]

       RULES:
       - name: required
       - phone: digits only, "" if none
       - vehicle: include ONLY if vehicle info found, otherwise omit
       - vehicle.year: number or null

       Return ONLY the JSON array.`
    : `Analyze this PDF document and extract tire inventory information.

       Return ONLY a valid JSON array with objects containing these fields:
       - brand (string, required)
       - model (string, optional)
       - size (string, required)
       - quantity (number, optional, default 0)
       - price (number, optional, default 0)

       If you can't find any inventory data, return an empty array [].
       IMPORTANT: Return ONLY the JSON array, no other text.`;

  try {
    // Use streaming for long-running requests
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    });

    const response = await stream.finalMessage();
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return [];
    }

    const text = textContent.text.trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(text);
  } catch (error) {
    console.error('Failed to analyze PDF:', error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as ImportType | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!type || !['customers', 'inventory'].includes(type)) {
      return NextResponse.json({ error: 'Invalid import type' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const mimeType = file.type;

    let data: CustomerData[] | InventoryData[] = [];
    let method: 'csv' | 'excel' | 'ai' = 'csv';

    // Handle different file types
    if (fileName.endsWith('.csv') || mimeType === 'text/csv') {
      // CSV file
      const text = await file.text();
      data = parseCSV(text, type);
      method = 'csv';
    } else if (fileName.endsWith('.txt') || mimeType === 'text/plain') {
      // Text file - try CSV parsing first, fall back to AI
      const text = await file.text();
      data = parseCSV(text, type);

      // If CSV parsing found nothing, use AI to analyze the text
      if (data.length === 0 && process.env.ANTHROPIC_API_KEY) {
        const base64 = Buffer.from(text).toString('base64');
        // Send as text to Claude for analysis
        data = await analyzeTextWithClaude(text, type);
        method = 'ai';
      } else {
        method = 'csv';
      }
    } else if (
      fileName.endsWith('.xlsx') ||
      fileName.endsWith('.xls') ||
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-excel'
    ) {
      // Excel file
      const buffer = await file.arrayBuffer();
      data = parseExcel(buffer, type);
      method = 'excel';
    } else if (
      mimeType.startsWith('image/') ||
      fileName.endsWith('.jpg') ||
      fileName.endsWith('.jpeg') ||
      fileName.endsWith('.png') ||
      fileName.endsWith('.heic') ||
      fileName.endsWith('.webp')
    ) {
      // Image file - use Claude Vision
      if (!process.env.ANTHROPIC_API_KEY) {
        return NextResponse.json(
          { error: 'AI analysis not configured. Please add ANTHROPIC_API_KEY to environment.' },
          { status: 500 }
        );
      }

      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');

      // Determine media type
      let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
      if (mimeType === 'image/png' || fileName.endsWith('.png')) {
        mediaType = 'image/png';
      } else if (mimeType === 'image/webp' || fileName.endsWith('.webp')) {
        mediaType = 'image/webp';
      } else if (mimeType === 'image/gif') {
        mediaType = 'image/gif';
      }

      data = await analyzeImageWithClaude(base64, mediaType, type);
      method = 'ai';
    } else if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      // PDF file - use Claude
      if (!process.env.ANTHROPIC_API_KEY) {
        return NextResponse.json(
          { error: 'AI analysis not configured. Please add ANTHROPIC_API_KEY to environment.' },
          { status: 500 }
        );
      }

      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      data = await analyzePDFWithClaude(base64, type);
      method = 'ai';
    } else {
      return NextResponse.json(
        { error: `Unsupported file type: ${mimeType || fileName}. Supported: CSV, Excel, PDF, TXT, Images (JPG, PNG, HEIC, WebP)` },
        { status: 400 }
      );
    }

    // Normalize and clean all data before returning
    let normalizedData: CustomerData[] | InventoryData[];
    if (type === 'customers') {
      normalizedData = (data as CustomerData[]).map(normalizeCustomer);
    } else {
      normalizedData = (data as InventoryData[]).map(normalizeInventory);
    }

    return NextResponse.json({
      success: true,
      data: normalizedData,
      count: normalizedData.length,
      method,
      message: method === 'ai'
        ? `AI extracted ${normalizedData.length} ${type === 'customers' ? 'customers' : 'items'} from your file`
        : `Parsed ${normalizedData.length} ${type === 'customers' ? 'customers' : 'items'} from ${method.toUpperCase()}`,
    });
  } catch (error: unknown) {
    console.error('Import analysis error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze file';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
