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
    study.versions[versionIdentifier=$studyVersionId].studyDesigns[].encounters[]#$i.{
        "STUDYID": $$.study.name,
        "DOMAIN": "TV",
        "VISITNUM": $i + 1,
        "VISIT": label,
        "TVSTRL": transitionStartRule.text,
        "TVENRL": transitionEndRule.text
    }
`;

// Define extraction expressions for TE
const extractSdtmTE = `
    study.versions[versionIdentifier=$studyVersionId].studyDesigns[].elements[].{
        "STUDYID": $$.study.name,
        "DOMAIN": "TE",
        "ETCD": name,
        "ELEMENT": description,
        "TESTRL": transitionStartRule.text,
        "TEENRL": transitionEndRule.text
    }
`;

// Define extraction expressions for TS (Part 1)
// EXTTIND, ADAPT, and RANDOM are parameters required by the FDA TCG 6.0 or SDTMIG v3.3, i.e., a record must exist
// Dynamically extract specific characteristics from studyDesign namely EXTENSION, ADAPTIVE, and RANDOM
// If a characteristic is found, it’s marked with a "Y"; otherwise, it's marked as "N"
// Loops over each key (characteristic) and constructs a corresponding array of TS records
const extractSdtmTS1 = `
    $map(
        $keys(
            $ts := (
                $c := study.versions[versionIdentifier="2"].studyDesigns[].characteristics[];
                {
                    "EXTTIND": $c[decode="EXTENSION"].decode ? "Y" : "N",
                    "ADAPT": $c[decode="ADAPTIVE"].decode ? "Y" : "N",
                    "RANDOM": $c[decode="RANDOM"].decode ? "Y" : "N"
                }
            )
        ),
        function($k) {
            {
                "STUDYID":  $$.study.name,
                "DOMAIN": "TS",
                "TSSEQ": 1,
                "TSPARMCD": $k,
                "TSVAL": $lookup($ts, $k)
            }
        }
    )
`;

// Define extraction expressions for TS (Part 2)
// Extract primary and secondary objectives from studyDesigns
const extractSdtmTS2 = `
    $append(
        study.versions[versionIdentifier="2"].studyDesigns[].objectives[level.code="C85826"]#$i.{
            "STUDYID": $$.study.name,
            "DOMAIN": "TI",
            "TSSEQ": $i + 1,
            "TSPARMCD": "OBJPRIM",
            "TSVAL": text
        },
        study.versions[versionIdentifier="2"].studyDesigns[].objectives[level.code="C85827"]#$i.{
            "STUDYID": $$.study.name,
            "DOMAIN": "TI",
            "TSSEQ": $i + 1,
            "TSPARMCD": "OBJSEC",
            "TSVAL": text
        }
    )
`;

// Generate datasets
generateDataset(extractSdtmTA, "TA", data);
generateDataset(extractSdtmTI, "TI", data);
generateDataset(extractSdtmTV, "TV", data);
generateDataset(extractSdtmTE, "TE", data);
generateDataset(extractSdtmTS1, "TS1", data);
generateDataset(extractSdtmTS2, "TS2", data);