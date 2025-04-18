# USDM to TDM Converter

This script converts Unified Study Data Model (USDM) JSON data into Study Data Tabulation Model (SDTM) Trial Design Model (TDM) datasets using JSONata expressions.

## Prerequisites

- [Node.js](https://nodejs.org/) (version 14 or higher recommended)
- npm (comes with Node.js)

## Installation

Install the required dependencies by running:

```
npm install jsonata
npm install json-2-csv
```

## Usage
1. Place a USDM JSON file in the project directory and name it sdw-lzzt-usdm.json (or update the file path in usdm-to-tdm.js).

1. Run the script using Node.js:

```
node usdm2tdm.js -f <filepath to USDM JSON file>
```

1. The script will process the USDM JSON file and output the converted SDTM TDM dataset to the console and as CSV.

## How It Works
- The script uses JSONata to extract and transform data from the USDM JSON file.
- It maps `arms` and `elements` to the SDTM TA domain structure.
- It maps `criteria` to the SDTM TI domain structure.
- It maps `encounters` to the SDTM TV domain structure.
- It maps `elements` to the SDTM TE domain structure.
- It maps `characteristics` and `objectives` to the SDTM TI domain structure.

## Example Output
The output will look like this:

```
[
  {
    STUDYID: 'Study_CDISC PILOT - LZZT',
    DOMAIN: 'TA',
    ARMCD: 'StudyArm_1',
    ARM: 'Placebo',
    TAETORD: 1,
    ETCD: 'EL1',
    ELEMENT: 'Screening'
  },
  ...
]
```

## Notes
I referred to the USDM v3 IG for this program. Website: [Creation of SDTM Trial Design Domains](https://wiki.cdisc.org/display/USDMIGv3/Creation+of+SDTM+Trial+Design+Domains)

The file `sdw-lzzt-usdm.json` contains the study definition for the CDISC Pilot Study in the USDM v3.6 format. It was created using the Study Definitions Workbench from D4K. Website: [Study Definitions Workbench](https://d4k-sdw.fly.dev/)

I am leaving space for post-processing to make these SDTM TDM datasets fully conformant. That part is outside the scope of this script.