#!/bin/bash
die() { echo "$1"; exit 1; }
git diff-index --quiet HEAD -- || die "Testing is only possible with no changes to the git repo"
node ./test/generatetypes.js --flow > ./docs/apiv1_types.ts || die "generatetypes --flow"
git diff-index --quiet HEAD -- || die "apiv1_types.ts is not up to date"
node ./test/generatetypes.js --proptypes > ./docs/apiv1_proptypes.js || die "generatetypes --proptypes"
git diff-index --quiet HEAD -- || die "apiv1_proptypes.ts is not up to date"
bash ./test/apitest.sh || die "bash ./test/apitest.sh"
git diff-index --quiet HEAD -- || die "apitest_gen.js is not up to date"
node ./test/proptypevalidate.js || die "Failed proptype check"