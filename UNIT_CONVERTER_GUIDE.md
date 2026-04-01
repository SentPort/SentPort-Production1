# Unit Converter Feature Guide

## Overview

A comprehensive Google-style unit conversion calculator has been integrated into your SentPort search engine. The converter automatically appears when users search for unit conversion queries and supports 14 different conversion categories.

## Supported Conversion Categories

1. **Length** - mm, cm, m, km, in, ft, yd, mi, nmi
2. **Weight & Mass** - mg, g, kg, t, oz, lb, ton
3. **Temperature** - Celsius, Fahrenheit, Kelvin
4. **Volume** - mL, L, m³, fl oz, cup, pt, qt, gal
5. **Area** - mm², cm², m², ha, km², in², ft², acre, mi²
6. **Speed** - m/s, km/h, mph, knots, ft/s
7. **Time** - ms, s, min, h, day, week, month, year
8. **Energy** - J, kJ, cal, kcal, Wh, kWh, BTU
9. **Power** - W, kW, MW, hp
10. **Pressure** - Pa, kPa, bar, atm, psi, mmHg
11. **Data Storage** - bit, B, KB, MB, GB, TB, PB
12. **Fuel Economy** - mpg, km/L, L/100km
13. **Angle** - degrees, radians, gradians
14. **Frequency** - Hz, kHz, MHz, GHz

## How to Use

### Search Query Examples

The converter automatically detects conversion requests in search queries. Here are examples of supported formats:

**Numbers with units:**
- `2mm to inches`
- `5 pounds to kilograms`
- `100 celsius to fahrenheit`
- `50 mph to kmh`

**Word-based numbers:**
- `five kilograms in pounds`
- `twenty five kilometers to miles`
- `one hundred degrees to radians`

**Natural language:**
- `convert 2 millimeters to inches`
- `how many meters in 10 feet`
- `what is 2mm in inches`

### Interactive Converter Widget

When a conversion query is detected, the converter widget appears with:

1. **Category Selector** - Dropdown to choose conversion type (Length, Weight, Temperature, etc.)
2. **From Input** - Enter value and select source unit
3. **To Input** - View result and select target unit
4. **Swap Button** - Quickly reverse conversion direction
5. **Formula Display** - Shows calculation method
6. **Copy Button** - Copy result to clipboard
7. **Recent Conversions** - Last 5 conversions for quick access

### Features

- **Bidirectional Conversion** - Change either input to recalculate
- **Real-time Updates** - Instant conversion as you type
- **Precision Management** - Appropriate decimal places for each unit type
- **History Storage** - Recent conversions saved in browser localStorage
- **Click History** - Click any history item to reload that conversion
- **Formula Explanation** - See how the conversion is calculated

## Technical Details

### File Structure

- `src/lib/unitConversion.ts` - Unit definitions and conversion logic
- `src/lib/unitConversionParser.ts` - Query parsing and detection
- `src/components/shared/UnitConverter.tsx` - React component
- `src/lib/queryAnalyzer.ts` - Integration with search query analysis

### Conversion Detection

The system detects conversions by looking for:
1. Conversion keywords: "to", "in", "convert", "equals", "how many"
2. Unit keywords from all 14 categories
3. At least two compatible units in the query

### Priority System

When a query could trigger both calculator and unit converter:
- Conversion takes precedence if "to" keyword is used with units
- Otherwise, calculator is shown for math expressions

## Examples by Category

### Length
- `2mm to inches` → 0.0787402 in
- `5 feet to meters` → 1.524 m

### Temperature
- `100 celsius to fahrenheit` → 212°F
- `32 fahrenheit to celsius` → 0°C

### Weight
- `5 pounds to kilograms` → 2.26796 kg
- `1 kilogram to ounces` → 35.274 oz

### Speed
- `60 mph to kmh` → 96.5606 km/h
- `100 kmh to mph` → 62.1371 mph

### Data Storage
- `1 gb to mb` → 1000 MB
- `500 mb to gb` → 0.5 GB

## User Experience

The converter maintains consistency with your existing Calculator component:
- Similar visual design with green color scheme (vs blue for calculator)
- Same header structure with close button
- Matching layout and spacing
- Consistent copy-to-clipboard functionality
- Similar history display format

## Performance

- **Instant detection** - Query analysis happens in milliseconds
- **Lightweight** - Pure calculation without external dependencies
- **Local storage** - History saved in browser for fast access
- **No database calls** - All conversions computed client-side
