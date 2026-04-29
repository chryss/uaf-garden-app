/*
  Convert the old registration CSV export into a Firebase seed file.

  Output:
    firebase/seed-registrations.json

  The generated file is consumed by scripts/seedFromJson.js.
*/

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, '..');
const PROJECT_ROOT = path.resolve(ROOT_DIR, '..');
const CSV_PATH = path.resolve(PROJECT_ROOT, 'assets', 'uaf_garden_registrations_April_19__2026_11_05_PM.csv');
const OUTPUT_PATH = path.resolve(ROOT_DIR, 'firebase', 'seed-registrations.json');

const parseBool = (value) => String(value || '').trim().toLowerCase() === 'true';

const parseCsv = (text) => {
  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }

      currentRow.push(currentCell);
      if (currentRow.some((cell) => cell !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length || currentRow.length) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
};

const csvToObjects = (text) => {
  const [headerRow, ...dataRows] = parseCsv(text);
  return dataRows.map((row) =>
    headerRow.reduce((acc, header, index) => {
      acc[header] = (row[index] || '').trim();
      return acc;
    }, {})
  );
};

const normalizeAffiliation = (row) => {
  const source = `${row.uaf_affiliation || ''} ${row.department_affiliation || ''}`.toLowerCase();

  if (source.includes('student')) {
    return 'Student';
  }

  if (source.includes('emerit')) {
    return 'Emeriti';
  }

  if (source.includes('faculty')) {
    return 'Faculty';
  }

  if (source.includes('staff')) {
    return 'Staff';
  }

  if (source.includes('none')) {
    return 'None';
  }

  return 'None';
};

const normalizeStudentType = (row) => {
  const source = `${row.student_status || ''}`.toLowerCase();

  if (source.includes('undergraduate')) {
    return 'Undergraduate';
  }

  if (source.includes('graduate')) {
    return 'Graduate';
  }

  return null;
};

const parsePartners = (value) => {
  const raw = String(value || '').trim();
  if (!raw) {
    return [];
  }

  const segments = raw
    .split(';')
    .map((segment) => segment.trim())
    .filter(Boolean);

  const partners = [];
  let pendingName = '';

  for (const segment of segments) {
    const emailMatch = segment.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    if (emailMatch) {
      const email = emailMatch[0];
      const name = segment.replace(email, '').replace(/[,()]/g, ' ').trim() || pendingName;
      partners.push({
        name: name || '',
        email
      });
      pendingName = '';
      continue;
    }

    if (pendingName) {
      partners.push({
        name: pendingName,
        email: ''
      });
    }

    pendingName = segment;
  }

  if (pendingName) {
    partners.push({
      name: pendingName,
      email: ''
    });
  }

  return partners.filter((partner) => partner.name || partner.email);
};

const formatPlotId = (value) => `plot-${String(value).trim().padStart(3, '0')}`;

const makeGardenerId = (index, plotId, email) => {
  const safeEmail = String(email || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `gardener-${String(index + 1).padStart(3, '0')}-${plotId}${safeEmail ? `-${safeEmail}` : ''}`;
};

if (!fs.existsSync(CSV_PATH)) {
  throw new Error(`CSV file not found: ${CSV_PATH}`);
}

const rows = csvToObjects(fs.readFileSync(CSV_PATH, 'utf8'));
const gardeners = {};
const plotUpdates = {};

rows.forEach((row, index) => {
  if (!row.number) {
    return;
  }

  const plotId = formatPlotId(row.number);
  const firstName = row.firstname || '';
  const lastName = row.lastname || '';
  const email = row.email || '';
  const affiliation = normalizeAffiliation(row);
  const studentType = affiliation === 'Student' ? normalizeStudentType(row) : null;
  const partners = parsePartners(row.partners);
  const createdAt = row.timestamp ? new Date(Number(row.timestamp)).toISOString() : new Date().toISOString();
  const paymentVerified = parseBool(row.validated) && !parseBool(row.needs_payment);
  const gardenerId = makeGardenerId(index, plotId, email);

  gardeners[gardenerId] = {
    firstName,
    lastName,
    email,
    affiliation,
    studentType,
    plotId,
    plots: [plotId],
    partners,
    agreeRules: true,
    agreeWaiver: true,
    paymentVerified,
    createdAt,
    source: 'legacy-csv'
  };

  plotUpdates[plotId] = {
    registeredGardenerId: gardenerId,
    status: paymentVerified ? 'verified' : 'reserved',
    paymentVerified
  };
});

fs.writeFileSync(
  OUTPUT_PATH,
  JSON.stringify(
    {
      gardeners,
      plots: plotUpdates
    },
    null,
    2
  ) + '\n'
);

console.log(`Wrote ${Object.keys(gardeners).length} gardeners and ${Object.keys(plotUpdates).length} plot updates to ${OUTPUT_PATH}`);
