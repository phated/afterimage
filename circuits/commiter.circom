pragma circom 2.0.3;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/gates.circom";
include "../node_modules/circomlib/circuits/mimcsponge.circom";

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

template dist() {
    signal input old;
    signal input new;

    // either both are eq, or old-new = 1 or new-old = 1
    component isOne;
    component isGood;
    component iseq[3];
    iseq[0] = IsEqual();
    iseq[0].in[0] <== old;
    iseq[0].in[1] <== new;
    iseq[1] = IsEqual();
    iseq[1].in[0] <== old + 1;
    iseq[1].in[1] <== new;
    iseq[2] = IsEqual();
    iseq[2].in[0] <== old;
    iseq[2].in[1] <== new + 1;
    isOne = OR();
    isOne.a <== iseq[1].out;
    isOne.b <== iseq[2].out;
    isGood = OR();
    isGood.a <== isOne.out;
    isGood.b <== iseq[0].out;
    isGood.out === 1;
}

template Move(bits, blockCount, mimcKey) {
    signal input oldX;
    signal input oldY;
    signal input oldBlockhash;
    signal input oldSalt;

    signal input newX;
    signal input newY;
    signal input newBlockhash;
    signal input newSalt;

    signal input possibleHashes[blockCount];
    signal input possibleHashesHash;
    signal input saltUpperBound;
    signal input gridUpperBound;
    signal input oldCommitment;
    signal input newCommitment;

    // check old commitment lines up
    component oldCommiter = MiMCSponge(4, 220, 1);
    oldCommiter.k <== mimcKey;
    oldCommiter.ins[0] <== oldX;
    oldCommiter.ins[1] <== oldY;
    oldCommiter.ins[2] <== oldBlockhash;
    oldCommiter.ins[3] <== oldSalt;
    oldCommiter.outs[0] === oldCommitment;

    // check new commitment is valid
    component newCommiter = Commiter(bits, blockCount, mimcKey);
    newCommiter.x <== newX;
    newCommiter.y <== newY;
    newCommiter.blockhash <== newBlockhash;
    newCommiter.salt <== newSalt;
    for (var i = 0;i < blockCount;i++) newCommiter.possibleHashes[i] <== possibleHashes[i];
    newCommiter.possibleHashesHash <== possibleHashesHash;
    newCommiter.saltUpperBound <== saltUpperBound;
    newCommiter.gridUpperBound <== gridUpperBound;
    newCommiter.commitment <== newCommitment;

    // check new commitment is close enough
    component isXClose = dist();
    isXClose.old <== oldX;
    isXClose.new <== newX;
    component isYClose = dist();
    isYClose.old <== oldY;
    isYClose.new <== newY;
}

template Battle(bits, blockCount, mimcKey) {
    signal input myX;
    signal input myY;
    signal input myBlockhash;
    signal input mySalt;

    signal input yourX;
    signal input yourY;
    signal input yourBlockhash;
    signal input yourSalt;

    signal input myCommitment;
    signal input yourCommitment;

    // check my commitment lines up
    component myCommiter = MiMCSponge(4, 220, 1);
    myCommiter.k <== mimcKey;
    myCommiter.ins[0] <== myX;
    myCommiter.ins[1] <== myY;
    myCommiter.ins[2] <== myBlockhash;
    myCommiter.ins[3] <== mySalt;
    myCommiter.outs[0] === myCommitment;

    // check your commitment lines up
    component yourCommiter = MiMCSponge(4, 220, 1);
    yourCommiter.k <== mimcKey;
    yourCommiter.ins[0] <== yourX;
    yourCommiter.ins[1] <== yourY;
    yourCommiter.ins[2] <== yourBlockhash;
    yourCommiter.ins[3] <== yourSalt;
    yourCommiter.outs[0] === yourCommitment;

    // check dist is close enough
    component isXClose = dist();
    isXClose.old <== myX;
    isXClose.new <== yourX;
    component isYClose = dist();
    isYClose.old <== myY;
    isYClose.new <== yourY;
}
