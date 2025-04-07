const fs = require('fs');
const jsonata = require("jsonata");
const { json } = require('stream/consumers');
const converter  = require('json-2-csv');

// Parse command-line arguments
const args = process.argv.slice(2);
const fileIndex = args.indexOf('-f');
if (fileIndex === -1 || !args[fileIndex + 1]) {
    console.error('Usage: node usdm2tdm.js -f <file-path>');
    process.exit(1);
}
const filePath = args[fileIndex + 1];

// Read and parse the JSON file
const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

// TODO: Add branching and transition rule, i.e., TABRANCH and TATRANS
// Extract arms and elements from the study design
const sdtmTA = jsonata(`
    (
        $arms := study.versions[versionIdentifier="2"].studyDesigns[].arms[].{
            "STUDYID": $$.study.name,
            "DOMAIN": "TA",
            "ARMCD": id,
            "ARM": label
        };
        $elements := study.versions[versionIdentifier="2"].studyDesigns[].elements[]#$i.{
            "TAETORD": $i + 1,
            "ETCD": name,
            "ELEMENT": label
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
`);

sdtmTA.assign("studyVersionIdentifier", "2");

// TODO: Create Dataset-JSON
sdtmTA.evaluate(data).then(result => {
    console.log(result);

    const csv = converter.json2csv(result);

    // Write CSV to file
    fs.writeFileSync('TA.csv', csv, 'utf-8');
    console.log('Output written to TA.csv');
});

