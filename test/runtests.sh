#!/bin/bash
die() { echo "$1"; exit 1; }
assertclean() { test "$(git diff | wc -l)" = 0 || die "$1"; }
assertclean "Testing is only possible with no changes to the git repo"
node ./test/generatetypes.js --flow > ./docs/apiv1_types.ts || die "generatetypes --flow"
assertclean "apiv1_types.ts is not up to date"
node ./test/generatetypes.js --proptypes > ./docs/apiv1_proptypes.js || die "generatetypes --proptypes"
assertclean "apiv1_proptypes.ts is not up to date"
bash ./test/apitest.sh || die "bash ./test/apitest.sh"
assertclean "apitest_gen.js is not up to date"
node ./test/proptypevalidate.js || die "Failed proptype check"