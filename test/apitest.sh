#!/bin/bash
{
    echo '/*@flow*/'
    echo '/*::'
    cat ./docs/apiv1_types.ts
    echo '*/'
    cat ./test/apitest_gen0.js
} > ./test/apitest_gen.js
