pragma circom 2.0.3;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/gates.circom";
include "../node_modules/circomlib/circuits/mimcsponge.circom";
// include "merkle.circom";
// include "https://github.com/0xPARC/circom-secp256k1/blob/master/circuits/bigint.circom";

template InclusionChecker(blockCount, key) {
    signal input possibleHashes[blockCount];
    signal input possibleHashesHash;

    signal input blockhash;

    component blockhashIsZero = IsZero();
    blockhashIsZero.in <== blockhash;
    blockhashIsZero.out === 0;

    component hasher = MiMCSponge(blockCount, 22, 1);
    hasher.k <== key;
    for (var i = 0;i < blockCount;i++) hasher.ins[i] <== possibleHashes[i];
    hasher.outs[0] === possibleHashesHash;
    
    component isEq[blockCount];
    component prefixOR[blockCount];
    for (var i = 0;i < blockCount;i++) {
        isEq[i] = IsEqual();
        isEq[i].in[0] <== blockhash;
        isEq[i].in[1] <== possibleHashes[i];

        prefixOR[i] = OR();
        prefixOR[i].a <== i == 0 ? 0 : prefixOR[i-1].out;
        prefixOR[i].b <== isEq[i].out;
    }

    prefixOR[blockCount - 1].out === 1;
}

template Commiter(bits, blockCount, mimcKey) {
    signal input x;
    signal input y;
    signal input blockhash;
    signal input salt;
    signal input possibleHashes[blockCount];

    signal input possibleHashesHash;
    signal input saltUpperBound;
    signal input gridUpperBound;
    signal input commitment;

    // check 0 <= x <= gridUpperBound, 0 <= y <= gridUpperBound
    component xUpper = LessThan(bits);
    xUpper.in[0] <== x;
    xUpper.in[1] <== gridUpperBound;

    xUpper.out === 1;

    component yUpper = LessThan(bits);
    yUpper.in[0] <== y;
    yUpper.in[1] <== gridUpperBound;

    yUpper.out === 1;

    // check blockhash \in set, blockhash non zero and set matches
    component blockhashInclusionCheck = InclusionChecker(blockCount, mimcKey);
    for (var i = 0;i < blockCount;i++) {
        blockhashInclusionCheck.possibleHashes[i] <== possibleHashes[i];
    }
    blockhashInclusionCheck.possibleHashesHash <== possibleHashesHash;
    blockhashInclusionCheck.blockhash <== blockhash;

    // check salt less than salt upper bound
    component saltUpper = LessThan(bits);
    saltUpper.in[0] <== salt;
    saltUpper.in[1] <== saltUpperBound;
    saltUpper.out === 1;

    // check commitment
    component commiter = MiMCSponge(4, 220, 1);
    commiter.k <== mimcKey;
    commiter.ins[0] <== x;
    commiter.ins[1] <== y;
    commiter.ins[2] <== blockhash;
    commiter.ins[3] <== salt;
    commiter.outs[0] === commitment;
}

component main { public [ possibleHashesHash, saltUpperBound, gridUpperBound, commitment ] } = Commiter(200, 32, 123);
