pragma circom 2.0.3;

include "./commiter.circom";

component main { public [ myCommitment, yourCommitment ] } = Battle(200, 32, 123);
