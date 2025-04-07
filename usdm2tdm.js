const fs = require('fs');
const jsonata = require("jsonata");
const converter = require('json-2-csv');

// Parse command-line arguments
const args = process.argv.slice(2);
const fileIndex = args.indexOf('-f');
if (fileIndex === -1 || !args[fileIndex + 1]) {
    console.error('Usage: node usdm2tdm.js -f <filepath to USDM JSON file>');
    process.exit(1);
}
const filePath = args[fileIndex + 1];

// Read and parse the JSON file
const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

/**
 * Function to evaluate a JSONata expression and generate a CSV file
 * @param {string} expression - The JSONata expression
 * @param {string} datasetName - The name of the dataset (used for the output file)
 * @param {object} inputUsdm - The input USDM JSON data
 */
async function generateDataset(expression, datasetName, inputUsdm) {
    try {
        const jsonataExpr = jsonata(expression);
        jsonataExpr.assign("studyVersionId", "2"); // Assign studyVersionId dynamically if needed
        const result = await jsonataExpr.evaluate(inputUsdm);

        console.log(result);

        const csv = await converter.json2csv(result);

        // Write CSV to file
        const outputFileName = `${datasetName}.csv`;
        fs.writeFileSync(outputFileName, csv, 'utf-8');
        console.log(`Output written to ${outputFileName}`);
    } catch (error) {
        console.error(`Error generating dataset for ${datasetName}:`, error);
    }
}

// According to USDM v3 IG, STUDYID should be study.versions[].studyIdentifiers.text
// where study.versions[].studyIdentifiers.scopeId = study.versions[].organizations[type.code="C70793"].id
// This is not unique enough, so we use the study name instead

// TODO: Add branching and transition rule, i.e., TABRANCH and TATRANS
// Define extraction expressions for TA
const extractSdtmTA = `
    (
        $arms := study.versions[versionIdentifier=$studyVersionId].studyDesigns[].arms[].{
            "STUDYID": $$.study.name,
            "DOMAIN": "TA",
            "ARMCD": id,
            "ARM": label
        };
        $elements := study.versions[versionIdentifier=$studyVersionId].studyDesigns[].elements[]#$i.{
            "TAETORD": $i + 1,
            "ETCD": name,
            "ELEMENT": description
        };
        $arms@$a.(
            $elements@$b.{
            "STUDYID": $a.STUDYID,
            "DOMAIN": $a.DOMAIN,
            "ARMCD": $a.ARMCD,
            "ARM": $a.ARM,
            "TAETORD": $b.TAETORD,
            "ETCD": $b.ETCD,
            "ELEMENT": $b.ELEMENT
            }
        )
    )
`;

// Define extraction expressions for TI
const extractSdtmTI = `
    study.versions[versionIdentifier=$studyVersionId].criteria[].{
        "STUDYID": $$.study.name,
        "DOMAIN": "TI",
        "IETESTCD": name,
        "IETEST": label,
        "IECAT": category.decode
    }
`;

// TODO: Make use of encounters[].nextId for proper ordering of visits
// Define extraction expressions for TV
const extractSdtmTV = `
    study.versions[versionIdentifier="2"].studyDesigns[].encounters[]#$i.{
        "STUDYID": $$.study.name,
        "DOMAIN": "TV",
        "VISITNUM": $i + 1,
        "VISIT": label,
        "TVSTRL": transitionStartRule.text,
        "TVENRL": transitionEndRule.text
    }
`;

const extractSdtmTE = `
    study.versions[versionIdentifier="2"].studyDesigns[].elements[].{
        "STUDYID": $$.study.name,
        "DOMAIN": "TE",
        "ETCD": name,
        "ELEMENT": description,
        "TESTRL": transitionStartRule.text,
        "TEENRL": transitionEndRule.text
    }
`;

// Generate datasets
generateDataset(extractSdtmTA, "TA", data);
generateDataset(extractSdtmTI, "TI", data);
generateDataset(extractSdtmTV, "TV", data);
generateDataset(extractSdtmTE, "TE", data);