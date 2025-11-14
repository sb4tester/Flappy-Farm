const assert = require('assert');

const { computeTicketsFromQuantity } = require('../services/luckyDrawService');

function testCase(qty, expected) {
  const got = computeTicketsFromQuantity(qty);
  try {
    assert.deepStrictEqual(got, expected);
    console.log(`OK qty=${qty} ->`, got);
  } catch (e) {
    console.error(`FAIL qty=${qty}. expected=${JSON.stringify(expected)} got=${JSON.stringify(got)}`);
    throw e;
  }
}

// Basic cases
testCase(0, { gold: 0, silver: 0, bronze: 0 });
testCase(1, { gold: 0, silver: 0, bronze: 0 });
testCase(29, { gold: 0, silver: 0, bronze: 0 });
testCase(30, { gold: 0, silver: 0, bronze: 1 });
testCase(60, { gold: 0, silver: 0, bronze: 2 });
testCase(90, { gold: 0, silver: 0, bronze: 3 });
testCase(100, { gold: 0, silver: 1, bronze: 0 });
testCase(130, { gold: 0, silver: 1, bronze: 1 });
testCase(200, { gold: 0, silver: 2, bronze: 0 });
testCase(230, { gold: 0, silver: 2, bronze: 1 });
testCase(299, { gold: 0, silver: 2, bronze: 3 }); // 200 + 90 + 9
testCase(300, { gold: 1, silver: 0, bronze: 0 });
testCase(330, { gold: 1, silver: 0, bronze: 1 });
testCase(400, { gold: 1, silver: 1, bronze: 0 });
testCase(430, { gold: 1, silver: 1, bronze: 1 });

// From user scenarios
testCase(31, { gold: 0, silver: 0, bronze: 1 });
testCase(30000, { gold: 100, silver: 0, bronze: 0 });
testCase(30131, { gold: 100, silver: 1, bronze: 1 });

// Non-integer and negative inputs
testCase('30131', { gold: 100, silver: 1, bronze: 1 });
testCase(-50, { gold: 0, silver: 0, bronze: 0 });

console.log('All tests passed.');

