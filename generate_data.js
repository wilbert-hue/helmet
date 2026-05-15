const fs = require('fs');
const path = require('path');

// Years: 2021-2033
const years = [2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033];

// Geographies with their region grouping
const regions = {
  "North America": ["U.S.", "Canada"],
  "Europe": ["U.K.", "Germany", "Italy", "France", "Spain", "Russia", "Rest of Europe"],
  "Asia Pacific": ["China", "India", "Japan", "South Korea", "ASEAN", "Australia", "Rest of Asia Pacific"],
  "Latin America": ["Brazil", "Argentina", "Mexico", "Rest of Latin America"],
  "Middle East & Africa": ["GCC", "South Africa", "Rest of Middle East & Africa"]
};

// Segment definitions (shares sum to 1.0 within each segment type)
const segmentTypes = {
  "By Therapy Type": {
    "Active Helmets Therapy": 0.55,
    "Passive Helmets Therapy": 0.45
  },
  "By Clinical Indication": {
    "Plagiocephaly": 0.38,
    "Brachycephaly": 0.32,
    "Scaphocephaly": 0.30
  },
  "By Age Group": {
    "Infants (0–12 months)": 0.62,
    "Toddlers (12–24 months)": 0.38
  },
  "By Design": {
    "Custom-Fitted Orthoses": 0.52,
    "Standard Helmets": 0.48
  },
  "By Purchase Mode": {
    "Online": 0.28,
    "Offline": 0.72
  },
  "By End User": {
    "Hospitals": 0.26,
    "Parents / Individuals": 0.20,
    "Specialty Clinics / Orthotic Centers": 0.22,
    "Pediatric & Neurosurgery Clinics": 0.17,
    "Others (Academic and Research Institutes, etc.)": 0.15
  }
};

// Regional base values (USD Million) for 2021 - total market per region
const regionBaseValues = {
  "North America": 120,
  "Europe": 90,
  "Asia Pacific": 50,
  "Latin America": 20,
  "Middle East & Africa": 15
};

// Country share within region (must sum to ~1.0)
const countryShares = {
  "North America": { "U.S.": 0.82, "Canada": 0.18 },
  "Europe": { "U.K.": 0.18, "Germany": 0.22, "Italy": 0.12, "France": 0.16, "Spain": 0.10, "Russia": 0.08, "Rest of Europe": 0.14 },
  "Asia Pacific": { "China": 0.28, "India": 0.12, "Japan": 0.25, "South Korea": 0.12, "ASEAN": 0.10, "Australia": 0.07, "Rest of Asia Pacific": 0.06 },
  "Latin America": { "Brazil": 0.45, "Argentina": 0.15, "Mexico": 0.25, "Rest of Latin America": 0.15 },
  "Middle East & Africa": { "GCC": 0.45, "South Africa": 0.25, "Rest of Middle East & Africa": 0.30 }
};

// Growth rates (CAGR) per region
const regionGrowthRates = {
  "North America": 0.115,
  "Europe": 0.108,
  "Asia Pacific": 0.145,
  "Latin America": 0.125,
  "Middle East & Africa": 0.118
};

// Segment-specific growth multipliers (relative to regional base CAGR)
const segmentGrowthMultipliers = {
  "By Therapy Type": {
    "Active Helmets Therapy": 1.02,
    "Passive Helmets Therapy": 0.98
  },
  "By Clinical Indication": {
    "Plagiocephaly": 1.05,
    "Brachycephaly": 1.0,
    "Scaphocephaly": 0.96
  },
  "By Age Group": {
    "Infants (0–12 months)": 1.04,
    "Toddlers (12–24 months)": 0.97
  },
  "By Design": {
    "Custom-Fitted Orthoses": 1.08,
    "Standard Helmets": 0.94
  },
  "By Purchase Mode": {
    "Online": 1.12,
    "Offline": 0.96
  },
  "By End User": {
    "Hospitals": 1.0,
    "Parents / Individuals": 1.1,
    "Specialty Clinics / Orthotic Centers": 1.05,
    "Pediatric & Neurosurgery Clinics": 1.07,
    "Others (Academic and Research Institutes, etc.)": 1.02
  }
};

// Volume multiplier: units per USD Million
const volumePerMillionUSD = 480;

// Seeded pseudo-random for reproducibility
let seed = 42;
function seededRandom() {
  seed = (seed * 16807 + 0) % 2147483647;
  return (seed - 1) / 2147483646;
}

function addNoise(value, noiseLevel = 0.03) {
  return value * (1 + (seededRandom() - 0.5) * 2 * noiseLevel);
}

function roundTo1(val) {
  return Math.round(val * 10) / 10;
}

function roundToInt(val) {
  return Math.round(val);
}

function generateTimeSeries(baseValue, growthRate, roundFn) {
  const series = {};
  for (let i = 0; i < years.length; i++) {
    const year = years[i];
    const rawValue = baseValue * Math.pow(1 + growthRate, i);
    series[year] = roundFn(addNoise(rawValue));
  }
  return series;
}

function generateData(isVolume) {
  const data = {};
  const roundFn = isVolume ? roundToInt : roundTo1;
  const multiplier = isVolume ? volumePerMillionUSD : 1;

  for (const [regionName, countries] of Object.entries(regions)) {
    const regionBase = regionBaseValues[regionName] * multiplier;
    const regionGrowth = regionGrowthRates[regionName];

    data[regionName] = {};
    for (const [segType, segments] of Object.entries(segmentTypes)) {
      data[regionName][segType] = {};
      for (const [segName, share] of Object.entries(segments)) {
        const segGrowth = regionGrowth * segmentGrowthMultipliers[segType][segName];
        const segBase = regionBase * share;
        data[regionName][segType][segName] = generateTimeSeries(segBase, segGrowth, roundFn);
      }
    }

    data[regionName]["By Country"] = {};
    for (const country of countries) {
      const cShare = countryShares[regionName][country];
      const countryGrowthVariation = 1 + (seededRandom() - 0.5) * 0.06;
      const countryBase = regionBase * cShare;
      const countryGrowth = regionGrowth * countryGrowthVariation;
      data[regionName]["By Country"][country] = generateTimeSeries(countryBase, countryGrowth, roundFn);
    }

    for (const country of countries) {
      const cShare = countryShares[regionName][country];
      const countryBase = regionBase * cShare;
      const countryGrowthVariation = 1 + (seededRandom() - 0.5) * 0.04;
      const countryGrowth = regionGrowth * countryGrowthVariation;

      data[country] = {};
      for (const [segType, segments] of Object.entries(segmentTypes)) {
        data[country][segType] = {};
        for (const [segName, share] of Object.entries(segments)) {
          const segGrowth = countryGrowth * segmentGrowthMultipliers[segType][segName];
          const segBase = countryBase * share;
          const shareVariation = 1 + (seededRandom() - 0.5) * 0.1;
          data[country][segType][segName] = generateTimeSeries(segBase * shareVariation, segGrowth, roundFn);
        }
      }
    }
  }

  return data;
}

seed = 42;
const valueData = generateData(false);
seed = 7777;
const volumeData = generateData(true);

const outDir = path.join(__dirname, 'public', 'data');
fs.writeFileSync(path.join(outDir, 'value.json'), JSON.stringify(valueData, null, 2));
fs.writeFileSync(path.join(outDir, 'volume.json'), JSON.stringify(volumeData, null, 2));

const segmentationAnalysis = {
  Global: {
    "By Therapy Type": {
      "Active Helmets Therapy": {},
      "Passive Helmets Therapy": {}
    },
    "By Clinical Indication": {
      Plagiocephaly: {},
      Brachycephaly: {},
      Scaphocephaly: {}
    },
    "By Age Group": {
      "Infants (0–12 months)": {},
      "Toddlers (12–24 months)": {}
    },
    "By Design": {
      "Custom-Fitted Orthoses": {},
      "Standard Helmets": {}
    },
    "By Purchase Mode": {
      Online: {},
      Offline: {}
    },
    "By End User": {
      Hospitals: {},
      "Parents / Individuals": {},
      "Specialty Clinics / Orthotic Centers": {},
      "Pediatric & Neurosurgery Clinics": {},
      "Others (Academic and Research Institutes, etc.)": {}
    },
    "By Region": {
      "North America": { "U.S.": {}, "Canada": {} },
      Europe: {
        "U.K.": {},
        Germany: {},
        Italy: {},
        France: {},
        Spain: {},
        Russia: {},
        "Rest of Europe": {}
      },
      "Asia Pacific": {
        China: {},
        India: {},
        Japan: {},
        "South Korea": {},
        ASEAN: {},
        Australia: {},
        "Rest of Asia Pacific": {}
      },
      "Latin America": {
        Brazil: {},
        Argentina: {},
        Mexico: {},
        "Rest of Latin America": {}
      },
      "Middle East & Africa": {
        GCC: {},
        "South Africa": {},
        "Rest of Middle East & Africa": {}
      }
    }
  }
};

fs.writeFileSync(
  path.join(outDir, 'segmentation_analysis.json'),
  JSON.stringify(segmentationAnalysis, null, 2)
);

console.log('Generated value.json, volume.json, and segmentation_analysis.json');
console.log('Value geographies:', Object.keys(valueData).length);
console.log('Segment types:', Object.keys(valueData['North America']));
console.log(
  'Sample - North America, By Therapy Type:',
  JSON.stringify(valueData['North America']['By Therapy Type'], null, 2)
);
