pragma circom 2.0.3;

include "./commiter.circom";

component main { public [ possibleHashesHash, saltUpperBound, gridUpperBound, oldCommitment, newCommitment ] } = Move(200, 32, 123);
