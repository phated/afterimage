pragma circom 2.0.3;

include "./commiter.circom";

component main { public [ possibleHashesHash, saltUpperBound, gridUpperBound, commitment ] } = Commiter(200, 32, 123);