const CheckPropTypes = require('check-prop-types');

const ApiTest = require('./apitest_gen.js');
const PropTypeData = require('../docs/apiv1_proptypes.js');

let failed = false;
for (const k in ApiTest) {
    const name = k.replace(/_sample$/, '');
    const ret = CheckPropTypes({ x: PropTypeData[name] }, { x: ApiTest[k] }, 'prop', name);
    if (ret) {
        failed = true;
        console.error(ret);
    }
}
process.exit(failed);